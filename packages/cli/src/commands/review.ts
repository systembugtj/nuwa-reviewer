import {
  collectDiff,
  detectProjectStacks,
  formatReviewError,
  runReview,
  writeFeedbackFile,
  formatNuwaFeedbackSkillTargets,
  writeNuwaFeedbackSkills,
  type PersonaReviewProgress,
  type ReviewScope,
} from "@nuwajs/core";
import { consola } from "consola";
import {
  formatPersonaPrefix,
  formatSdkStatus,
  TaskProgress,
} from "../progress.js";

export interface ReviewCommandOptions {
  path: string;
  scope: ReviewScope;
  target?: string;
  personas?: string[];
  model?: string;
  maxTurns?: number;
  /** Skip writing FEEDBACK.md and skill */
  noWrite?: boolean;
}

function formatPersonaComplete(
  event: Extract<PersonaReviewProgress, { phase: "complete" }>,
): string {
  const prefix = formatPersonaPrefix(
    event.personaId,
    event.index,
    event.total,
  );
  const parts = [
    `${event.findingCount} findings`,
    event.severitySummary,
    event.trendSummary,
    `${event.rounds} rounds`,
  ];
  if (event.verdict) {
    parts.push(event.verdict);
  }
  if (event.meta) {
    parts.push(
      `${event.meta.numTurns} turns`,
      `${(event.meta.durationMs / 1000).toFixed(1)}s`,
      `$${event.meta.totalCostUsd.toFixed(4)}`,
    );
  }
  if (event.errors.length > 0) {
    parts.push(`warn: ${event.errors.join("; ")}`);
  }
  return `${prefix} — ${parts.join(", ")}`;
}

function handleReviewProgress(
  progress: TaskProgress,
  event: PersonaReviewProgress,
): void {
  const prefix = formatPersonaPrefix(
    event.personaId,
    event.index,
    event.total,
  );

  switch (event.phase) {
    case "start":
      progress.update(`${prefix} — starting Claude Agent SDK…`);
      break;
    case "sdk":
      progress.update(`${prefix} — ${formatSdkStatus(event.status)}`);
      break;
    case "failed":
      progress.step(`${prefix} — failed: ${event.message}`);
      break;
    case "complete":
      progress.step(formatPersonaComplete(event));
      break;
    default:
      break;
  }
}

/** Run persona review and emit feedback artifacts */
export async function runReviewCommand(
  options: ReviewCommandOptions,
): Promise<number> {
  const progress = new TaskProgress();
  const { root } = await detectProjectStacks(options.path);

  progress.update(`Collecting ${options.scope} diff…`);

  let diffResult;
  try {
    diffResult = await collectDiff({
      cwd: root,
      scope: options.scope,
      target: options.target,
    });
    progress.step(
      `Diff collected — ${diffResult.files.length} files, ${diffResult.diff.length.toLocaleString()} chars`,
    );
  } catch (error) {
    progress.fail("Failed to collect diff");
    consola.error(formatReviewError(error));
    return 1;
  }

  if (!diffResult.diff.trim()) {
    consola.warn("Empty diff — nothing to review.");
    return 0;
  }

  const personaList = options.personas?.length
    ? options.personas
    : undefined;

  progress.update("Starting persona reviews…");

  let result;
  try {
    result = await runReview({
      projectRoot: root,
      diffResult,
      personas: personaList,
      model: options.model,
      maxTurns: options.maxTurns,
      onPersonaProgress: (event) => handleReviewProgress(progress, event),
    });
    const trendLine = result.trend
      ? ` · ${result.trend.direction}`
      : "";
    progress.done(
      `All reviews complete — ${result.findings.length} findings from ${result.personas.length} personas${trendLine}`,
    );
  } catch (error) {
    progress.fail("Review failed");
    consola.error(formatReviewError(error));
    return 1;
  }

  const hadPersonaErrors = result.rawReviews.some(
    (r) => r.errors && r.errors.length > 0,
  );
  if (hadPersonaErrors) {
    consola.warn(
      "Some personas reported errors — see FEEDBACK.md or re-run with higher `review.maxTurns` in `.nuwa/config.json`.",
    );
  }

  if (options.noWrite) {
    consola.log(result.summary);
    return hadPersonaErrors ? 1 : 0;
  }

  progress.update("Writing FEEDBACK.md…");
  const feedbackPath = await writeFeedbackFile({
    projectRoot: root,
    result,
    rawReviews: result.rawReviews,
  });
  progress.step(`Wrote ${feedbackPath}`);

  progress.update("Writing nuwa-feedback skills for AI tools…");
  const skillPaths = await writeNuwaFeedbackSkills(root);
  progress.step(
    `Wrote nuwa-feedback to ${skillPaths.all.length} paths (canonical: ${skillPaths.canonical})`,
  );
  progress.done(`Tools: ${formatNuwaFeedbackSkillTargets()}`);

  consola.info(
    "Invoke nuwa-feedback in your editor — /nuwa-feedback or ask to address FEEDBACK.md.",
  );

  return hadPersonaErrors ? 1 : 0;
}
