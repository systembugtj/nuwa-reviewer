import { describe, expect, it } from "vitest";
import {
  parseReviewRounds,
  parseSeverityScorecard,
  parseStructuredReview,
  parseVerdict,
} from "../../review/parse.js";

const STRUCTURED_REPORT = `## Summary
Solid change.

## Review Rounds
### Round 1
- **Action:** Read packages/core/src/review/agent.ts
- **Observation:** SDK wiring looks correct
- **Findings so far:** critical:0, high:1, medium:0, low:0, info:0

### Round 2
- **Action:** Grep for maxTurns
- **Observation:** maxTurns is 5
- **Findings so far:** critical:0, high:1, medium:1, low:0, info:0

## Severity Scorecard
| Severity | Count |
| critical | 0 |
| high | 1 |
| medium | 1 |
| low | 0 |
| info | 0 |

## Trend
IMPROVED vs previous — critical -1, high unchanged.

## Findings
- **[high]** Missing tests — src/review/agent.ts:1
  Add unit tests.

- **[medium]** Long function — src/review/agent.ts:50
  Split runReview.

## Verdict
request-changes`;

describe("parseStructuredReview", () => {
  it("parses rounds, scorecard, verdict, and trend", () => {
    const findings = [
      {
        personaId: "linus",
        severity: "high" as const,
        title: "Missing tests",
        file: "src/review/agent.ts",
        line: 1,
        description: "Add unit tests.",
        suggestion: "",
      },
      {
        personaId: "linus",
        severity: "medium" as const,
        title: "Long function",
        file: "src/review/agent.ts",
        line: 50,
        description: "Split runReview.",
        suggestion: "",
      },
    ];

    const structured = parseStructuredReview(
      "linus",
      STRUCTURED_REPORT,
      findings,
      {
        reviewedAt: "2026-01-01T00:00:00.000Z",
        scope: "staged",
        target: "staged",
        aggregate: {
          critical: 1,
          high: 1,
          medium: 0,
          low: 0,
          info: 0,
          total: 2,
        },
        personas: {},
      },
    );

    expect(parseVerdict(STRUCTURED_REPORT)).toBe("request-changes");
    expect(parseReviewRounds(STRUCTURED_REPORT)).toHaveLength(2);
    expect(parseSeverityScorecard(STRUCTURED_REPORT).high).toBe(1);
    expect(structured.rounds[0]?.action).toContain("Read");
    expect(structured.severity.high).toBe(1);
    expect(structured.trend?.direction).toBe("improved");
  });
});
