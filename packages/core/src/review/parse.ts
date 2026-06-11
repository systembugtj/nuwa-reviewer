import type {
  PersonaReviewStructured,
  ReviewFinding,
  ReviewVerdict,
} from "../types.js";
import {
  compareSeverityCounts,
  countFindingsBySeverity,
  mergeSeverityCount,
  type SeverityCount,
} from "./severity.js";
import type { ReviewHistoryRecord } from "./trace.js";
import type { ReviewRoundLog } from "./trace.js";

const FINDING_PATTERN =
  /\*\*\[(critical|high|medium|low|info)\]\*\*\s*(.+?)(?:\s*—\s*(.+?))?(?:\n|$)/gi;

/** Extract a markdown section body by heading name (case-insensitive) */
export function extractMarkdownSection(
  markdown: string,
  heading: string,
): string {
  const pattern = new RegExp(
    `##\\s*${heading}\\s*\\n+([\\s\\S]*?)(?=\\n##\\s|$)`,
    "i",
  );
  return pattern.exec(markdown)?.[1]?.trim() ?? "";
}

/** Parse findings from persona review markdown */
export function parseFindingsFromMarkdown(
  personaId: string,
  markdown: string,
): ReviewFinding[] {
  const findings: ReviewFinding[] = [];
  const lines = markdown.split("\n");

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] ?? "";
    const match =
      /^(?:-\s*)?\*\*\[(critical|high|medium|low|info)\]\*\*\s*(.+)$/.exec(
        line,
      );
    if (!match) {
      continue;
    }

    const severity = match[1] as ReviewFinding["severity"];
    let rest = match[2]?.trim() ?? "";
    let file: string | undefined;
    let lineNum: number | undefined;

    const locationMatch = rest.match(/(.+?)\s*[-—]\s*(.+)$/);
    if (locationMatch) {
      rest = locationMatch[1]?.trim() ?? rest;
      const loc = locationMatch[2]?.trim() ?? "";
      const fileLine = loc.match(/^(.+?):(\d+)$/);
      if (fileLine) {
        file = fileLine[1];
        lineNum = Number.parseInt(fileLine[2] ?? "", 10);
      } else {
        file = loc;
      }
    }

    const descriptionLines: string[] = [];
    let j = i + 1;
    while (j < lines.length) {
      const next = lines[j] ?? "";
      if (next.startsWith("**[") || next.startsWith("## ")) {
        break;
      }
      if (next.trim()) {
        descriptionLines.push(next.trim());
      }
      j++;
    }

    findings.push({
      personaId,
      severity,
      file,
      line: lineNum,
      title: rest,
      description: descriptionLines[0] ?? "",
      suggestion:
        descriptionLines.slice(1).join(" ") ||
        (descriptionLines[0] ?? ""),
    });

    i = j - 1;
  }

  if (findings.length === 0) {
    let m: RegExpExecArray | null;
    FINDING_PATTERN.lastIndex = 0;
    while ((m = FINDING_PATTERN.exec(markdown)) !== null) {
      findings.push({
        personaId,
        severity: m[1] as ReviewFinding["severity"],
        title: m[2]?.trim() ?? "Finding",
        file: m[3]?.trim(),
        description: "",
        suggestion: "",
      });
    }
  }

  return findings;
}

/** Extract summary section from review markdown */
export function extractSummary(markdown: string): string {
  return extractMarkdownSection(markdown, "Summary") || markdown.slice(0, 500).trim();
}

/** Parse verdict from ## Verdict section */
export function parseVerdict(markdown: string): ReviewVerdict | undefined {
  const section = extractMarkdownSection(markdown, "Verdict").toLowerCase();
  if (section.includes("block")) {
    return "block";
  }
  if (section.includes("request-changes") || section.includes("request changes")) {
    return "request-changes";
  }
  if (section.includes("approve")) {
    return "approve";
  }
  return undefined;
}

/** Parse severity table from ## Severity Scorecard */
export function parseSeverityScorecard(markdown: string): Partial<SeverityCount> {
  const section = extractMarkdownSection(markdown, "Severity Scorecard");
  if (!section) {
    return {};
  }

  const counts: Partial<SeverityCount> = {};
  for (const line of section.split("\n")) {
    const match = /\|\s*(critical|high|medium|low|info)\s*\|\s*(\d+)\s*\|/i.exec(
      line,
    );
    if (match) {
      counts[match[1] as keyof SeverityCount] = Number.parseInt(match[2] ?? "0", 10);
    }
  }
  return counts;
}

/** Parse ## Review Rounds into structured round logs */
export function parseReviewRounds(markdown: string): ReviewRoundLog[] {
  const section = extractMarkdownSection(markdown, "Review Rounds");
  if (!section) {
    return [];
  }

  const rounds: ReviewRoundLog[] = [];
  const blocks = section.split(/(?=###\s+Round\s+\d+)/i);

  for (const block of blocks) {
    const header = /###\s+Round\s+(\d+)/i.exec(block);
    if (!header) {
      continue;
    }

    const action =
      /\*\*Action:\*\*\s*(.+)/i.exec(block)?.[1]?.trim() ??
      block.split("\n").find((l) => l.trim() && !l.startsWith("#"))?.trim() ??
      "review step";

    rounds.push({
      round: Number.parseInt(header[1] ?? "0", 10),
      action,
      observation: /\*\*Observation:\*\*\s*(.+)/i.exec(block)?.[1]?.trim(),
      findingsTally: /\*\*Findings so far:\*\*\s*(.+)/i.exec(block)?.[1]?.trim(),
    });
  }

  return rounds.sort((a, b) => a.round - b.round);
}

/** Parse trend narrative from ## Trend section */
export function parseTrendNarrative(markdown: string): string | undefined {
  const section = extractMarkdownSection(markdown, "Trend");
  return section || undefined;
}

/** Build full structured output from markdown + findings */
export function parseStructuredReview(
  personaId: string,
  markdown: string,
  findings: ReviewFinding[],
  previous?: ReviewHistoryRecord | null,
): PersonaReviewStructured {
  const computed = countFindingsBySeverity(findings);
  const parsedScorecard = parseSeverityScorecard(markdown);
  const severity = mergeSeverityCount(parsedScorecard, computed);

  const previousSeverity = previous?.personas[personaId] ?? previous?.aggregate;
  const trend = compareSeverityCounts(previousSeverity, severity);

  return {
    verdict: parseVerdict(markdown),
    rounds: parseReviewRounds(markdown),
    severity,
    trend,
    trendNarrative: parseTrendNarrative(markdown),
  };
}

/** Snippet for live CLI progress from streaming review text */
export function extractProgressSnippet(text: string, maxLen = 72): string {
  const normalized = text.replace(/\s+/g, " ").trim();
  if (!normalized) {
    return "";
  }

  const summaryLine = normalized.match(/##\s*Summary\s*(.+)/i)?.[1]?.trim();
  if (summaryLine) {
    return summaryLine.length > maxLen
      ? `${summaryLine.slice(0, maxLen - 1)}…`
      : summaryLine;
  }

  const lastLine = normalized.split(/(?<=[.!?])\s+/).pop() ?? normalized;
  return lastLine.length > maxLen ? `${lastLine.slice(0, maxLen - 1)}…` : lastLine;
}
