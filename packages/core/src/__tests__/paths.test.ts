import { homedir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  getNuwaHome,
  getNuwaModelsDir,
  getNuwaPersonaIndexPath,
  getNuwaSettingsPath,
  XDG_CACHE_HOME_ENV,
} from "../paths.js";

describe("nuwa paths", () => {
  const originalXdg = process.env[XDG_CACHE_HOME_ENV];

  beforeEach(() => {
    delete process.env[XDG_CACHE_HOME_ENV];
  });

  afterEach(() => {
    if (originalXdg === undefined) {
      delete process.env[XDG_CACHE_HOME_ENV];
    } else {
      process.env[XDG_CACHE_HOME_ENV] = originalXdg;
    }
  });

  it("resolves global home under user directory", () => {
    expect(getNuwaHome()).toBe(join(homedir(), ".nuwa"));
  });

  it("resolves models cache under ~/.cache/nuwa/models by default", () => {
    expect(getNuwaModelsDir()).toBe(
      join(homedir(), ".cache", "nuwa", "models"),
    );
  });

  it("respects XDG_CACHE_HOME for model cache", () => {
    process.env[XDG_CACHE_HOME_ENV] = "/tmp/xdg-cache";
    expect(getNuwaModelsDir()).toBe(join("/tmp/xdg-cache", "nuwa", "models"));
  });

  it("resolves persona index path", () => {
    expect(getNuwaPersonaIndexPath()).toBe(
      join(homedir(), ".nuwa", "persona-index.json"),
    );
  });

  it("resolves global settings path", () => {
    expect(getNuwaSettingsPath()).toBe(
      join(homedir(), ".nuwa", "settings.json"),
    );
  });
});
