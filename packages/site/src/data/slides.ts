export type SlideAccent = "ember" | "jade" | "violet" | "gold" | "cyan";

export interface IntroSlide {
  id: string;
  kicker: string;
  title: string;
  body: string;
  chips?: string[];
  command?: string;
  accent: SlideAccent;
}

export const INTRO_SLIDES: IntroSlide[] = [
  {
    id: "open",
    kicker: "Meet Nuwa",
    title: "Review anything.\nIn character.",
    body: "Not one generic LLM prompt — a council of expert personas, each with their own philosophy, reviewing the same diff.",
    chips: ["role-play", "multi-persona", "review anything"],
    accent: "ember",
  },
  {
    id: "personas",
    kicker: "The council",
    title: "Linus. Kent. Martin.\nAnd twenty more.",
    body: "Stack detection picks personas that match your project — kernel pragmatism, TDD discipline, architecture gravity.",
    chips: ["linus-torvalds", "kent-beck", "martin-fowler"],
    accent: "violet",
  },
  {
    id: "init",
    kicker: "Step 1",
    title: "Deploy personas\ninto your repo.",
    body: "Detect stacks, copy matching persona markdown to `.nuwa/persona/`, write config and Claude MCP wiring.",
    command: "nuwa init",
    accent: "jade",
  },
  {
    id: "review",
    kicker: "Step 2",
    title: "Every persona\nreviews your diff.",
    body: "Claude Agent SDK role-plays each reviewer on staged, unstaged, commit, or PR changes — with severity scorecard and trend.",
    command: "nuwa review --staged",
    accent: "cyan",
  },
  {
    id: "feedback",
    kicker: "Step 3",
    title: "Ship fixes\nfrom FEEDBACK.md.",
    body: "Structured findings land in FEEDBACK.md. The nuwa-feedback skill ships to Cursor, Claude Code, Copilot, and more.",
    chips: ["FEEDBACK.md", "nuwa-feedback skill"],
    accent: "gold",
  },
  {
    id: "mcp",
    kicker: "Claude Code",
    title: "MCP tools:\ninit & review.",
    body: "Nuwa exposes stdio MCP — `nuwa_init`, `nuwa_review`, `nuwa_read_feedback` — so Claude drives the loop natively.",
    command: "nuwa mcp",
    accent: "violet",
  },
  {
    id: "install",
    kicker: "Start now",
    title: "One command.\nMany voices.",
    body: "npm, pnpm, or npx — then init, review, iterate until the trend says improved.",
    command: "npx @nuwajs/cli init",
    accent: "ember",
  },
];

export const SLIDE_AUTO_MS = 6500;
