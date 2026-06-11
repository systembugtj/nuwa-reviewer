import { readFile } from "node:fs/promises";
import { getPersonaPath } from "@nuwajs/persona";
import { describe, expect, it } from "vitest";
import { buildHeuristicPersonaIndex } from "../../persona/heuristic-index.js";

describe("buildHeuristicPersonaIndex", () => {
  it("extracts name and summary from linus persona", async () => {
    const content = await readFile(getPersonaPath("linus-torvalds"), "utf8");
    const index = buildHeuristicPersonaIndex(
      "linus-torvalds",
      content,
      "linus-torvalds.md",
    );

    expect(index.id).toBe("linus-torvalds");
    expect(index.name).toContain("Linus");
    expect(index.summary.length).toBeGreaterThan(10);
    expect(index.keywords.length).toBeGreaterThan(0);
  });
});
