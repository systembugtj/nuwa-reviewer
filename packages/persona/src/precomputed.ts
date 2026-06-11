import { createHash } from "node:crypto";
import { access, readFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import { PERSONA_DIR } from "./paths-local.js";
import type { PersonaIndexRecord, PrecomputedIndexManifest } from "./types.js";

/** Global Nuwa home: ~/.nuwa */
export const NUWA_HOME = join(homedir(), ".nuwa");

/** Global persona index: ~/.nuwa/persona-index.json */
export const NUWA_PERSONA_INDEX_PATH = join(NUWA_HOME, "persona-index.json");

/** Bundled fallback index shipped with @nuwajs/persona */
export const BUNDLED_INDEX_FILE = join(PERSONA_DIR, "index.precomputed.json");

async function fileReadable(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

/** Resolve index path: ~/.nuwa/persona-index.json first, then bundled fallback */
export async function resolvePrecomputedIndexPath(): Promise<string> {
  const globalPath = NUWA_PERSONA_INDEX_PATH;
  if (await fileReadable(globalPath)) {
    return globalPath;
  }
  if (await fileReadable(BUNDLED_INDEX_FILE)) {
    return BUNDLED_INDEX_FILE;
  }
  throw new Error(
    "Persona index not found. Run `pnpm precompute-index` to build ~/.nuwa/persona-index.json",
  );
}

/** Load precomputed persona index from ~/.nuwa or bundled fallback */
export async function loadPrecomputedIndex(): Promise<PersonaIndexRecord[]> {
  const path = await resolvePrecomputedIndexPath();
  const raw = await readFile(path, "utf8");
  const manifest = JSON.parse(raw) as PrecomputedIndexManifest;
  return manifest.entries;
}

/** Load full precomputed manifest */
export async function loadPrecomputedManifest(): Promise<PrecomputedIndexManifest> {
  const path = await resolvePrecomputedIndexPath();
  const raw = await readFile(path, "utf8");
  return JSON.parse(raw) as PrecomputedIndexManifest;
}

/** Find a single precomputed entry by persona id */
export function lookupPrecomputedEntry(
  id: string,
  entries: PersonaIndexRecord[],
): PersonaIndexRecord | undefined {
  return entries.find((entry) => entry.id === id);
}

/** SHA-256 hash of all persona markdown contents (staleness check) */
export async function hashPersonaSources(ids: string[]): Promise<string> {
  const hash = createHash("sha256");
  for (const id of [...ids].sort()) {
    const content = await readFile(join(PERSONA_DIR, `${id}.md`), "utf8");
    hash.update(id);
    hash.update(content);
  }
  return hash.digest("hex");
}
