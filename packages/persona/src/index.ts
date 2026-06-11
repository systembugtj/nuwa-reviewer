import { readdir } from "node:fs/promises";
import { join } from "node:path";
import { PERSONA_DIR } from "./paths-local.js";

export { PERSONA_DIR } from "./paths-local.js";
export {
  EMBEDDING_MODEL,
  EMBEDDING_DIM,
  EXPERTISE_PROBES,
  type ExpertiseProbeId,
} from "./embedding.js";
export type { PersonaIndexRecord, PrecomputedIndexManifest } from "./types.js";
export {
  NUWA_HOME,
  NUWA_PERSONA_INDEX_PATH,
  BUNDLED_INDEX_FILE,
  loadPrecomputedIndex,
  loadPrecomputedManifest,
  lookupPrecomputedEntry,
  hashPersonaSources,
} from "./precomputed.js";

/** List all persona ids (filename without .md extension) */
export async function listPersonaIds(): Promise<string[]> {
  const entries = await readdir(PERSONA_DIR);
  return entries
    .filter((name) => name.endsWith(".md"))
    .map((name) => name.replace(/\.md$/, ""))
    .sort();
}

/** Resolve absolute path to a persona markdown file */
export function getPersonaPath(id: string): string {
  return join(PERSONA_DIR, `${id}.md`);
}
