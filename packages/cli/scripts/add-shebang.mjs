import { readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const cliPath = join(dirname(fileURLToPath(import.meta.url)), "../dist/cli.js");
const content = await readFile(cliPath, "utf8");

if (!content.startsWith("#!")) {
  await writeFile(cliPath, `#!/usr/bin/env node\n${content}`);
}
