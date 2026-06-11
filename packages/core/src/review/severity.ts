import type { ReviewFinding } from "../types.js";

/** Ordered severity levels (most severe first) */
export const SEVERITY_LEVELS = [
  "critical",
  "high",
  "medium",
  "low",
  "info",
] as const;

export type FindingSeverity = (typeof SEVERITY_LEVELS)[number];

/** Finding counts per severity bucket */
export interface SeverityCount {
  critical: number;
  high: number;
  medium: number;
  low: number;
  info: number;
  total: number;
}

/** Direction of change vs a prior review */
export type ReviewTrendDirection = "improved" | "unchanged" | "regressed" | "first";

/** Severity delta between two reviews */
export interface SeverityDelta {
  critical: number;
  high: number;
  medium: number;
  low: number;
  info: number;
  total: number;
}

/** Comparison of current vs previous severity counts */
export interface ReviewTrend {
  direction: ReviewTrendDirection;
  previous?: SeverityCount;
  current: SeverityCount;
  delta: SeverityDelta;
}

/** Empty severity tally */
export function emptySeverityCount(): SeverityCount {
  return {
    critical: 0,
    high: 0,
    medium: 0,
    low: 0,
    info: 0,
    total: 0,
  };
}

/** Count findings into severity buckets */
export function countFindingsBySeverity(
  findings: ReviewFinding[],
): SeverityCount {
  const counts = emptySeverityCount();
  for (const finding of findings) {
    counts[finding.severity] += 1;
    counts.total += 1;
  }
  return counts;
}

/** Merge parsed scorecard with computed counts (parsed wins when non-zero) */
export function mergeSeverityCount(
  parsed: Partial<SeverityCount> | undefined,
  computed: SeverityCount,
): SeverityCount {
  if (!parsed) {
    return computed;
  }
  const merged = { ...computed };
  for (const level of SEVERITY_LEVELS) {
    const parsedValue = parsed[level];
    if (typeof parsedValue === "number" && parsedValue > 0) {
      merged[level] = parsedValue;
    }
  }
  merged.total = SEVERITY_LEVELS.reduce((sum, level) => sum + merged[level], 0);
  return merged;
}

/** Human-readable severity tally */
export function formatSeverityCount(counts: SeverityCount): string {
  const parts = SEVERITY_LEVELS.filter((level) => counts[level] > 0).map(
    (level) => `${level}:${counts[level]}`,
  );
  return parts.length > 0 ? parts.join(", ") : "none";
}

/** Compute per-severity deltas (current − previous) */
export function severityDelta(
  previous: SeverityCount,
  current: SeverityCount,
): SeverityDelta {
  return {
    critical: current.critical - previous.critical,
    high: current.high - previous.high,
    medium: current.medium - previous.medium,
    low: current.low - previous.low,
    info: current.info - previous.info,
    total: current.total - previous.total,
  };
}

/**
 * Weighted score — lower is better (critical weighs most).
 * Used to decide improved vs regressed when totals tie.
 */
export function severityWeight(counts: SeverityCount): number {
  return (
    counts.critical * 1000 +
    counts.high * 100 +
    counts.medium * 10 +
    counts.low +
    counts.info * 0.1
  );
}

/** Compare current review against a previous baseline */
export function compareSeverityCounts(
  previous: SeverityCount | undefined,
  current: SeverityCount,
): ReviewTrend {
  if (!previous) {
    return {
      direction: "first",
      current,
      delta: severityDelta(emptySeverityCount(), current),
    };
  }

  const delta = severityDelta(previous, current);
  const prevWeight = severityWeight(previous);
  const currWeight = severityWeight(current);

  let direction: ReviewTrendDirection = "unchanged";
  if (currWeight < prevWeight) {
    direction = "improved";
  } else if (currWeight > prevWeight) {
    direction = "regressed";
  } else if (delta.total !== 0) {
    direction = delta.total < 0 ? "improved" : "regressed";
  }

  return { direction, previous, current, delta };
}

/** Format trend for CLI / FEEDBACK.md */
export function formatReviewTrend(trend: ReviewTrend): string {
  if (trend.direction === "first") {
    return `first review — ${formatSeverityCount(trend.current)}`;
  }

  const arrow =
    trend.direction === "improved"
      ? "↓ improved"
      : trend.direction === "regressed"
        ? "↑ regressed"
        : "→ unchanged";

  const deltas = SEVERITY_LEVELS.filter((level) => trend.delta[level] !== 0)
    .map((level) => {
      const d = trend.delta[level];
      return `${level}${d > 0 ? "+" : ""}${d}`;
    })
    .join(", ");

  const deltaText = deltas ? ` (${deltas})` : "";
  return `${arrow}${deltaText} — ${formatSeverityCount(trend.current)}`;
}
