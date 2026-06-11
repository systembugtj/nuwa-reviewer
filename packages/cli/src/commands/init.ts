import { getNuwaPersonaIndexPath, initProject } from "@nuwajs/core";
import { writeNuwaMcpConfig } from "@nuwajs/mcp";
import { consola } from "consola";
import { TaskProgress } from "../progress.js";

export interface InitCommandOptions {
  path: string;
  offline?: boolean;
}

/** Initialize .nuwa/persona for a target project */
export async function runInitCommand(
  options: InitCommandOptions,
): Promise<void> {
  const progress = new TaskProgress();
  progress.update("Detecting project stacks…");

  try {
    const result = await initProject(options.path, {
      offline: options.offline ?? false,
      onProgress: (event) => {
        switch (event.phase) {
          case "detect":
            progress.step(
              `Detected stacks: ${event.stacks.join(", ")} @ ${event.projectRoot}`,
            );
            break;
          case "deploy":
            progress.step(
              `Deployed [${event.index}/${event.total}] ${event.personaId}.md`,
            );
            break;
          case "index":
            progress.step(`Wrote index.json (${event.count} personas)`);
            break;
          case "config":
            progress.step(`Wrote ${event.path}`);
            break;
          default:
            break;
        }
      },
    });

    progress.update("Writing Claude MCP config (.mcp.json)…");
    const mcpConfigPath = await writeNuwaMcpConfig(result.projectRoot);
    progress.step(`Wrote ${mcpConfigPath}`);

    progress.done("Nuwa initialized");

    consola.info(`Project root: ${result.projectRoot}`);
    consola.info(`Stacks: ${result.stacks.join(", ")}`);
    consola.info(
      `Personas (${result.personas.length}): ${result.personas.join(", ")}`,
    );
    consola.info(`Global index: ${getNuwaPersonaIndexPath()}`);
    consola.info(
      "Claude Code: nuwa MCP server registered in .mcp.json — use /mcp or ask Claude to run nuwa_init / nuwa_review.",
    );
  } catch (error) {
    progress.fail("Init failed");
    throw error;
  }
}
