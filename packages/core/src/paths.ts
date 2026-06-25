import { access, mkdir } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";

/** Global Nuwa home directory name under user home */
export const NUWA_HOME_NAME = ".nuwa";

/** Project-local Nuwa directory name */
export const NUWA_PROJECT_DIR = ".nuwa";

/** Cache namespace for embedding models (under XDG cache) */
export const NUWA_CACHE_NAMESPACE = "nuwa";

/** Subdirectory name for downloaded ML models */
export const NUWA_MODELS_SUBDIR = "models";

/** Global persona index filename under ~/.nuwa */
export const NUWA_PERSONA_INDEX_FILENAME = "persona-index.json";

/** User-wide Nuwa settings (model, review defaults) */
export const NUWA_SETTINGS_FILENAME = "settings.json";

/** Env: XDG Base Directory cache root (models stored under `<cache>/nuwa/models`) */
export const XDG_CACHE_HOME_ENV = "XDG_CACHE_HOME";

/** Resolve global Nuwa home: ~/.nuwa (persona index, not model cache) */
export function getNuwaHome(): string {
  return join(homedir(), NUWA_HOME_NAME);
}

/** Resolve model cache: $XDG_CACHE_HOME/nuwa/models or ~/.cache/nuwa/models */
export function getNuwaModelsDir(): string {
  const cacheRoot =
    process.env[XDG_CACHE_HOME_ENV]?.trim() || join(homedir(), ".cache");
  return join(cacheRoot, NUWA_CACHE_NAMESPACE, NUWA_MODELS_SUBDIR);
}

/** Resolve ~/.nuwa/persona-index.json */
export function getNuwaPersonaIndexPath(): string {
  return join(getNuwaHome(), NUWA_PERSONA_INDEX_FILENAME);
}

/** Resolve ~/.nuwa/settings.json */
export function getNuwaSettingsPath(): string {
  return join(getNuwaHome(), NUWA_SETTINGS_FILENAME);
}

async function pathExists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

/** Result of first-time global storage directory creation */
export interface NuwaHomeInitResult {
  home: string;
  modelsDir: string;
  /** True when index or model cache dir did not exist before this call */
  created: boolean;
}

/**
 * Create ~/.nuwa (index) and XDG model cache dirs.
 * Only called from `nuwa precompute-index` / `runPrecomputeIndex` — not during init/review.
 */
export async function ensureNuwaHome(): Promise<NuwaHomeInitResult> {
  const home = getNuwaHome();
  const modelsDir = getNuwaModelsDir();
  const homeExisted = await pathExists(home);
  const modelsExisted = await pathExists(modelsDir);

  await mkdir(home, { recursive: true });
  await mkdir(modelsDir, { recursive: true });

  return {
    home,
    modelsDir,
    created: !homeExisted || !modelsExisted,
  };
}
