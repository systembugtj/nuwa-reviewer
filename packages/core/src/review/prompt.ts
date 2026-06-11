import { DEFAULT_REVIEW_MAX_DIFF_CHARS } from "../constants.js";
import type { DiffResult } from "../git/diff.js";
import { formatPreviousReviewContext, type ReviewHistoryRecord } from "./trace.js";

/** Truncate diff to stay within model context limits */
export function truncateDiff(
  diff: string,
  maxChars: number = DEFAULT_REVIEW_MAX_DIFF_CHARS,
): string {
  if (diff.length <= maxChars) {
    return diff;
  }
  return `${diff.slice(0, maxChars)}\n\n... [diff truncated] ...`;
}

export interface BuildReviewPromptOptions {
  previousReview?: ReviewHistoryRecord | null;
  maxDiffChars?: number;
}

/** Build review prompt for a persona */
export function buildReviewPrompt(
  personaId: string,
  personaContent: string,
  diffResult: DiffResult,
  options: BuildReviewPromptOptions = {},
): string {
  const diff = truncateDiff(
    diffResult.diff,
    options.maxDiffChars ?? DEFAULT_REVIEW_MAX_DIFF_CHARS,
  );
  const previousContext = formatPreviousReviewContext(
    options.previousReview ?? null,
    personaId,
  );

  return [
    `You are conducting a review as persona "${personaId}".`,
    "Adopt the philosophy, standards, and tone from the persona document below.",
    "",
    "--- PERSONA ---",
    personaContent,
    "--- END PERSONA ---",
    "",
    `Review scope: ${diffResult.scope} (${diffResult.target})`,
    `Changed files: ${diffResult.files.join(", ") || "(none)"}`,
    previousContext,
    "",
    "IMPORTANT: The full diff is below — review it directly first.",
    "Use Read/Grep/Glob only when the diff lacks context (aim for ≤3 tool calls).",
    "Deliver the complete markdown report in your final response before running out of turns.",
    "",
    "Output a markdown report with these sections IN ORDER:",
    "",
    "1. ## Summary — 2-4 sentences on overall quality",
    "",
    "2. ## Review Rounds",
    "   Log EVERY pass while reviewing (each tool use, file read, grep, reasoning step).",
    "   Use one ### Round N block per pass:",
    "   ### Round 1",
    "   - **Action:** what you did",
    "   - **Observation:** what you learned",
    "   - **Findings so far:** critical:N, high:N, medium:N, low:N, info:N",
    "",
    "3. ## Severity Scorecard",
    "   Markdown table with exact counts:",
    "   | Severity | Count |",
    "   | critical | 0 |",
    "   | high | 0 |",
    "   | medium | 0 |",
    "   | low | 0 |",
    "   | info | 0 |",
    "",
    "4. ## Trend",
    "   Compare against PREVIOUS REVIEW BASELINE if provided.",
    "   State IMPROVED, UNCHANGED, or REGRESSED with per-severity deltas.",
    "   Explain whether the review is getting better (fewer critical/high issues).",
    "   If no baseline, write: First review — no baseline.",
    "",
    "5. ## Findings",
    "   Bullet list; each finding MUST use:",
    "   - **[severity]** title — file:line (if known)",
    "   - Description and concrete fix suggestion",
    "   Severity: critical | high | medium | low | info",
    "",
    "6. ## Verdict",
    "   One line: approve | request-changes | block",
    "",
    "If there is no diff or no meaningful changes, say so in Summary and use zero counts.",
    "",
    "--- DIFF ---",
    diff || "(empty diff)",
    "--- END DIFF ---",
  ].join("\n");
}
