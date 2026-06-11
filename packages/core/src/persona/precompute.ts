/**
 * Precompute persona indexes with a small embedding model.
 * Writes ~/.nuwa/persona-index.json; optionally syncs bundled fallback (monorepo build).
 */
import { access, copyFile, mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { pipeline, env } from "@huggingface/transformers";
import {
  EMBEDDING_MODEL,
  EXPERTISE_PROBES,
  getPersonaPath,
  hashPersonaSources,
  listPersonaIds,
  type PersonaIndexRecord,
  type PrecomputedIndexManifest,
} from "@nuwajs/persona";
import {
  ensureNuwaHome,
  getNuwaModelsDir,
  getNuwaPersonaIndexPath,
} from "../paths.js";
import { buildHeuristicPersonaIndex } from "./heuristic-index.js";

type FeaturePipeline = Awaited<
  ReturnType<typeof pipeline<"feature-extraction">>
>;

export interface PrecomputeIndexOptions {
  force?: boolean;
  check?: boolean;
  ifMissing?: boolean;
  offline?: boolean;
  /** When set, also write/sync persona/index.precomputed.json (monorepo build) */
  bundledFallbackPath?: string;
}

/** Check whether a manifest matches current persona sources */
export function isManifestCurrent(
  manifest: PrecomputedIndexManifest | null,
  personasHash: string,
  personaCount: number,
): boolean {
  return (
    manifest?.personasHash === personasHash &&
    manifest.entries.length === personaCount
  );
}

function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    const av = a[i] ?? 0;
    const bv = b[i] ?? 0;
    dot += av * bv;
    normA += av * av;
    normB += bv * bv;
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  return denom === 0 ? 0 : dot / denom;
}

async function embedText(
  extractor: FeaturePipeline,
  text: string,
): Promise<number[]> {
  const output = await extractor(text, {
    pooling: "mean",
    normalize: true,
  });
  return Array.from(output.data as Float32Array);
}

function rankExpertise(
  docEmbedding: number[],
  probeEmbeddings: Map<string, number[]>,
  limit = 5,
): string[] {
  const scores = [...probeEmbeddings.entries()]
    .map(([tag, vector]) => ({
      tag,
      score: cosineSimilarity(docEmbedding, vector),
    }))
    .sort((a, b) => b.score - a.score);

  return scores.slice(0, limit).map((s) => s.tag);
}

