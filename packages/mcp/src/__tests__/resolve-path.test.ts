import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { resolve } from "node:path";
import { CLAUDE_PROJECT_DIR_ENV } from "../constants.js";
import { resolveProjectPath } from "../resolve-path.js";

describe("resolveProjectPath", () => {
  const original = process.env[CLAUDE_PROJECT_DIR_ENV];

  beforeEach(() => {
    delete process.env[CLAUDE_PROJECT_DIR_ENV];
  });

  afterEach(() => {
    if (original === undefined) {
      delete process.env[CLAUDE_PROJECT_DIR_ENV];
    } else {
      process.env[CLAUDE_PROJECT_DIR_ENV] = original;
    }
  });

  it("prefers explicit path over env", () => {
    process.env[CLAUDE_PROJECT_DIR_ENV] = "/from-env";
    expect(resolveProjectPath("/explicit")).toBe(resolve("/explicit"));
  });

  it("uses CLAUDE_PROJECT_DIR when path omitted", () => {
    process.env[CLAUDE_PROJECT_DIR_ENV] = "/from-env";
    expect(resolveProjectPath()).toBe(resolve("/from-env"));
  });
});
