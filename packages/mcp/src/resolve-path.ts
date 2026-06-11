import { resolve } from "node:path";
import { CLAUDE_PROJECT_DIR_ENV } from "./constants.js";

/** Resolve project directory from tool arg, Claude env, or cwd */
export function resolveProjectPath(path?: string): string {
  const base =
    path?.trim() ||
    process.env[CLAUDE_PROJECT_DIR_ENV]?.trim() ||
    process.cwd();
  return resolve(base);
}
