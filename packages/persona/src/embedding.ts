/** Small embedding model (~23 MB ONNX) for persona index precomputation */
export const EMBEDDING_MODEL = "Xenova/all-MiniLM-L6-v2";

/** Embedding vector dimension for all-MiniLM-L6-v2 */
export const EMBEDDING_DIM = 384;

/** Domain probes ranked by cosine similarity against persona text */
export const EXPERTISE_PROBES = {
  "code-quality": "code quality taste simplicity root cause debugging",
  testing: "test driven development coverage unit tests verification",
  architecture: "software architecture refactoring patterns system design",
  devops: "ci cd monorepo tooling developer experience deployment",
  documentation: "rfc documentation api design technical writing",
  css: "css design tokens layout responsive accessibility styling",
  react: "react hooks components state management frontend",
  vue: "vue reactivity composition api frontend framework",
  svelte: "svelte compiler reactive ui components",
  nextjs: "nextjs ssr deployment routing performance",
  swift: "swift swiftui macos ios app development",
  security: "security compliance safety critical systems",
  "project-mgmt": "roadmap milestones task tracking project planning",
  naming: "naming readability code clarity api design",
} as const;

export type ExpertiseProbeId = keyof typeof EXPERTISE_PROBES;
