import { runNuwaMcpServer } from "@nuwajs/mcp";

/** Start Nuwa as a stdio MCP server for Claude Code / Desktop */
export async function runMcpCommand(): Promise<void> {
  await runNuwaMcpServer();
}
