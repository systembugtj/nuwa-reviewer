import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { ANTHROPIC_API_KEY_ENV } from "@nuwajs/core";
import { NUWA_MCP_CONFIG_FILE, NUWA_MCP_SERVER_NAME } from "./constants.js";

/** Stdio MCP server entry for Claude Code `.mcp.json` */
export interface NuwaMcpServerEntry {
  type: "stdio";
  command: string;
  args: string[];
  env?: Record<string, string>;
}

/** Claude Code project MCP config shape */
export interface NuwaMcpConfigFile {
  mcpServers: Record<string, NuwaMcpServerEntry>;
}

/** Default nuwa stdio server entry (requires `nuwa` on PATH) */
export function buildNuwaMcpServerEntry(
  overrides: Partial<Pick<NuwaMcpServerEntry, "command" | "args">> = {},
): NuwaMcpServerEntry {
  return {
    type: "stdio",
    command: overrides.command ?? "nuwa",
    args: overrides.args ?? ["mcp"],
    env: {
      [ANTHROPIC_API_KEY_ENV]: `\${${ANTHROPIC_API_KEY_ENV}}`,
    },
  };
}

/** Merge nuwa server into existing `.mcp.json` content */
export function mergeNuwaMcpConfig(
  existing: unknown,
  entry: NuwaMcpServerEntry = buildNuwaMcpServerEntry(),
): NuwaMcpConfigFile {
  const base =
    existing && typeof existing === "object" && !Array.isArray(existing)
      ? (existing as Record<string, unknown>)
      : {};

  const servers =
    base.mcpServers &&
    typeof base.mcpServers === "object" &&
    !Array.isArray(base.mcpServers)
      ? { ...(base.mcpServers as Record<string, NuwaMcpServerEntry>) }
      : {};

  servers[NUWA_MCP_SERVER_NAME] = entry;

  return {
    ...base,
    mcpServers: servers,
  } as NuwaMcpConfigFile;
}

/** Write or merge `.mcp.json` at project root for Claude Code */
export async function writeNuwaMcpConfig(
  projectRoot: string,
  entry: NuwaMcpServerEntry = buildNuwaMcpServerEntry(),
): Promise<string> {
  const configPath = join(projectRoot, NUWA_MCP_CONFIG_FILE);

  let existing: unknown = null;
  try {
    const raw = await readFile(configPath, "utf8");
    existing = JSON.parse(raw) as unknown;
  } catch {
    existing = null;
  }

  const merged = mergeNuwaMcpConfig(existing, entry);
  await writeFile(configPath, `${JSON.stringify(merged, null, 2)}\n`, "utf8");
  return configPath;
}
