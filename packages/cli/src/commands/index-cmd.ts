import {
  detectProjectStacks,
  getNuwaPersonaIndexPath,
  regeneratePersonaIndex,
} from "@nuwajs/core";
import { consola } from "consola";
import { TaskProgress } from "../progress.js";

export interface IndexCommandOptions {
  path: string;
  offline?: boolean;
}

/** Sync project index.json from ~/.nuwa/persona-index.json */
export async function runIndexCommand(
  options: IndexCommandOptions,
): Promise<void> {
  const progress = new TaskProgress();
  const { root } = await detectProjectStacks(options.path);

  progress.update(`Syncing persona index from ${getNuwaPersonaIndexPath()}…`);

  try {
    const index = await regeneratePersonaIndex(root, {
      offline: options.offline ?? false,
      onProgress: (event) => {
        progress.update(
          `Indexing [${event.index}/${event.total}] ${event.personaId}…`,
        );
      },
    });

    progress.done(`Indexed ${index.length} personas`);

    for (const entry of index) {
      consola.log(`  • ${entry.id}: ${entry.summary.slice(0, 60)}…`);
    }
  } catch (error) {
    progress.fail("Index sync failed");
    throw error;
  }
}
