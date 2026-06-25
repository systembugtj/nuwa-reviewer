import { describe, expect, it } from "vitest";
import {
  DEFAULT_NUWA_REVIEW_CONFIG,
  mergeReviewConfig,
  resolveReviewSettings,
} from "../../review/config.js";
import type { NuwaConfig } from "../../types.js";

const BASE_CONFIG: NuwaConfig = {
  version: "1",
  projectRoot: "/tmp/demo",
  stacks: ["node"],
  personas: ["linus-torvalds"],
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

describe("resolveReviewSettings", () => {
  it("defaults maxTurns to 20", () => {
    const settings = resolveReviewSettings(null);
    expect(settings.maxTurns).toBe(20);
    expect(settings.continueOnError).toBe(true);
  });

  it("reads review block from .nuwa/config.json", () => {
    const settings = resolveReviewSettings({
      ...BASE_CONFIG,
      review: {
        model: "claude-opus-4-6",
        maxTurns: 12,
        continueOnError: false,
      },
    });
    expect(settings.model).toBe("claude-opus-4-6");
    expect(settings.maxTurns).toBe(12);
    expect(settings.continueOnError).toBe(false);
  });

  it("CLI overrides beat config file", () => {
    const settings = resolveReviewSettings(
      { ...BASE_CONFIG, review: { maxTurns: 12 } },
      { maxTurns: 30, model: "claude-sonnet-4-6" },
    );
    expect(settings.maxTurns).toBe(30);
    expect(settings.model).toBe("claude-sonnet-4-6");
  });

  it("migrates deprecated sonnet-4 model ids", () => {
    const settings = resolveReviewSettings({
      ...BASE_CONFIG,
      review: { model: "claude-sonnet-4-20250514" },
    });
    expect(settings.model).toBe("claude-sonnet-4-6");
  });
});

describe("mergeReviewConfig", () => {
  it("fills defaults for new projects", () => {
    expect(mergeReviewConfig()).toEqual(DEFAULT_NUWA_REVIEW_CONFIG);
  });

  it("preserves user overrides", () => {
    expect(mergeReviewConfig({ maxTurns: 25 }).maxTurns).toBe(25);
  });

  it("upgrades deprecated model on merge", () => {
    expect(
      mergeReviewConfig({ model: "claude-sonnet-4-20250514" }).model,
    ).toBe("claude-sonnet-4-6");
  });
});
