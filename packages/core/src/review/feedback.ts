import { writeFile } from "node:fs/promises";
import { join } from "node:path";
import { FEEDBACK_FILE } from "../constants.js";
import type {
  PersonaReviewOutput,
  ReviewFinding,
  ReviewResult,
  ReviewRunResult,
} from "../types.js";
import { formatReviewTrend, formatSeverityCount } from "./severity.js";
import {
  formatReviewRounds,
  formatSdkTrace,
  formatTrendSection,
} from "./trace.js";

const SEVERITY_ORDER: Record<ReviewFinding["severity"], number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
  info: 4,
};

function sortFindings(findings: ReviewFinding[]): ReviewFinding[] {
  return [...findings].sort(
    (a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity],
  );
}

function formatFinding(f: ReviewFinding, index: number): string {
  const loc = f.file
    ? f.line
      ? `\`${f.file}:${f.line}\``
      : `\`${f.file}\``
    : "";
  return [
    `### ${index + 1}. [${f.severity}] ${f.title}`,
    loc ? `**Location:** ${loc}` : "",
    f.personaId ? `**Reviewer:** ${f.personaId}` : "",
    "",
    f.description ? f.description : "",
    f.suggestion ? `\n**Suggestion:** ${f.suggestion}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

export interface WriteFeedbackOptions {
  projectRoot: string;
  result: ReviewResult | ReviewRunResult;
  rawReviews?: PersonaReviewOutput[];
}

/** Write FEEDBACK.md to project root */
export async function writeFeedbackFile(
  options: WriteFeedbackOptions,
): Promise<string> {
  const { projectRoot, result, rawReviews = [] } = options;
  const path = join(projectRoot, FEEDBACK_FILE);
  const sorted = sortFindings(result.findings);
  const runResult = result as ReviewRunResult;

  const sections = [
    "# Nuwa Review Feedback",
    "",
    `> Generated at ${result.reviewedAt}`,
    `> Scope: **${result.scope}** (\`${result.target}\`)`,
    `> Personas: ${result.personas.map((p) => `\`${p}\``).join(", ")}`,
  ];

  if (runResult.historyPath) {
    sections.push(`> History: \`${runResult.historyPath}\``);
  }

  sections.push("");

  if (runResult.aggregateSeverity) {
    sections.push(
      "## Severity Scorecard (aggregate)",
      "",
      `| Severity | Count |`,
      `| critical | ${runResult.aggregateSeverity.critical} |`,
      `| high | ${runResult.aggregateSeverity.high} |`,
      `| medium | ${runResult.aggregateSeverity.medium} |`,
      `| low | ${runResult.aggregateSeverity.low} |`,
      `| info | ${runResult.aggregateSeverity.info} |`,
      "",
      `**Total:** ${runResult.aggregateSeverity.total}`,
      "",
    );
  }

  if (runResult.trend) {
    sections.push(
      "## Trend vs Previous Review",
      "",
      formatTrendSection(runResult.trend),
      "",
      formatReviewTrend(runResult.trend),
      "",
    );
  }

  sections.push("## Executive Summary", "", result.summary || "_No summary provided._", "");

  if (sorted.length > 0) {
    sections.push("## Action Items", "");
    sorted.forEach((f, i) => {
      sections.push(formatFinding(f, i), "");
    });
  } else {
    sections.push("## Action Items", "", "_No structured findings parsed._", "");
  }

  if (rawReviews.length > 0) {
    sections.push("## Review Trace", "");
    for (const review of rawReviews) {
      const structured = review.structured;
      sections.push(`### ${review.personaId}`, "");

      if (structured) {
        sections.push(
          `**Verdict:** ${structured.verdict ?? "—"}`,
          `**Severity:** ${formatSeverityCount(structured.severity)}`,
          "",
        );
        if (structured.trend) {
          sections.push(formatTrendSection(structured.trend), "");
        }
        if (structured.trendNarrative) {
          sections.push(structured.trendNarrative, "");
        }
        sections.push("#### Review Rounds", "", formatReviewRounds(structured.rounds), "");
      }

      if (review.trace && review.trace.length > 0) {
        sections.push("#### SDK Event Log", "", formatSdkTrace(review.trace), "");
      }
    }

    sections.push("## Full Persona Reports", "");
    for (const review of rawReviews) {
      sections.push(`### ${review.personaId}`, "", review.markdown, "");
    }
  }

  sections.push(
    "---",
    "",
    "## Next Steps",
    "",
    "1. Open this file in Cursor or Claude Code",
    "2. Invoke **`nuwa-feedback`** (see `.nuwa/skills/nuwa-feedback/` and tool-specific copies)",
    "3. Re-run `nuwa review` after fixes — Trend section shows if severity counts improved",
    "",
  );

  await writeFile(path, sections.join("\n"), "utf8");
  return path;
}

export {
  buildNuwaFeedbackAgentsMarkdown,
  buildNuwaFeedbackBody,
  buildNuwaFeedbackContentForTarget,
  buildNuwaFeedbackCopilotMarkdown,
  buildNuwaFeedbackRulesMarkdown,
  buildNuwaFeedbackSkillMarkdown,
  formatNuwaFeedbackSkillTargets,
  writeNuwaFeedbackSkill,
  writeNuwaFeedbackSkills,
  type NuwaFeedbackSkillPaths,
} from "./feedback-skill.js";
