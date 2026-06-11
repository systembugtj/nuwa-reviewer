import { describe, expect, it } from "vitest";
import type { PrecomputedIndexManifest } from "@nuwajs/persona";
import { isManifestCurrent } from "../../persona/precompute.js";

const BASE: PrecomputedIndexManifest = {
  version: "1",
  model: "heuristic",
  generatedAt: "2026-01-01T00:00:00.000Z",
  personasHash: "abc123",
  storagePath: "/tmp/index.json",
  entries: [
    {
      id: "a",
      name: "A",
      expertise: [],
      keywords: [],
      summary: "",
      whenToUse: "",
      sourceFile: "a.md",
    },
  ],
};

describe("isManifestCurrent", () => {
  it("returns true when hash and count match", () => {
    expect(isManifestCurrent(BASE, "abc123", 1)).toBe(true);
  });

  it("returns false when hash differs", () => {
    expect(isManifestCurrent(BASE, "other", 1)).toBe(false);
  });

  it("returns false when manifest is null", () => {
    expect(isManifestCurrent(null, "abc123", 1)).toBe(false);
  });
});
