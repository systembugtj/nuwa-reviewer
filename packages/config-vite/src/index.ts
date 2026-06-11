import { builtinModules } from "node:module";
import { resolve } from "node:path";
import { defineConfig, type UserConfig } from "vite";
import dts from "vite-plugin-dts";

const NODE_BUILTINS = [
  ...builtinModules,
  ...builtinModules.map((m) => `node:${m}`),
];

export interface LibViteOptions {
  /** Package root directory (where vite.config.ts lives) */
  root: string;
  /** Library entry file relative to root */
  entry?: string;
  /** Additional rollup externals beyond dependencies */
  external?: string[];
  /** Package name for dts plugin */
  name?: string;
}

/** Shared Vite config for @nuwajs library packages */
export function createLibConfig(options: LibViteOptions): UserConfig {
  const entry = options.entry ?? "src/index.ts";

  return defineConfig({
    root: options.root,
    build: {
      outDir: "dist",
      emptyOutDir: true,
      sourcemap: true,
      lib: {
        entry: resolve(options.root, entry),
        formats: ["es"],
        fileName: "index",
      },
      rollupOptions: {
        external: [...NODE_BUILTINS, ...(options.external ?? [])],
      },
      target: "node20",
      minify: false,
    },
    plugins: [
      dts({
        include: ["src/**/*"],
        outDir: "dist",
        rollupTypes: true,
        tsconfigPath: resolve(options.root, "tsconfig.json"),
      }),
    ],
  });
}

export interface CliViteOptions {
  root: string;
  entry?: string;
  external?: string[];
}

/** Shared Vite config for @nuwajs/cli bundle */
export function createCliConfig(options: CliViteOptions): UserConfig {
  const entry = options.entry ?? "src/cli.ts";

  return defineConfig({
    root: options.root,
    build: {
      outDir: "dist",
      emptyOutDir: true,
      sourcemap: true,
      lib: {
        entry: resolve(options.root, entry),
        formats: ["es"],
        fileName: "cli",
      },
      rollupOptions: {
        external: [...NODE_BUILTINS, ...(options.external ?? [])],
      },
      target: "node20",
      minify: false,
    },
  });
}
