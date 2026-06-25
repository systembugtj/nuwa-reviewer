import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { query } from "@anthropic-ai/claude-agent-sdk";
import { NUWA_PERSONA_DIR } from "../constants.js";
import type { DiffResult } from "../git/diff.js";
import type { PersonaReviewOutput, ReviewFinding, ReviewRunResult } from "../types.js";
import { readNuwaConfig } from "../persona/deploy.js";
import { readNuwaGlobalSettings } from "../settings/global.js";
import {
  resolveReviewSettings,
  type ResolvedReviewSettings,
  type ReviewSettingsOverrides,
} from "./config.js";
import { buildReviewPrompt } from "./prompt.js";
import {
  extractSummary,
  parseFindingsFromMarkdown,
  parseStructuredReview,
} from "./parse.js";
import {
  compareSeverityCounts,
  countFindingsBySeverity,
  formatReviewTrend,
  formatSeverityCount,
} from "./severity.js";
import {
  collectQueryText,
  type QueryResultMeta,
  type QueryStatusEvent,
} from "./sdk-messages.js";
import {
  loadPreviousReview,
  saveReviewHistory,
  type ReviewHistoryRecord,
} from "./trace.js";

export interface ReviewOptions {
  projectRoot: string;
  diffResult: DiffResult;
  /** Subset of persona ids; defaults to all in config */
  personas?: string[];
  model?: string;
  maxTurns?: number;
  onPersonaProgress?: (event: PersonaReviewProgress) => void;
}

export type PersonaReviewProgress =
  | {
      phase: "start";
      personaId: string;
      index: number;
      total: number;
    }
  | {
      phase: "sdk";
      personaId: string;
      index: number;
      total: number;
      status: QueryStatusEvent;
    }
  | {
      phase: "complete";
      personaId: string;
      index: number;
      total: number;
      findingCount: number;
      charCount: number;
      rounds: number;
      severitySummary: string;
      trendSummary: string;
      verdict?: string;
      meta?: QueryResultMeta;
      errors: string[];
    }
  | {
      phase: "failed";
      personaId: string;
      index: number;
      total: number;
      message: string;
    };

const DEFAULT_REVIEW_TOOLS = ["Read", "Grep", "Glob"] as const;

/** Normalize unknown errors to a short user-facing message (no stack) */
export function formatReviewError(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}

/** Build a degraded persona result when review cannot complete */
export function createFailedPersonaOutput(
  personaId: string,
  error: unknown,
): PersonaReviewOutput {
  const message = formatReviewError(error);
  const markdown = [
    "## Summary",
    `Review did not complete for persona **${personaId}**.`,
    "",
    "## Findings",
    `- **[high]** Review incomplete — ${personaId}`,
    `  ${message}`,
    "",
    "## Verdict",
    "request-changes",
  ].join("\n");

  const findings: ReviewFinding[] = [
    {
      personaId,
      severity: "high",
      title: "Review incomplete",
      description: message,
      suggestion: "Re-run `nuwa review` or increase `review.maxTurns` in `.nuwa/config.json`.",
    },
  ];

  return {
    personaId,
    markdown,
    findings,
    structured: {
      rounds: [],
      severity: countFindingsBySeverity(findings),
      verdict: "request-changes",
    },
    errors: [message],
  };
}

/** Run Claude Agent SDK review for one persona */
export async function reviewWithPersona(
  projectRoot: string,
  personaId: string,
  diffResult: DiffResult,
  settings: ResolvedReviewSettings,
  onSdkStatus?: (event: QueryStatusEvent) => void,
  previousReview?: ReviewHistoryRecord | null,
): Promise<PersonaReviewOutput> {
  const personaPath = join(projectRoot, NUWA_PERSONA_DIR, `${personaId}.md`);
  const personaContent = await readFile(personaPath, "utf8");
  const prompt = buildReviewPrompt(personaId, personaContent, diffResult, {
    previousReview,
    maxDiffChars: settings.maxDiffChars,
  });

  const collected = await collectQueryText(
    query({
      prompt,
      options: {
        cwd: projectRoot,
        allowedTools: [...DEFAULT_REVIEW_TOOLS],
        permissionMode: "bypassPermissions",
        allowDangerouslySkipPermissions: true,
        model: settings.model,
        maxTurns: settings.maxTurns,
        env: {
          ...process.env,
          CLAUDE_AGENT_SDK_CLIENT_APP: "nuwa-reviewer/0.1.0",
        },
      },
    }),
    { onStatus: onSdkStatus },
  );

  if (!collected.text.trim()) {
    const detail = [
      ...collected.errors,
      ...collected.permissionDenials.map((d) => `denied: ${d}`),
    ].join("; ");
    throw new Error(
      detail
        ? `Empty review from persona "${personaId}": ${detail}`
        : `Empty review from persona "${personaId}" (no SDK text returned)`,
    );
  }

  const findings = parseFindingsFromMarkdown(personaId, collected.text);
  const structured = parseStructuredReview(
    personaId,
    collected.text,
    findings,
    previousReview,
  );

  return {
    personaId,
    markdown: collected.text,
    findings,
    structured,
    trace: collected.trace,
    meta: collected.meta,
    errors: collected.errors.length > 0 ? collected.errors : undefined,
  };
}

