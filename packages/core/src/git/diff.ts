import { execFile } from "node:child_process";
import { promisify } from "node:util";
import type { ReviewScope } from "../types.js";

const execFileAsync = promisify(execFile);

export interface DiffRequest {
  cwd: string;
  scope: ReviewScope;
  target?: string;
}

export interface DiffResult {
  scope: ReviewScope;
  target: string;
  diff: string;
  files: string[];
}

/** Run a git or gh command and return stdout */
async function runCommand(
  cmd: string,
  args: string[],
  cwd: string,
): Promise<string> {
  const { stdout } = await execFileAsync(cmd, args, {
    cwd,
    maxBuffer: 10 * 1024 * 1024,
  });
  return stdout;
}

/** Parse changed file paths from unified diff */
export function parseDiffFiles(diff: string): string[] {
  const files = new Set<string>();
  for (const line of diff.split("\n")) {
    if (line.startsWith("+++ b/")) {
      const path = line.slice(6).trim();
      if (path !== "/dev/null") {
        files.add(path);
      }
    }
  }
  return [...files].sort();
}

/** Collect git diff for review scope */
export async function collectDiff(request: DiffRequest): Promise<DiffResult> {
  const { cwd, scope, target } = request;

  switch (scope) {
    case "staged": {
      const diff = await runCommand("git", ["diff", "--cached"], cwd);
      return { scope, target: "staged", diff, files: parseDiffFiles(diff) };
    }
    case "unstaged": {
      const diff = await runCommand("git", ["diff"], cwd);
      return { scope, target: "unstaged", diff, files: parseDiffFiles(diff) };
    }
    case "commit": {
      const sha = target ?? "HEAD";
      const diff = await runCommand("git", ["show", sha, "--format=", "-p"], cwd);
      return { scope, target: sha, diff, files: parseDiffFiles(diff) };
    }
    case "pr": {
      const pr = target ?? "current";
      const args =
        pr === "current"
          ? ["pr", "diff"]
          : ["pr", "diff", pr];
      const diff = await runCommand("gh", args, cwd);
      return { scope, target: pr, diff, files: parseDiffFiles(diff) };
    }
    default: {
      const _exhaustive: never = scope;
      throw new Error(`Unsupported review scope: ${String(_exhaustive)}`);
    }
  }
}
