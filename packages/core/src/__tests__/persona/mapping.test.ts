import { describe, expect, it } from "vitest";
import { selectPersonasForStacks } from "../../persona/mapping.js";

describe("selectPersonasForStacks", () => {
  it("always includes board personas", () => {
    const personas = selectPersonasForStacks(["unknown"]);
    expect(personas).toContain("linus-torvalds");
    expect(personas).toContain("kent-beck");
    expect(personas).toContain("martin-fowler");
  });

  it("merges stack-specific personas for react projects", () => {
    const personas = selectPersonasForStacks(["node", "react"]);
    expect(personas).toContain("jordan-walke");
    expect(personas).toContain("dan-abramov");
    expect(personas).toContain("guillermo-rauch");
  });

  it("deduplicates personas across stacks", () => {
    const personas = selectPersonasForStacks(["node", "monorepo"]);
    const unique = new Set(personas);
    expect(unique.size).toBe(personas.length);
  });
});
