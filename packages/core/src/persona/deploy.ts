import { copyFile, mkdir, readFile, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { getPersonaPath } from "@nuwajs/persona";
import {
  NUWA_CONFIG_FILE,
  NUWA_DIR,
  NUWA_PERSONA_DIR,
  PERSONA_INDEX_FILE,
} from "../constants.js";
import { detectProjectStacks } from "../project/detect.js";
import type { NuwaConfig, PersonaIndexEntry, ProjectStack } from "../types.js";
import { generatePersonaIndex, type GenerateIndexOptions } from "./index-generator.js";
import { mergeReviewConfig } from "../review/config.js";
import { selectPersonasForStacks } from "./mapping.js";

export type InitProgressEvent =
  | { phase: "detect"; projectRoot: string; stacks: ProjectStack[] }
  | {
      phase: "deploy";
      personaId: string;
      index: number;
      total: number;
    }
  | { phase: "index"; count: number }
  | { phase: "config"; path: string };

export interface InitOptions extends GenerateIndexOptions {
  /** Override auto-selected persona ids */
  personas?: string[];
  onProgress?: (event: InitProgressEvent) => void;
}

export interface InitResult {
  projectRoot: string;
  stacks: ProjectStack[];
  personas: string[];
  configPath: string;
  personaDir: string;
  index: PersonaIndexEntry[];
}

/** Read existing nuwa config if present */
export async function readNuwaConfig(
  projectRoot: string,
): Promise<NuwaConfig | null> {
  try {
    const raw = await readFile(join(projectRoot, NUWA_CONFIG_FILE), "utf8");
    return JSON.parse(raw) as NuwaConfig;
  } catch {
    return null;
  }
}

/**
 * Deploy personas and index into `<detected-root>/.nuwa/persona`.
 * Walks up from `startDir` via `detectProjectStacks` to find the project root
 * (e.g. monorepo root when init from `apps/web` without a local package.json).
 */
export async function initProject(
  startDir: string,
  options: InitOptions = {},
): Promise<InitResult> {
  const { root: projectRoot, stacks } = await detectProjectStacks(
    resolve(startDir),
  );
  options.onProgress?.({ phase: "detect", projectRoot, stacks });

  const personaIds = options.personas ?? selectPersonasForStacks(stacks);
  const personaDir = join(projectRoot, NUWA_PERSONA_DIR);
  const nuwaDir = join(projectRoot, NUWA_DIR);

  await mkdir(personaDir, { recursive: true });

  const index: PersonaIndexEntry[] = [];

  for (let i = 0; i < personaIds.length; i++) {
    const id = personaIds[i]!;
    options.onProgress?.({
      phase: "deploy",
      personaId: id,
      index: i + 1,
      total: personaIds.length,
    });

    const sourcePath = getPersonaPath(id);
    const destFile = `${id}.md`;
    const destPath = join(personaDir, destFile);
    const content = await readFile(sourcePath, "utf8");
    await copyFile(sourcePath, destPath);

    const entry = await generatePersonaIndex(id, content, destFile, options);
    index.push(entry);
  }

  options.onProgress?.({ phase: "index", count: index.length });

  await writeFile(
    join(personaDir, PERSONA_INDEX_FILE),
    `${JSON.stringify(index, null, 2)}\n`,
    "utf8",
  );

  const now = new Date().toISOString();
  const existing = await readNuwaConfig(projectRoot);
  const config: NuwaConfig = {
    version: "1",
    projectRoot,
    stacks,
    personas: personaIds,
    review: mergeReviewConfig(existing?.review),
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  };

  await mkdir(nuwaDir, { recursive: true });
  const configPath = join(projectRoot, NUWA_CONFIG_FILE);
  await writeFile(configPath, `${JSON.stringify(config, null, 2)}\n`, "utf8");
  options.onProgress?.({ phase: "config", path: configPath });

  return {
    projectRoot,
    stacks,
    personas: personaIds,
    configPath,
    personaDir,
    index,
  };
}

export type IndexProgressEvent = {
  phase: "persona";
  personaId: string;
  index: number;
  total: number;
};

export interface RegenerateIndexOptions extends GenerateIndexOptions {
  onProgress?: (event: IndexProgressEvent) => void;
}

/** Regenerate index.json for already-deployed personas */
export async function regeneratePersonaIndex(
  projectRoot: string,
  options: RegenerateIndexOptions = {},
): Promise<PersonaIndexEntry[]> {
  const config = await readNuwaConfig(projectRoot);
  if (!config) {
    throw new Error(`No ${NUWA_CONFIG_FILE} found. Run \`nuwa init\` first.`);
  }

  const personaDir = join(projectRoot, NUWA_PERSONA_DIR);
  const index: PersonaIndexEntry[] = [];

  for (let i = 0; i < config.personas.length; i++) {
    const id = config.personas[i]!;
    options.onProgress?.({
      phase: "persona",
      personaId: id,
      index: i + 1,
      total: config.personas.length,
    });

    const sourceFile = `${id}.md`;
    const content = await readFile(join(personaDir, sourceFile), "utf8");
    const entry = await generatePersonaIndex(id, content, sourceFile, options);
    index.push(entry);
  }

  await writeFile(
    join(personaDir, PERSONA_INDEX_FILE),
    `${JSON.stringify(index, null, 2)}\n`,
    "utf8",
  );

  return index;
}
