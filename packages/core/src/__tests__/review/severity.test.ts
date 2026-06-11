import { describe, expect, it } from "vitest";
import {
  compareSeverityCounts,
  countFindingsBySeverity,
  emptySeverityCount,
  formatReviewTrend,
} from "../../review/severity.js";
import type { ReviewFinding } from "../../types.js";

const finding = (
  severity: ReviewFinding["severity"],
): ReviewFinding => ({
  personaId: "test",
  severity,
  title: "issue",
  description: "",
  suggestion: "",
});

describe("countFindingsBySeverity", () => {
  it("tallies findings by severity", () => {
    const counts = countFindingsBySeverity([
      finding("critical"),
      finding("high"),
      finding("high"),
      finding("info"),
    ]);
    expect(counts).toEqual({
      critical: 1,
      high: 2,
      medium: 0,
      low: 0,
      info: 1,
      total: 4,
    });
  });
});

describe("compareSeverityCounts", () => {
  it("marks improved when critical/high drop", () => {
    const previous = { ...emptySeverityCount(), critical: 2, high: 3, total: 5 };
    const current = { ...emptySeverityCount(), high: 1, total: 1 };
    const trend = compareSeverityCounts(previous, current);
    expect(trend.direction).toBe("improved");
    expect(trend.delta.total).toBe(-4);
  });

  it("marks first review when no baseline", () => {
    const current = countFindingsBySeverity([finding("medium")]);
    const trend = compareSeverityCounts(undefined, current);
    expect(trend.direction).toBe("first");
    expect(formatReviewTrend(trend)).toContain("first review");
  });
});
