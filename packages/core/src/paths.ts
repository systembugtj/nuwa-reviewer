import { mkdir } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";

/** Global Nuwa home directory name under user home */
export const NUWA_HOME_NAME = ".nuwa";

/** Project-local Nuwa directory name */
export const NUWA_PROJECT_DIR = ".nuwa";

/** Subdirectory under ~/.nuwa for downloaded ML models */
export const NUWA_MODELS_SUBDIR = "models";

/** Global persona index filename under ~/.nuwa */
export const NUWA_PERSONA_INDEX_FILENAME = "persona-index.json";

/** Resolve global Nuwa home: ~/.nuwa */
export function getNuwaHome(): string {
  return join(homedir(), NUWA_HOME_NAME);
}

/** Resolve ~/.nuwa/models for Hugging Face / Transformers.js cache */
export function getNuwaModelsDir(): string {
  return join(getNuwaHome(), NUWA_MODELS_SUBDIR);
}

/** Resolve ~/.nuwa/persona-index.json */
export function getNuwaPersonaIndexPath(): string {
  return join(getNuwaHome(), NUWA_PERSONA_INDEX_FILENAME);
}

/** Create ~/.nuwa and required subdirectories */
export async function ensureNuwaHome(): Promise<string> {
  const home = getNuwaHome();
  await mkdir(join(home, NUWA_MODELS_SUBDIR), { recursive: true });
  return home;
}