function emitPersonaComplete(
  onProgress: ReviewOptions["onPersonaProgress"],
  output: PersonaReviewOutput,
  index: number,
  total: number,
): void {
  const structured = output.structured;
  onProgress?.({
    phase: "complete",
    personaId: output.personaId,
    index,
    total,
    findingCount: output.findings.length,
    charCount: output.markdown.length,
    rounds: structured?.rounds.length ?? 0,
    severitySummary: structured
      ? formatSeverityCount(structured.severity)
      : `${output.findings.length} findings`,
    trendSummary: structured?.trend
      ? formatReviewTrend(structured.trend)
      : "first review",
    verdict: structured?.verdict,
    meta: output.meta,
    errors: output.errors ?? [],
  });
}

/** Run review across deployed personas */
export async function runReview(options: ReviewOptions): Promise<ReviewRunResult> {
  const config = await readNuwaConfig(options.projectRoot);
  if (!config) {
    throw new Error("Project not initialized. Run `nuwa init` first.");
  }

  const settingsOverrides: ReviewSettingsOverrides = {
    model: options.model,
    maxTurns: options.maxTurns,
  };
  const globalSettings = await readNuwaGlobalSettings();
  const settings = resolveReviewSettings(
    config,
    settingsOverrides,
    globalSettings,
  );

  const previousReview = await loadPreviousReview(options.projectRoot);
  const personaIds = options.personas ?? config.personas;
  const outputs: PersonaReviewOutput[] = [];
  const total = personaIds.length;
  const runErrors: string[] = [];

  for (let index = 0; index < personaIds.length; index++) {
    const personaId = personaIds[index]!;
    const position = index + 1;

    options.onPersonaProgress?.({
      phase: "start",
      personaId,
      index: position,
      total,
    });

    try {
      const output = await reviewWithPersona(
        options.projectRoot,
        personaId,
        options.diffResult,
        settings,
        (status) => {
          options.onPersonaProgress?.({
            phase: "sdk",
            personaId,
            index: position,
            total,
            status,
          });
        },
        previousReview,
      );
      outputs.push(output);
      emitPersonaComplete(options.onPersonaProgress, output, position, total);
    } catch (error) {
      const message = formatReviewError(error);
      runErrors.push(`${personaId}: ${message}`);

      if (!settings.continueOnError) {
        throw new Error(message);
      }

      const failed = createFailedPersonaOutput(personaId, error);
      outputs.push(failed);

      options.onPersonaProgress?.({
        phase: "failed",
        personaId,
        index: position,
        total,
        message,
      });
      emitPersonaComplete(options.onPersonaProgress, failed, position, total);
    }
  }

  const findings = outputs.flatMap((o) => o.findings);
  const aggregateSeverity = countFindingsBySeverity(findings);
  const trend = compareSeverityCounts(
    previousReview?.aggregate,
    aggregateSeverity,
  );

  const personaSeverity: Record<string, ReturnType<typeof countFindingsBySeverity>> =
    {};
  for (const output of outputs) {
    personaSeverity[output.personaId] =
      output.structured?.severity ?? countFindingsBySeverity(output.findings);
  }

  const historyRecord: ReviewHistoryRecord = {
    reviewedAt: new Date().toISOString(),
    scope: options.diffResult.scope,
    target: options.diffResult.target,
    personas: personaSeverity,
    aggregate: aggregateSeverity,
  };

  const { latestPath } = await saveReviewHistory(
    options.projectRoot,
    historyRecord,
  );

  const summaryParts = outputs.map((o) => {
    const structured = o.structured;
    const trendLine = structured?.trend
      ? formatReviewTrend(structured.trend)
      : "";
    const errorLine =
      o.errors && o.errors.length > 0 ? `Errors: ${o.errors.join("; ")}` : "";
    return [
      `### ${o.personaId}`,
      extractSummary(o.markdown),
      trendLine ? `Trend: ${trendLine}` : "",
      structured?.verdict ? `Verdict: ${structured.verdict}` : "",
      errorLine,
    ]
      .filter(Boolean)
      .join("\n");
  });

  if (runErrors.length > 0) {
    summaryParts.push(
      "### Review errors",
      runErrors.map((e) => `- ${e}`).join("\n"),
    );
  }

  return {
    scope: options.diffResult.scope,
    target: options.diffResult.target,
    personas: personaIds,
    findings,
    summary: summaryParts.join("\n\n"),
    reviewedAt: historyRecord.reviewedAt,
    rawReviews: outputs,
    aggregateSeverity,
    trend,
    historyPath: latestPath,
  };
}
