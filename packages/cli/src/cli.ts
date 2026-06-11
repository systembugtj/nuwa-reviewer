#!/usr/bin/env node
import { Command } from "commander";
import { detectProjectStacks } from "@nuwajs/core";
import { listPersonaIds } from "@nuwajs/persona";
import { consola } from "consola";
import { runIndexCommand } from "./commands/index-cmd.js";
import { runInitCommand } from "./commands/init.js";
import { runMcpCommand } from "./commands/mcp.js";
import { runReviewCommand } from "./commands/review.js";

const program = new Command();

program
  .name("nuwa")
  .description("Nuwa — role-play review CLI (review anything)")
  .version("0.1.0");

program
  .command("init")
  .description("Detect project type and deploy personas to .nuwa/persona")
  .argument("[path]", "project directory", process.cwd())
  .option("--offline", "use heuristic index only (skip ~/.nuwa embeddings)")
  .action(async (path: string, opts: { offline?: boolean }) => {
    await runInitCommand({ path, offline: opts.offline });
  });

program
  .command("index")
  .description("Sync project index.json from ~/.nuwa/persona-index.json")
  .argument("[path]", "project directory", process.cwd())
  .option("--offline", "use heuristic index only")
  .action(async (path: string, opts: { offline?: boolean }) => {
    await runIndexCommand({ path, offline: opts.offline });
  });

program
  .command("precompute-index")
  .description("Build ~/.nuwa/persona-index.json with embedding model")
  .option("--offline", "heuristic only, no model download")
  .option("--force", "rebuild even if hash matches")
  .action(async (opts: { offline?: boolean; force?: boolean }) => {
    const { consola } = await import("consola");
    const { default: ora } = await import("ora");
    const { runPrecomputeIndex } = await import("@nuwajs/core");
    const spinner = ora(
      opts.offline
        ? "Building heuristic persona index…"
        : "Building persona index (embedding model)…",
    ).start();
    try {
      const { storageInit } = await runPrecomputeIndex({
        offline: opts.offline,
        force: opts.force,
      });
      spinner.succeed("Persona index ready at ~/.nuwa/persona-index.json");
      if (storageInit.created) {
        consola.info(
          `Initialized global storage (index: ${storageInit.home}, models: ${storageInit.modelsDir})`,
        );
      }
    } catch (error) {
      spinner.fail("Precompute index failed");
      throw error;
    }
    consola.info("Run `nuwa init` in a project to deploy personas.");
  });

program
  .command("review")
  .description("Review changes using deployed personas (Claude Agent SDK)")
  .argument("[path]", "project directory", process.cwd())
  .option("--staged", "review staged changes")
  .option("--unstaged", "review unstaged changes")
  .option("--commit <sha>", "review a specific commit")
  .option("--pr [number]", "review a pull request (default: current branch PR)")
  .option("--persona <id>", "review with specific persona (repeatable)", collect, [] as string[])
  .option("--model <model>", "Claude model id")
  .option(
    "--max-turns <n>",
    "max SDK turns per persona (overrides .nuwa/config.json, default 20)",
  )
  .option("--no-write", "skip FEEDBACK.md and skill generation")
  .action(
    async (
      path: string,
      opts: {
        staged?: boolean;
        unstaged?: boolean;
        commit?: string;
        pr?: string | boolean;
        persona: string[];
        model?: string;
        maxTurns?: string;
        write: boolean;
      },
    ) => {
      const scope = resolveReviewScope(opts);
      const prTarget =
        opts.pr === true ? "current" : typeof opts.pr === "string" ? opts.pr : undefined;

      const exitCode = await runReviewCommand({
        path,
        scope,
        target: opts.commit ?? prTarget,
        personas: opts.persona.length > 0 ? opts.persona : undefined,
        model: opts.model,
        maxTurns: opts.maxTurns
          ? Number.parseInt(opts.maxTurns, 10)
          : undefined,
        noWrite: !opts.write,
      });
      process.exitCode = exitCode;
    },
  );

program
  .command("detect")
  .description("Detect project stacks from manifest files")
  .argument("[path]", "project directory", process.cwd())
  .action(async (path: string) => {
    const { root, stacks } = await detectProjectStacks(path);
    consola.info(`root: ${root}`);
    consola.info(`stacks: ${stacks.join(", ")}`);
  });

program
  .command("personas")
  .description("List bundled persona definitions")
  .action(async () => {
    const ids = await listPersonaIds();
    for (const id of ids) {
      consola.log(id);
    }
  });

program
  .command("mcp")
  .description(
    "Run Nuwa as a stdio MCP server (Claude Code: nuwa_init, nuwa_review, …)",
  )
  .action(async () => {
    await runMcpCommand();
  });

program.parse();

function collect(value: string, previous: string[]): string[] {
  return [...previous, value];
}

function resolveReviewScope(opts: {
  staged?: boolean;
  unstaged?: boolean;
  commit?: string;
  pr?: string | boolean;
}): "staged" | "unstaged" | "commit" | "pr" {
  const flags = [
    opts.staged,
    opts.unstaged,
    Boolean(opts.commit),
    opts.pr !== undefined,
  ].filter(Boolean);

  if (flags.length > 1) {
    throw new Error("Use only one of --staged, --unstaged, --commit, --pr");
  }
  if (opts.staged) return "staged";
  if (opts.unstaged) return "unstaged";
  if (opts.commit) return "commit";
  if (opts.pr !== undefined) return "pr";
  return "unstaged";
}