function extractEmbedText(content: string): string {
  const sections = [
    content.match(/##\s*角色定义\s*\n+([\s\S]*?)(?=\n##|\n$)/)?.[1],
    content.match(/##\s*[^#\n]*哲学[^#\n]*\s*\n+([\s\S]*?)(?=\n##|\n$)/i)?.[1],
  ]
    .filter(Boolean)
    .join("\n");

  return (sections || content).slice(0, 4000);
}

async function fileExists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

async function loadExistingManifest(
  path: string,
): Promise<PrecomputedIndexManifest | null> {
  try {
    const raw = await readFile(path, "utf8");
    return JSON.parse(raw) as PrecomputedIndexManifest;
  } catch {
    return null;
  }
}

async function syncIndexCopies(
  globalPath: string,
  bundledPath: string,
  globalOk: boolean,
  bundledOk: boolean,
): Promise<void> {
  if (globalOk && !bundledOk) {
    await mkdir(dirname(bundledPath), { recursive: true });
    await copyFile(globalPath, bundledPath);
    console.log(`✓ Synced bundled fallback: ${bundledPath}`);
  } else if (!globalOk && bundledOk) {
    await copyFile(bundledPath, globalPath);
    console.log(`✓ Synced global index: ${globalPath}`);
  }
}

async function writeManifest(
  entries: PersonaIndexRecord[],
  personasHash: string,
  globalPath: string,
  model: string,
  bundledFallbackPath?: string,
): Promise<void> {
  const manifest: PrecomputedIndexManifest = {
    version: "1",
    model,
    generatedAt: new Date().toISOString(),
    personasHash,
    storagePath: globalPath,
    entries,
  };

  const json = `${JSON.stringify(manifest, null, 2)}\n`;
  await writeFile(globalPath, json, "utf8");

  if (bundledFallbackPath) {
    await mkdir(dirname(bundledFallbackPath), { recursive: true });
    await writeFile(bundledFallbackPath, json, "utf8");
  }
}

async function buildOfflineIndex(
  ids: string[],
  personasHash: string,
  globalPath: string,
  bundledFallbackPath?: string,
): Promise<void> {
  const entries: PersonaIndexRecord[] = [];
  for (const id of ids) {
    const sourceFile = `${id}.md`;
    const content = await readFile(getPersonaPath(id), "utf8");
    entries.push(buildHeuristicPersonaIndex(id, content, sourceFile));
    console.log(`  indexed (offline): ${id}`);
  }

  await writeManifest(
    entries,
    personasHash,
    globalPath,
    "heuristic",
    bundledFallbackPath,
  );
}

async function buildEmbeddingIndex(
  ids: string[],
  personasHash: string,
  globalPath: string,
  bundledFallbackPath?: string,
): Promise<void> {
  console.log(`Loading embedding model: ${EMBEDDING_MODEL}`);
  console.log(`Model cache: ${getNuwaModelsDir()}`);

  const extractor = await pipeline("feature-extraction", EMBEDDING_MODEL);

  const probeEmbeddings = new Map<string, number[]>();
  for (const [tag, text] of Object.entries(EXPERTISE_PROBES)) {
    probeEmbeddings.set(tag, await embedText(extractor, text));
  }

  const entries: PersonaIndexRecord[] = [];

  for (const id of ids) {
    const sourceFile = `${id}.md`;
    const content = await readFile(getPersonaPath(id), "utf8");
    const base = buildHeuristicPersonaIndex(id, content, sourceFile);
    const embeddingSource = extractEmbedText(content);
    const embedding = await embedText(extractor, embeddingSource);
    const expertise = rankExpertise(embedding, probeEmbeddings);

    entries.push({
      ...base,
      expertise: expertise.length > 0 ? expertise : base.expertise,
      embedding,
    });

    console.log(`  indexed: ${id}`);
  }

  await writeManifest(
    entries,
    personasHash,
    globalPath,
    EMBEDDING_MODEL,
    bundledFallbackPath,
  );
  console.log(`✓ Wrote ${globalPath}`);
  if (bundledFallbackPath) {
    console.log(`✓ Wrote bundled fallback ${bundledFallbackPath}`);
  }
}

/** Build or refresh ~/.nuwa/persona-index.json from bundled persona markdown */
export async function runPrecomputeIndex(
  options: PrecomputeIndexOptions = {},
): Promise<void> {
  const offline =
    options.offline ?? process.env.NUWA_INDEX_OFFLINE === "1";
  const bundledPath = options.bundledFallbackPath;

  await ensureNuwaHome();
  env.cacheDir = getNuwaModelsDir();
  env.allowLocalModels = true;

  const ids = await listPersonaIds();
  const personasHash = await hashPersonaSources(ids);
  const globalPath = getNuwaPersonaIndexPath();

  const globalManifest = (await fileExists(globalPath))
    ? await loadExistingManifest(globalPath)
    : null;
  const bundledManifest =
    bundledPath && (await fileExists(bundledPath))
      ? await loadExistingManifest(bundledPath)
      : null;

  const globalOk = isManifestCurrent(globalManifest, personasHash, ids.length);
  const bundledOk =
    bundledManifest !== null &&
    isManifestCurrent(bundledManifest, personasHash, ids.length);

  if (!options.force && (globalOk || bundledOk)) {
    if (bundledPath) {
      await syncIndexCopies(globalPath, bundledPath, globalOk, bundledOk);
    }
    console.log(`✓ Persona index up to date: ${globalPath}`);
    return;
  }

  if (options.check) {
    console.log("Persona index stale or missing — run precompute-index");
    process.exit(1);
  }

  if (options.ifMissing) {
    console.log("Persona index missing or stale — computing…");
  }

  const bundledWritePath = bundledPath;

  if (offline) {
    await buildOfflineIndex(ids, personasHash, globalPath, bundledWritePath);
    console.log(`✓ Wrote ${globalPath} (offline heuristic)`);
    return;
  }

  try {
    await buildEmbeddingIndex(
      ids,
      personasHash,
      globalPath,
      bundledWritePath,
    );
  } catch (error) {
    console.warn(
      "Embedding index failed, falling back to offline heuristic:",
      error,
    );
    await buildOfflineIndex(ids, personasHash, globalPath, bundledWritePath);
    console.log(`✓ Wrote ${globalPath} (offline fallback)`);
  }
}
