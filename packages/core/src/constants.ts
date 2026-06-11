import { NUWA_PROJECT_DIR } from "./paths.js";

/** Project-local nuwa directory (relative to repo root) */
export const NUWA_DIR = NUWA_PROJECT_DIR;

/** Deployed persona directory relative to project root */
export const NUWA_PERSONA_DIR = `${NUWA_DIR}/persona`;

/** Persona index manifest filename in project .nuwa/persona */
export const PERSONA_INDEX_FILE = "index.json";

/** Project-level nuwa config */
export const NUWA_CONFIG_FILE = `${NUWA_DIR}/config.json`;

/** Review output consumed by AI tools */
export const FEEDBACK_FILE = "FEEDBACK.md";

/** Project-local review history directory */
export const NUWA_REVIEW_HISTORY_DIR = `${NUWA_DIR}/reviews`;

/** Latest review snapshot for trend comparison */
export const NUWA_REVIEW_LATEST_FILE = `${NUWA_REVIEW_HISTORY_DIR}/latest.json`;

/** Canonical nuwa-feedback skill (source of truth under .nuwa) */
export const NUWA_CANONICAL_FEEDBACK_SKILL_DIR = `${NUWA_DIR}/skills/nuwa-feedback`;

/** Cursor skill directory (project-scoped) */
export const NUWA_CURSOR_FEEDBACK_SKILL_DIR = ".cursor/skills/nuwa-feedback";

/** Claude Code skill directory (project-scoped) */
export const NUWA_CLAUDE_FEEDBACK_SKILL_DIR = ".claude/skills/nuwa-feedback";

/** @deprecated Use NUWA_CURSOR_FEEDBACK_SKILL_DIR */
export const NUWA_FEEDBACK_SKILL_DIR = NUWA_CURSOR_FEEDBACK_SKILL_DIR;

/** Supported AI tool deployment targets for nuwa-feedback */
export const NUWA_FEEDBACK_SKILL_TARGETS = [
  {
    id: "canonical",
    label: "Nuwa (.nuwa/skills)",
    relativeFile: `${NUWA_DIR}/skills/nuwa-feedback/SKILL.md`,
  },
  {
    id: "cursor",
    label: "Cursor",
    relativeFile: ".cursor/skills/nuwa-feedback/SKILL.md",
  },
  {
    id: "claude",
    label: "Claude Code",
    relativeFile: ".claude/skills/nuwa-feedback/SKILL.md",
  },
  {
    id: "windsurf",
    label: "Windsurf",
    relativeFile: ".windsurf/rules/nuwa-feedback.md",
  },
  {
    id: "continue",
    label: "Continue",
    relativeFile: ".continue/rules/nuwa-feedback.md",
  },
  {
    id: "copilot",
    label: "GitHub Copilot",
    relativeFile: ".github/instructions/nuwa-feedback.instructions.md",
  },
  {
    id: "cline",
    label: "Cline",
    relativeFile: ".clinerules/nuwa-feedback.md",
  },
  {
    id: "roo",
    label: "Roo Code",
    relativeFile: ".roo/rules/nuwa-feedback.md",
  },
  {
    id: "openhands",
    label: "OpenHands",
    relativeFile: ".openhands/microagents/nuwa-feedback.md",
  },
  {
    id: "agents",
    label: "AGENTS.nuwa-feedback.md",
    relativeFile: "AGENTS.nuwa-feedback.md",
  },
] as const;

export type NuwaFeedbackSkillTargetId =
  (typeof NUWA_FEEDBACK_SKILL_TARGETS)[number]["id"];

/**
 * Small embedding model for persona index precomputation (~23 MB ONNX).
 * Cached under $XDG_CACHE_HOME/nuwa/models on first `pnpm precompute-index`.
 */
/** Re-exported from @nuwajs/persona for convenience */
export { EMBEDDING_MODEL as DEFAULT_EMBEDDING_MODEL } from "@nuwajs/persona";

/** Environment variable for Anthropic API key (Claude Agent SDK) */
export const ANTHROPIC_API_KEY_ENV = "ANTHROPIC_API_KEY";

/** Default Claude model for persona reviews */
export const DEFAULT_REVIEW_MODEL = "claude-sonnet-4-20250514";

/** Default max agent turns per persona review (tool calls + responses) */
export const DEFAULT_REVIEW_MAX_TURNS = 20;

/** Max diff chars included in review prompt */
export const DEFAULT_REVIEW_MAX_DIFF_CHARS = 80_000;

/** Override max turns: `NUWA_REVIEW_MAX_TURNS=25` */
export const NUWA_REVIEW_MAX_TURNS_ENV = "NUWA_REVIEW_MAX_TURNS";

/** Override model: `NUWA_REVIEW_MODEL=claude-opus-4-6` */
export const NUWA_REVIEW_MODEL_ENV = "NUWA_REVIEW_MODEL";
