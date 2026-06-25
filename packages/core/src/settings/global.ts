import { readFile } from "node:fs/promises";
import { getNuwaSettingsPath } from "../paths.js";
import { migrateReviewModel } from "../review/config.js";
import type { NuwaGlobalSettings } from "../types.js";

/** Read `~/.nuwa/settings.json` (missing file → null) */
export async function readNuwaGlobalSettings(): Promise<NuwaGlobalSettings | null> {
  try {
    const raw = await readFile(getNuwaSettingsPath(), "utf8");
    const parsed = JSON.parse(raw) as NuwaGlobalSettings;
    if (parsed.review?.model) {
      parsed.review = {
        ...parsed.review,
        model: migrateReviewModel(parsed.review.model),
      };
    }
    return parsed;
  } catch {
    return null;
  }
}
