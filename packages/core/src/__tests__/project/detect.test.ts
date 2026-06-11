import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { detectProjectStacks } from "../../project/detect.js";

describe("detectProjectStacks", () => {
  it("detects node stack from package.json", async () => {
    const dir = await mkdtemp(join(tmpdir(), "nuwa-detect-"));
    await writeFile(
      join(dir, "package.json"),
      JSON.stringify({ name: "demo", dependencies: { react: "^19.0.0" } }),
    );

    const { root, stacks } = await detectProjectStacks(dir);
    expect(root).toBe(dir);
    expect(stacks).toContain("node");
    expect(stacks).toContain("react");
  });

  it("detects rust stack from Cargo.toml", async () => {
    const dir = await mkdtemp(join(tmpdir(), "nuwa-detect-"));
    await writeFile(join(dir, "Cargo.toml"), '[package]\nname = "demo"\n');

    const { stacks } = await detectProjectStacks(dir);
    expect(stacks).toContain("rust");
  });
});
