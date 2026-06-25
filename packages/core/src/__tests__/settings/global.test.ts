import { mkdtemp, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as paths from "../../paths.js";
import { readNuwaGlobalSettings } from "../../settings/global.js";

describe("readNuwaGlobalSettings", () => {
  const originalHome = process.env.HOME;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    if (originalHome === undefined) {
      delete process.env.HOME;
    } else {
      process.env.HOME = originalHome;
    }
  });

  it("returns null when settings file missing", async () => {
    const dir = await mkdtemp(join(homedir(), "nuwa-settings-missing-"));
    vi.spyOn(paths, "getNuwaSettingsPath").mockReturnValue(
      join(dir, "settings.json"),
    );
    await expect(readNuwaGlobalSettings()).resolves.toBeNull();
  });

  it("parses review model from settings file", async () => {
    const dir = await mkdtemp(join(homedir(), "nuwa-settings-read-"));
    const settingsPath = join(dir, "settings.json");
    vi.spyOn(paths, "getNuwaSettingsPath").mockReturnValue(settingsPath);
    await writeFile(
      settingsPath,
      `${JSON.stringify({
        version: "1",
        review: { model: "claude-opus-4-8" },
      })}\n`,
      "utf8",
    );
    const settings = await readNuwaGlobalSettings();
    expect(settings?.review?.model).toBe("claude-opus-4-8");
  });
});
