import { readFile } from "node:fs/promises";
import { join } from "node:path";
import {
  collectDiff,
  detectProjectStacks,
  FEEDBACK_FILE,
  formatReviewError,
  initProject,
  readNuwaConfig,
  runReview,
  writeFeedbackFile,
  writeNuwaFeedbackSkills,
  type ReviewScope,
} from "@nuwajs/core";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { listPersonaIds } from "@nuwajs/persona";
import { resolveProjectPath } from "./resolve-path.js";

/** MCP tool text response */
export type McpTextResult = CallToolResult;

function textResult(text: string, isError = false): McpTextResult {
  return {
    content: [{ type: "text", text }],
    ...(isError ? { isError: true } : {}),
  };
}

function jsonResult(data: unknown): McpTextResult {
  return textResult(JSON.stringify(data, null, 2));
}

/** Initialize nuwa for a project (deploy personas + config) */
export async function handleNuwaInit(args: {
  path?: string;
  offline?: boolean;
}): Promise<McpTextResult> {
  const startPath = resolveProjectPath(args.path);

  try {
    const result = await initProject(startPath, {
      offline: args.offline ?? false,
    });

    return jsonResult({
      ok: true,
      projectRoot: result.projectRoot,
      stacks: result.stacks,
      personas: result.personas,
      configPath: result.configPath,
      personaDir: result.personaDir,
      message:
        "Nuwa initialized. Personas deployed to .nuwa/persona. Use nuwa_review to run a review.",
    });
  } catch (error) {
    return textResult(formatReviewError(error), true);
  }
}

/** Detect project stacks from manifest files */
export async function handleNuwaDetect(args: {
  path?: string;
}): Promise<McpTextResult> {
  try {
    const { root, stacks } = await detectProjectStacks(
      resolveProjectPath(args.path),
    );
    return jsonResult({ projectRoot: root, stacks });
  } catch (error) {
    return textResult(formatReviewError(error), true);
  }
}

/** List bundled persona ids and project-deployed personas if initialized */
export async function handleNuwaListPersonas(args: {
  path?: string;
}): Promise<McpTextResult> {
  try {
    const projectRoot = resolveProjectPath(args.path);
    const bundled = await listPersonaIds();
    const config = await readNuwaConfig(projectRoot);

    return jsonResult({
      bundled,
      deployed: config?.personas ?? [],
      initialized: Boolean(config),
    });
  } catch (error) {
    return textResult(formatReviewError(error), true);
  }
}

/** Read FEEDBACK.md from project root */
export async function handleNuwaReadFeedback(args: {
  path?: string;
}): Promise<McpTextResult> {
  const projectRoot = resolveProjectPath(args.path);
  const feedbackPath = join(projectRoot, FEEDBACK_FILE);

  try {
    const content = await readFile(feedbackPath, "utf8");
    if (!content.trim()) {
      return textResult(
        `FEEDBACK.md exists but is empty at ${feedbackPath}. Run nuwa_review first.`,
        true,
      );
    }
    return textResult(content);
  } catch {
    return textResult(
      `No FEEDBACK.md at ${feedbackPath}. Run nuwa_init then nuwa_review.`,
      true,
    );
  }
}

/** Run persona review on git changes */
export async function handleNuwaReview(args: {
  path?: string;
  scope?: ReviewScope;
  target?: string;
  personas?: string[];
  model?: string;
  maxTurns?: number;
  write?: boolean;
}): Promise<McpTextResult> {
  const scope = args.scope ?? "unstaged";
  const writeArtifacts = args.write !== false;

  try {
    const { root } = await detectProjectStacks(resolveProjectPath(args.path));

    const diffResult = await collectDiff({
      cwd: root,
      scope,
      target: args.target,
    });

    if (!diffResult.diff.trim()) {
      return jsonResult({
        ok: true,
        emptyDiff: true,
        scope,
        message: "Empty diff — nothing to review.",
      });
    }

    const result = await runReview({
      projectRoot: root,
      diffResult,
      personas: args.personas?.length ? args.personas : undefined,
      model: args.model,
      maxTurns: args.maxTurns,
    });

    const hadErrors = result.rawReviews.some(
      (r) => r.errors && r.errors.length > 0,
    );

    let feedbackPath: string | undefined;
    let skillCount: number | undefined;

    if (writeArtifacts) {
      feedbackPath = await writeFeedbackFile({
        projectRoot: root,
        result,
        rawReviews: result.rawReviews,
      });
      const skills = await writeNuwaFeedbackSkills(root);
      skillCount = skills.all.length;
    }

    return jsonResult({
      ok: !hadErrors,
      projectRoot: root,
      scope,
      findingCount: result.findings.length,
      personas: result.personas,
      summary: result.summary,
      trend: result.trend,
      feedbackPath,
      skillPathsWritten: skillCount,
      hadPersonaErrors: hadErrors,
      message: writeArtifacts
        ? `Review complete. See ${FEEDBACK_FILE} and invoke nuwa-feedback skill to address findings.`
        : "Review complete (artifacts not written).",
    });
  } catch (error) {
    return textResult(formatReviewError(error), true);
  }
}
