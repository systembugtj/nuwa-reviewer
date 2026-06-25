export const SITE_LINKS = {
  github: "https://github.com/systembugtj/nuwa-reviewer",
  npm: "https://www.npmjs.com/org/nuwajs",
} as const;

export const INSTALL_COMMANDS = [
  { label: "npx", cmd: "npx @nuwajs/cli init" },
  { label: "global", cmd: "npm install -g @nuwajs/cli" },
  { label: "review", cmd: "nuwa review --staged" },
] as const;

export const FEATURE_ROWS = [
  {
    title: "Stack-aware personas",
    detail: "Node, Rust, React, Swift… — mapping picks reviewers that fit.",
  },
  {
    title: "Structured feedback",
    detail: "Severity scorecard, review rounds, trend vs previous run.",
  },
  {
    title: "Global + project config",
    detail: "~/.nuwa/settings.json and .nuwa/config.json for model & turns.",
  },
  {
    title: "Offline-friendly",
    detail: "NUWA_INDEX_OFFLINE=1 for CI without embedding download.",
  },
] as const;
