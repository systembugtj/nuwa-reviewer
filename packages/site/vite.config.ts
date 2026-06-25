import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const REPO_NAME = "nuwa-reviewer";
const BASE_PATH = process.env.VITE_BASE_PATH ?? `/${REPO_NAME}/`;

export default defineConfig({
  base: BASE_PATH,
  plugins: [react()],
  build: {
    outDir: "dist",
    emptyOutDir: true,
    sourcemap: true,
  },
});
