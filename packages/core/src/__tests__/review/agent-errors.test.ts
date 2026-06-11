import { describe, expect, it } from "vitest";
import {
  createFailedPersonaOutput,
  formatReviewError,
} from "../../review/agent.js";

describe("review error reporting", () => {
  it("formats errors without stack traces", () => {
    const message = formatReviewError(
      new Error("Reached maximum number of turns (5)"),
    );
    expect(message).toBe("Reached maximum number of turns (5)");
    expect(message).not.toContain("at ");
  });

  it("creates degraded output for failed persona", () => {
    const output = createFailedPersonaOutput(
      "linus-torvalds",
      new Error("Reached maximum number of turns (5)"),
    );
    expect(output.personaId).toBe("linus-torvalds");
    expect(output.findings).toHaveLength(1);
    expect(output.errors?.[0]).toContain("maximum number of turns");
    expect(output.markdown).toContain("## Summary");
  });
});
