import {
  DEFAULT_REVIEW_MAX_DIFF_CHARS,
  DEFAULT_REVIEW_MAX_TURNS,
  DEFAULT_REVIEW_MODEL,
  NUWA_REVIEW_MAX_TURNS_ENV,
  NUWA_REVIEW_MODEL_ENV,
} from "../constants.js";
import type { NuwaConfig, NuwaReviewConfig } from "../types.js";

/** Default `.nuwa/config.json` → `review` block written on `nuwa init` */
export const DEFAULT_NUWA_REVIEW_CONFIG: NuwaReviewConfig = {
  model: DEFAULT_REVIEW_MODEL,
  maxTurns: DEFAULT_REVIEW_MAX_TURNS,
  continueOnError: true,
  maxDiffChars: DEFAULT_REVIEW_MAX_DIFF_CHARS,
};

/** Fully resolved review settings for one run */
export interface ResolvedReviewSettings {
  model: string;
  maxTurns: number;
  continueOnError: boolean;
  maxDiffChars: number;
}

/** CLI / API overrides (highest precedence after explicit values) */
export interface ReviewSettingsOverrides {
  model?: string;
  maxTurns?: number;
  continueOnError?: boolean;
  maxDiffChars?: number;
}

function positiveInt(value: unknown): number | undefined {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return undefined;
  }
  const rounded = Math.floor(value);
  return rounded > 0 ? rounded : undefined;
}

function parseEnvInt(name: string): number | undefined {
  const raw = process.env[name];
  if (!raw) {
    return undefined;
  }
  const parsed = Number.parseInt(raw, 10);
  return Number.isNaN(parsed) || parsed <= 0 ? undefined : parsed;
}

/**
 * Resolve review settings.
 * Precedence: overrides → env → `.nuwa/config.json` review → defaults.
 */
export function resolveReviewSettings(
  config: NuwaConfig | null,
  overrides: ReviewSettingsOverrides = {},
): ResolvedReviewSettings {
  const fromFile = config?.review ?? {};

  const maxTurns =
    positiveInt(overrides.maxTurns) ??
    parseEnvInt(NUWA_REVIEW_MAX_TURNS_ENV) ??
    positiveInt(fromFile.maxTurns) ??
    DEFAULT_REVIEW_MAX_TURNS;

  const model =
    overrides.model?.trim() ||
    process.env[NUWA_REVIEW_MODEL_ENV]?.trim() ||
    fromFile.model?.trim() ||
    DEFAULT_REVIEW_MODEL;

  const continueOnError =
    overrides.continueOnError ??
    fromFile.continueOnError ??
    DEFAULT_NUWA_REVIEW_CONFIG.continueOnError ??
    true;

  const maxDiffChars =
    positiveInt(overrides.maxDiffChars) ??
    positiveInt(fromFile.maxDiffChars) ??
    DEFAULT_REVIEW_MAX_DIFF_CHARS;

  return {
    model,
    maxTurns,
    continueOnError,
    maxDiffChars,
  };
}

/** Merge saved review config with defaults (for init / migrations) */
export function mergeReviewConfig(
  existing?: NuwaReviewConfig,
): NuwaReviewConfig {
  return {
    ...DEFAULT_NUWA_REVIEW_CONFIG,
    ...existing,
  };
}
