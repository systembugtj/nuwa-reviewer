import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { NUWA_MCP_SERVER_NAME } from "../constants.js";
import {
  buildNuwaMcpServerEntry,
  mergeNuwaMcpConfig,
  writeNuwaMcpConfig,
} from "../mcp-config.js";

describe("nuwa mcp config", () => {
  it("builds stdio server entry with nuwa mcp command", () => {
    const entry = buildNuwaMcpServerEntry();
    expect(entry.type).toBe("stdio");
    expect(entry.command).toBe("nuwa");
    expect(entry.args).toEqual(["mcp"]);
    expect(entry.env?.ANTHROPIC_API_KEY).toBe("${ANTHROPIC_API_KEY}");
  });

  it("merges into existing mcpServers without dropping other servers", () => {
    const merged = mergeNuwaMcpConfig({
      mcpServers: {
        other: {
          type: "stdio",
          command: "echo",
          args: ["hi"],
        },
      },
    });

    expect(merged.mcpServers.other?.command).toBe("echo");
    expect(merged.mcpServers[NUWA_MCP_SERVER_NAME]?.command).toBe("nuwa");
  });

  it("writes .mcp.json at project root", async () => {
    const dir = await mkdtemp(join(tmpdir(), "nuwa-mcp-"));
    const path = await writeNuwaMcpConfig(dir);
    expect(path).toBe(join(dir, ".mcp.json"));

    const raw = await readFile(path, "utf8");
    const parsed = JSON.parse(raw) as {
      mcpServers: Record<string, { command: string }>;
    };
    expect(parsed.mcpServers[NUWA_MCP_SERVER_NAME]?.command).toBe("nuwa");
  });
});
