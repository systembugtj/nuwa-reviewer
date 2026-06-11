import { createCliConfig } from "@nuwajs/config-vite";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(fileURLToPath(import.meta.url));

export default createCliConfig({
  root,
  external: [
    "@nuwajs/core",
    "@nuwajs/mcp",
    "@nuwajs/persona",
    "commander",
    "consola",
    "ora",
  ],
});
