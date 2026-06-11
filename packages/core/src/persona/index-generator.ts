import { loadPrecomputedIndex, lookupPrecomputedEntry } from "@nuwajs/persona";
import { PERSONA_INDEX_FILE } from "../constants.js";
import type { PersonaIndexEntry } from "../types.js";
import { buildHeuristicPersonaIndex } from "./heuristic-index.js";

export interface GenerateIndexOptions {
  /** Force heuristic index (skip bundled precomputed) */
  offline?: boolean;
}

/** Resolve index entry from bundled precomputed data or heuristic fallback */
export async function generatePersonaIndex(
  id: string,
  content: string,
  sourceFile: string,
  options: GenerateIndexOptions = {},
): Promise<PersonaIndexEntry> {
  if (!options.offline) {
    const precomputed = await loadPrecomputedIndex();
    const entry = lookupPrecomputedEntry(id, precomputed);
    if (entry) {
      return { ...entry, sourceFile };
    }
  }

  return buildHeuristicPersonaIndex(id, content, sourceFile);
}

/** Manifest filename constant for consumers */
export { PERSONA_INDEX_FILE };
