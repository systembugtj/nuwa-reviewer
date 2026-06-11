import { homedir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  getNuwaHome,
  getNuwaModelsDir,
  getNuwaPersonaIndexPath,
} from "../paths.js";

describe("nuwa paths", () => {
  it("resolves global home under user directory", () => {
    expect(getNuwaHome()).toBe(join(homedir(), ".nuwa"));
  });

  it("resolves models cache path", () => {
    expect(getNuwaModelsDir()).toBe(join(homedir(), ".nuwa", "models"));
  });

  it("resolves persona index path", () => {
    expect(getNuwaPersonaIndexPath()).toBe(
      join(homedir(), ".nuwa", "persona-index.json"),
    );
  });
});
