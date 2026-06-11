import { access, readFile } from "node:fs/promises";
import { join } from "node:path";
import type { ProjectStack } from "../types.js";

const MANIFEST_CHECKS: ReadonlyArray<{
  file: string;
  stacks: ProjectStack[];
}> = [
  { file: "package.json", stacks: ["node"] },
  { file: "pnpm-workspace.yaml", stacks: ["monorepo", "node"] },
  { file: "Cargo.toml", stacks: ["rust"] },
  { file: "pyproject.toml", stacks: ["python"] },
  { file: "requirements.txt", stacks: ["python"] },
  { file: "go.mod", stacks: ["go"] },
  { file: "pom.xml", stacks: ["java"] },
  { file: "build.gradle", stacks: ["java"] },
  { file: "Package.swift", stacks: ["swift"] },
  { file: "mkdocs.yml", stacks: ["docs"] },
];

const FRAMEWORK_DEPS: ReadonlyArray<{
  dep: string;
  stack: ProjectStack;
}> = [
  { dep: "react", stack: "react" },
  { dep: "next", stack: "nextjs" },
  { dep: "vue", stack: "vue" },
  { dep: "svelte", stack: "svelte" },
  { dep: "tailwindcss", stack: "css" },
];

/** Check if a file exists at the given path */
async function fileExists(filePath: string): Promise<boolean> {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

/** Parse package.json dependencies for framework signals */
async function detectNodeFrameworks(
  projectRoot: string,
): Promise<ProjectStack[]> {
  const pkgPath = join(projectRoot, "package.json");
  if (!(await fileExists(pkgPath))) {
    return [];
  }

  try {
    const raw = await readFile(pkgPath, "utf8");
    const pkg = JSON.parse(raw) as {
      dependencies?: Record<string, string>;
      devDependencies?: Record<string, string>;
    };
    const allDeps = {
      ...pkg.dependencies,
      ...pkg.devDependencies,
    };

    const found = new Set<ProjectStack>();
    for (const { dep, stack } of FRAMEWORK_DEPS) {
      if (dep in allDeps) {
        found.add(stack);
      }
    }
    return [...found];
  } catch {
    return [];
  }
}

/** Detect CSS-heavy projects by scanning for common style files */
async function detectCssStack(projectRoot: string): Promise<boolean> {
  const cssMarkers = [
    "tailwind.config.js",
    "tailwind.config.ts",
    "postcss.config.js",
    "postcss.config.mjs",
    "stylelint.config.js",
  ];
  for (const marker of cssMarkers) {
    if (await fileExists(join(projectRoot, marker))) {
      return true;
    }
  }
  return false;
}

/**
 * Detect project stacks from manifest files and dependency signals.
 * Walks up from startDir until a recognizable project root is found.
 */
export async function detectProjectStacks(
  startDir: string,
): Promise<{ root: string; stacks: ProjectStack[] }> {
  let current = startDir;
  const visited = new Set<string>();

  while (!visited.has(current)) {
    visited.add(current);
    const stacks = new Set<ProjectStack>();

    for (const { file, stacks: fileStacks } of MANIFEST_CHECKS) {
      if (await fileExists(join(current, file))) {
        for (const stack of fileStacks) {
          stacks.add(stack);
        }
      }
    }

    const frameworks = await detectNodeFrameworks(current);
    for (const fw of frameworks) {
      stacks.add(fw);
    }

    if (await detectCssStack(current)) {
      stacks.add("css");
    }

    if (stacks.size > 0) {
      return {
        root: current,
        stacks: [...stacks],
      };
    }

    const parent = join(current, "..");
    if (parent === current) {
      break;
    }
    current = parent;
  }

  return { root: startDir, stacks: ["unknown"] };
}
