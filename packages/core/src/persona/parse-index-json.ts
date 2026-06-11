import type { PersonaIndexEntry } from "../types.js";

/** Parse JSON index object from model text output */
export function parseIndexJson(raw: string): Partial<PersonaIndexEntry> | null {
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
  const candidate = fenced?.[1]?.trim() ?? raw.trim();
  try {
    return JSON.parse(candidate) as Partial<PersonaIndexEntry>;
  } catch {
    const start = candidate.indexOf("{");
    const end = candidate.lastIndexOf("}");
    if (start >= 0 && end > start) {
      try {
        return JSON.parse(candidate.slice(start, end + 1)) as Partial<PersonaIndexEntry>;
      } catch {
        return null;
      }
    }
    return null;
  }
}

/** Merge parsed model output into a complete index entry */
export function mergeIndexEntry(
  id: string,
  sourceFile: string,
  parsed: Partial<PersonaIndexEntry>,
): PersonaIndexEntry {
  return {
    id,
    name: parsed.name ?? id,
    expertise: parsed.expertise ?? [],
    keywords: parsed.keywords ?? [],
    summary: parsed.summary ?? "",
    whenToUse: parsed.whenToUse ?? parsed.summary ?? "",
    sourceFile,
  };
}
