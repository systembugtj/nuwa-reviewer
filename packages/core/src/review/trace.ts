import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { NUWA_REVIEW_HISTORY_DIR, NUWA_REVIEW_LATEST_FILE } from "../constants.js";
import type { ReviewScope } from "../types.js";
import {
  formatSeverityCount,
  type ReviewTrend,
  type SeverityCount,
} from "./severity.js";

/** One SDK stream event recorded for audit */
export interface ReviewSdkTraceEvent {
  at: string;
  kind: string;
  message: string;
}

/** One agent review round from structured markdown */
export interface ReviewRoundLog {
  round: number;
  action: string;
  observation?: string;
  findingsTally?: string;
}

/** Persisted review snapshot for trend comparison */
export interface ReviewHistoryRecord {
  reviewedAt: string;
  scope: ReviewScope;
  target: string;
  personas: Record<string, SeverityCount>;
  aggregate: SeverityCount;
}

/** Resolve `.nuwa/reviews` directory */
export function getReviewHistoryDir(projectRoot: string): string {
  return join(projectRoot, NUWA_REVIEW_HISTORY_DIR);
}

/** Resolve `.nuwa/reviews/latest.json` */
export function getReviewLatestPath(projectRoot: string): string {
  return join(projectRoot, NUWA_REVIEW_LATEST_FILE);
}

/** Load previous review baseline if present */
export async function loadPreviousReview(
  projectRoot: string,
): Promise<ReviewHistoryRecord | null> {
  try {
    const raw = await readFile(getReviewLatestPath(projectRoot), "utf8");
    return JSON.parse(raw) as ReviewHistoryRecord;
  } catch {
    return null;
  }
}

/** Persist review snapshot and archive a timestamped copy */
export async function saveReviewHistory(
  projectRoot: string,
  record: ReviewHistoryRecord,
): Promise<{ latestPath: string; archivePath: string }> {
  const dir = getReviewHistoryDir(projectRoot);
  await mkdir(dir, { recursive: true });

  const latestPath = getReviewLatestPath(projectRoot);
  const stamp = record.reviewedAt.replace(/[:.]/g, "-");
  const archivePath = join(dir, `${stamp}.json`);
  const payload = JSON.stringify(record, null, 2);

  await writeFile(latestPath, payload, "utf8");
  await writeFile(archivePath, payload, "utf8");

  return { latestPath, archivePath };
}

/** Build prompt appendix describing the previous review baseline */
export function formatPreviousReviewContext(
  previous: ReviewHistoryRecord | null,
  personaId?: string,
): string {
  if (!previous) {
    return "";
  }

  const personaCounts = personaId ? previous.personas[personaId] : undefined;
  const baseline = personaCounts ?? previous.aggregate;

  return [
    "",
    "--- PREVIOUS REVIEW BASELINE ---",
    `Reviewed at: ${previous.reviewedAt}`,
    `Scope: ${previous.scope} (${previous.target})`,
    `Severity scorecard: ${formatSeverityCount(baseline)}`,
    "Compare your Severity Scorecard and Trend section against this baseline.",
    "IMPROVED means fewer critical/high issues (weighted), not just fewer info items.",
    "--- END PREVIOUS REVIEW BASELINE ---",
  ].join("\n");
}

/** Format SDK trace for FEEDBACK.md appendix */
export function formatSdkTrace(events: ReviewSdkTraceEvent[]): string {
  if (events.length === 0) {
    return "_No SDK events recorded._";
  }
  return events
    .map((e) => `- \`${e.at.slice(11, 19)}\` **${e.kind}** — ${e.message}`)
    .join("\n");
}

/** Format round logs for FEEDBACK.md */
export function formatReviewRounds(rounds: ReviewRoundLog[]): string {
  if (rounds.length === 0) {
    return "_No review rounds logged._";
  }
  return rounds
    .map((r) => {
      const lines = [`#### Round ${r.round}`, `- **Action:** ${r.action}`];
      if (r.observation) {
        lines.push(`- **Observation:** ${r.observation}`);
      }
      if (r.findingsTally) {
        lines.push(`- **Findings so far:** ${r.findingsTally}`);
      }
      return lines.join("\n");
    })
    .join("\n\n");
}

/** Format trend block for FEEDBACK.md */
export function formatTrendSection(trend: ReviewTrend): string {
  if (trend.direction === "first") {
    return "**First review** — no prior baseline to compare.";
  }

  const prev = trend.previous
    ? formatSeverityCount(trend.previous)
    : "unknown";
  const curr = formatSeverityCount(trend.current);
  const label =
    trend.direction === "improved"
      ? "IMPROVED"
      : trend.direction === "regressed"
        ? "REGRESSED"
        : "UNCHANGED";

  return [
    `**${label}** vs previous review`,
    `- Previous: ${prev}`,
    `- Current: ${curr}`,
    `- Delta total: ${trend.delta.total >= 0 ? "+" : ""}${trend.delta.total}`,
  ].join("\n");
}
