import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import * as z from "zod";
import { NUWA_MCP_SERVER_INFO } from "./constants.js";
import {
  handleNuwaDetect,
  handleNuwaInit,
  handleNuwaListPersonas,
  handleNuwaReadFeedback,
  handleNuwaReview,
} from "./tools.js";

const reviewScopeSchema = z.enum(["staged", "unstaged", "commit", "pr"]);

/** Create configured Nuwa MCP server (stdio-ready) */
export function createNuwaMcpServer(): McpServer {
  const server = new McpServer({
    name: NUWA_MCP_SERVER_INFO.name,
    version: NUWA_MCP_SERVER_INFO.version,
  });

  server.registerTool(
    "nuwa_init",
    {
      title: "Nuwa Init",
      description:
        "Initialize Nuwa for a project: detect stacks, deploy matching reviewer personas to .nuwa/persona, and write .nuwa/config.json. Run before the first review.",
      inputSchema: {
        path: z
          .string()
          .optional()
          .describe(
            "Project directory (defaults to CLAUDE_PROJECT_DIR or cwd)",
          ),
        offline: z
          .boolean()
          .optional()
          .describe("Use heuristic persona index only (skip embeddings)"),
      },
      annotations: {
        title: "Initialize Nuwa",
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async (args) => handleNuwaInit(args),
  );

  server.registerTool(
    "nuwa_review",
    {
      title: "Nuwa Review",
      description:
        "Run Nuwa persona role-play review on git changes. Writes FEEDBACK.md and nuwa-feedback skills unless write=false. Requires ANTHROPIC_API_KEY.",
      inputSchema: {
        path: z.string().optional().describe("Project directory"),
        scope: reviewScopeSchema
          .optional()
          .describe("Diff scope (default: unstaged)"),
        target: z
          .string()
          .optional()
          .describe("Commit SHA or PR number when scope is commit/pr"),
        personas: z
          .array(z.string())
          .optional()
          .describe("Subset of persona ids; default all from config"),
        model: z.string().optional().describe("Claude model id override"),
        maxTurns: z
          .number()
          .int()
          .positive()
          .optional()
          .describe("Max SDK turns per persona"),
        write: z
          .boolean()
          .optional()
          .describe("Write FEEDBACK.md and skills (default true)"),
      },
      annotations: {
        title: "Run Nuwa Review",
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: true,
      },
    },
    async (args) => handleNuwaReview(args),
  );

  server.registerTool(
    "nuwa_detect",
    {
      title: "Nuwa Detect Stacks",
      description:
        "Detect project technology stacks from manifest files (package.json, Cargo.toml, etc.).",
      inputSchema: {
        path: z.string().optional().describe("Project directory"),
      },
      annotations: {
        title: "Detect Project Stacks",
        readOnlyHint: true,
        openWorldHint: false,
      },
    },
    async (args) => handleNuwaDetect(args),
  );

  server.registerTool(
    "nuwa_list_personas",
    {
      title: "Nuwa List Personas",
      description:
        "List bundled persona ids and personas deployed in the current project (if nuwa init was run).",
      inputSchema: {
        path: z.string().optional().describe("Project directory"),
      },
      annotations: {
        title: "List Personas",
        readOnlyHint: true,
        openWorldHint: false,
      },
    },
    async (args) => handleNuwaListPersonas(args),
  );

  server.registerTool(
    "nuwa_read_feedback",
    {
      title: "Nuwa Read Feedback",
      description:
        "Read FEEDBACK.md produced by nuwa review (findings, severity scorecard, trend).",
      inputSchema: {
        path: z.string().optional().describe("Project directory"),
      },
      annotations: {
        title: "Read FEEDBACK.md",
        readOnlyHint: true,
        openWorldHint: false,
      },
    },
    async (args) => handleNuwaReadFeedback(args),
  );

  return server;
}
