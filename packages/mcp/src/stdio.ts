import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createNuwaMcpServer } from "./server.js";

/** Start Nuwa MCP server on stdio (for Claude Code / Desktop) */
export async function runNuwaMcpServer(): Promise<void> {
  const server = createNuwaMcpServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
}
