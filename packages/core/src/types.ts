import type { ReviewTrend, SeverityCount } from "./review/severity.js";
import type { ReviewRoundLog, ReviewSdkTraceEvent } from "./review/trace.js";

/** Detected project stack signals */
export type ProjectStack =
  | "node"
  | "rust"
  | "python"
  | "go"
  | "java"
  | "swift"
  | "css"
  | "react"
  | "vue"
  | "svelte"
  | "nextjs"
  | "docs"
  | "monorepo"
  | "unknown";

/** Review target scope */
export type ReviewScope = "staged" | "unstaged" | "commit" | "pr";

/** Persona index entry stored in .nuwa/persona/index.json */
export interface PersonaIndexEntry {
  id: string;
  name: string;
  expertise: string[];
  keywords: string[];
  summary: string;
  whenToUse: string;
  sourceFile: string;
}

/** Review settings stored in `.nuwa/config.json` */
export interface NuwaReviewConfig {
  /** Claude model id for `nuwa review` */
  model?: string;
  /** Max SDK turns per persona (default 20) */
  maxTurns?: number;
  /** Keep reviewing other personas when one fails (default true) */
  continueOnError?: boolean;
  /** Truncate diff beyond this many chars in the prompt */
  maxDiffChars?: number;
}

/** Nuwa project configuration */
export interface NuwaConfig {
  version: string;
  projectRoot: string;
  stacks: ProjectStack[];
  personas: string[];
  review?: NuwaReviewConfig;
  createdAt: string;
  updatedAt: string;
}

/** User-wide settings in `~/.nuwa/settings.json` */
export interface NuwaGlobalSettings {
  version?: string;
  review?: NuwaReviewConfig;
}

/** Single finding from a persona review */
export interface ReviewFinding {
  personaId: string;
  severity: "critical" | "high" | "medium" | "low" | "info";
  file?: string;
  line?: number;
  title: string;
  description: string;
  suggestion: string;
}

/** Aggregated review result */
export interface ReviewResult {
  scope: ReviewScope;
  target: string;
  personas: string[];
  findings: ReviewFinding[];
  summary: string;
  reviewedAt: string;
}

/** SDK run metadata for one persona review */
export interface PersonaReviewMeta {
  durationMs: number;
  durationApiMs: number;
  numTurns: number;
  totalCostUsd: number;
  stopReason: string | null;
  sessionId: string;
}

/** Verdict from persona review markdown */
export type ReviewVerdict = "approve" | "request-changes" | "block";

/** Parsed structured sections from persona review markdown */
export interface PersonaReviewStructured {
  verdict?: ReviewVerdict;
  rounds: ReviewRoundLog[];
  severity: SeverityCount;
  trend?: ReviewTrend;
  trendNarrative?: string;
}

/** Per-persona raw review output */
export interface PersonaReviewOutput {
  personaId: string;
  markdown: string;
  findings: ReviewFinding[];
  structured?: PersonaReviewStructured;
  trace?: ReviewSdkTraceEvent[];
  meta?: PersonaReviewMeta;
  errors?: string[];
}

/** Review result with raw persona markdown attached */
export interface ReviewRunResult extends ReviewResult {
  rawReviews: PersonaReviewOutput[];
  aggregateSeverity?: SeverityCount;
  trend?: ReviewTrend;
  historyPath?: string;
}
