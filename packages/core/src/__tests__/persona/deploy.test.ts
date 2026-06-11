import { access, mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { initProject, readNuwaConfig } from "../../persona/deploy.js";
import {
  NUWA_CONFIG_FILE,
  NUWA_PERSONA_DIR,
  PERSONA_INDEX_FILE,
} from "../../constants.js";

describe("initProject", () => {
  it("deploys personas and config offline", async () => {
    const dir = await mkdtemp(join(tmpdir(), "nuwa-init-"));
    await writeFile(
      join(dir, "package.json"),
      JSON.stringify({ name: "fixture" }),
    );

    const result = await initProject(dir, {
      offline: true,
      personas: ["linus-torvalds", "kent-beck"],
    });

    expect(result.personas).toEqual(["linus-torvalds", "kent-beck"]);
    expect(result.index).toHaveLength(2);

    const config = await readNuwaConfig(dir);
    expect(config?.personas).toHaveLength(2);
    expect(config?.review?.maxTurns).toBe(20);

    const indexRaw = await readFile(
      join(result.personaDir, PERSONA_INDEX_FILE),
      "utf8",
    );
    const index = JSON.parse(indexRaw) as unknown[];
    expect(index).toHaveLength(2);

    const configPath = join(dir, NUWA_CONFIG_FILE);
    expect(result.configPath).toBe(configPath);
    expect(result.personaDir).toBe(join(dir, NUWA_PERSONA_DIR));

    const linusMd = await readFile(
      join(result.personaDir, "linus-torvalds.md"),
      "utf8",
    );
    expect(linusMd).toContain("Linus Torvalds");

    await expect(access(join(result.personaDir, "kent-beck.md"))).resolves.toBe(
      undefined,
    );
  });

  it("deploys to detected project root when init from monorepo subdirectory", async () => {
    const repo = await mkdtemp(join(tmpdir(), "nuwa-init-mono-"));
    const subDir = join(repo, "packages", "app", "src");
    await mkdir(subDir, { recursive: true });
    await writeFile(
      join(repo, "package.json"),
      JSON.stringify({ name: "mono-root" }),
    );
    await writeFile(join(repo, "pnpm-workspace.yaml"), "packages:\n  - packages/*\n");

    const result = await initProject(subDir, {
      offline: true,
      personas: ["linus-torvalds"],
    });

    expect(result.projectRoot).toBe(repo);
    expect(result.personaDir).toBe(join(repo, NUWA_PERSONA_DIR));
    await expect(
      access(join(repo, NUWA_PERSONA_DIR, "linus-torvalds.md")),
    ).resolves.toBe(undefined);
  });
});
