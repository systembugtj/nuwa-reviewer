import type { PersonaIndexEntry } from "../types.js";

const NAME_PATTERN = /^#\s+(.+)$/m;
const ROLE_PATTERN = /##\s*角色定义\s*\n+([\s\S]*?)(?=\n##|\n$)/;
const PHILOSOPHY_PATTERN = /##\s*[^#\n]*哲学[^#\n]*\s*\n+([\s\S]*?)(?=\n##|\n$)/i;

/** Convert kebab-case id to display name */
function idToDisplayName(id: string): string {
  return id
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

/** Extract bullet keywords from markdown section */
function extractKeywords(section: string, limit = 8): string[] {
  const keywords = new Set<string>();
  const bulletMatches = section.matchAll(/^[-*]\s+(.+)$/gm);
  for (const match of bulletMatches) {
    const line = match[1]?.trim() ?? "";
    const words = line
      .replace(/[「」"'`]/g, "")
      .split(/[,，、/\s]+/)
      .map((w) => w.trim())
      .filter((w) => w.length > 2 && w.length < 32);
    for (const word of words.slice(0, 3)) {
      keywords.add(word);
    }
    if (keywords.size >= limit) {
      break;
    }
  }
  return [...keywords].slice(0, limit);
}

/** Build persona index without external API (offline fallback) */
export function buildHeuristicPersonaIndex(
  id: string,
  content: string,
  sourceFile: string,
): PersonaIndexEntry {
  const titleMatch = content.match(NAME_PATTERN);
  const roleMatch = content.match(ROLE_PATTERN);
  const philosophyMatch = content.match(PHILOSOPHY_PATTERN);

  const rawTitle = titleMatch?.[1]?.trim() ?? "";
  const name = rawTitle.includes(".md") || rawTitle.startsWith(id)
    ? idToDisplayName(id)
    : rawTitle.split(/\s*[-—|]\s*/)[0]?.trim() || idToDisplayName(id);
  const roleText = roleMatch?.[1]?.trim() ?? "";
  const philosophyText = philosophyMatch?.[1]?.trim() ?? "";
  const keywords = extractKeywords(philosophyText || roleText || content);

  const summary = roleText
    ? roleText.split("\n").find((line) => line.trim().length > 0)?.trim() ?? ""
    : `Expert reviewer persona: ${name}`;

  return {
    id,
    name,
    expertise: keywords.slice(0, 5),
    keywords,
    summary: summary.slice(0, 400),
    whenToUse: philosophyText
      ? philosophyText.split("\n")[0]?.trim().slice(0, 200) ?? summary.slice(0, 200)
      : `Invoke ${name} for reviews aligned with their documented philosophy.`,
    sourceFile,
  };
}
