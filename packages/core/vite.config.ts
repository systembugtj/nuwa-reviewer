import { createLibConfig } from "@nuwajs/config-vite";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(fileURLToPath(import.meta.url));

export default createLibConfig({
  root,
  external: [
    "@anthropic-ai/claude-agent-sdk",
    "@huggingface/transformers",
    "@nuwajs/persona",
  ],
});
