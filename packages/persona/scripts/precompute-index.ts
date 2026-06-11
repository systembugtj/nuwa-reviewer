/**
 * Monorepo build entry: precompute global index + bundled fallback.
 * Imports core source directly so persona package build does not depend on a prior core dist build.
 */
import { fileURLToPath } from "node:url";
import { runPrecomputeIndex } from "../../core/src/persona/precompute.ts";
import { BUNDLED_INDEX_FILE } from "../src/precomputed.js";

async function main(): Promise<void> {
  await runPrecomputeIndex({
    force: process.argv.includes("--force"),
    check: process.argv.includes("--check"),
    ifMissing: process.argv.includes("--if-missing"),
    offline:
      process.argv.includes("--offline") ||
      process.env.NUWA_INDEX_OFFLINE === "1",
    bundledFallbackPath: BUNDLED_INDEX_FILE,
  });
}

const isMain =
  process.argv[1] &&
  fileURLToPath(import.meta.url) === process.argv[1];

if (isMain) {
  main().catch((error: unknown) => {
    console.error(error);
    process.exit(1);
  });
}
