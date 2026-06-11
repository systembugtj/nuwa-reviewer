import { describe, expect, it } from "vitest";
import { parseFindingsFromMarkdown, extractSummary } from "../../review/parse.js";

const SAMPLE = `## Summary
Good structure but missing tests.

## Findings
- **[high]** Missing error handling — src/foo.ts:42
  Wrap filesystem calls in try/catch.
  Add unit test for failure path.

## Verdict
request-changes`;

describe("parseFindingsFromMarkdown", () => {
  it("parses structured findings", () => {
    const findings = parseFindingsFromMarkdown("kent-beck", SAMPLE);
    expect(findings).toHaveLength(1);
    expect(findings[0]?.severity).toBe("high");
    expect(findings[0]?.title).toContain("Missing error handling");
    expect(findings[0]?.file).toBe("src/foo.ts");
    expect(findings[0]?.line).toBe(42);
  });
});

describe("extractSummary", () => {
  it("extracts summary section", () => {
    expect(extractSummary(SAMPLE)).toBe("Good structure but missing tests.");
  });
});
