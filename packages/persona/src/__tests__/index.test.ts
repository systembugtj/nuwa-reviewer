import { describe, expect, it } from "vitest";
import { getPersonaPath, listPersonaIds } from "../index.js";

describe("@nuwajs/persona", () => {
  it("lists bundled persona markdown files", async () => {
    const ids = await listPersonaIds();
    expect(ids.length).toBeGreaterThan(20);
    expect(ids).toContain("linus-torvalds");
    expect(ids).toContain("kent-beck");
    expect(ids).toContain("martin-fowler");
  });

  it("resolves persona file paths", () => {
    const path = getPersonaPath("linus-torvalds");
    expect(path.endsWith("linus-torvalds.md")).toBe(true);
  });
});
