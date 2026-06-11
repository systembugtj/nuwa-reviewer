/** Persona index record (stored in ~/.nuwa/persona-index.json) */
export interface PersonaIndexRecord {
  id: string;
  name: string;
  expertise: string[];
  keywords: string[];
  summary: string;
  whenToUse: string;
  sourceFile: string;
  /** Normalized embedding vector (384-dim for MiniLM-L6-v2) */
  embedding?: number[];
}

/** Precomputed persona index manifest */
export interface PrecomputedIndexManifest {
  version: string;
  model: string;
  generatedAt: string;
  personasHash: string;
  storagePath: string;
  entries: PersonaIndexRecord[];
}
