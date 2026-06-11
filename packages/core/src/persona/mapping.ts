import type { ProjectStack } from "../types.js";

/** Board personas always included in every project */
const BOARD_PERSONAS = [
  "martin-fowler",
  "linus-torvalds",
  "kent-beck",
  "margaret-hamilton",
  "fred-brooks",
] as const;

/** Stack-specific persona recommendations */
const STACK_PERSONAS: Readonly<Record<ProjectStack, readonly string[]>> = {
  node: ["guillermo-rauch", "jon-postel"],
  rust: [],
  python: ["jon-postel"],
  go: ["jon-postel"],
  java: ["jon-postel"],
  swift: ["paul-hudson"],
  css: [
    "brad-frost",
    "harry-roberts",
    "chris-coyier",
    "kevin-powell",
    "eric-a-meyer",
    "ahmad-shadeed",
  ],
  react: ["jordan-walke", "dan-abramov"],
  vue: ["evan-you"],
  svelte: ["rich-harris"],
  nextjs: ["tim-neutkens", "jordan-walke", "dan-abramov"],
  docs: ["wsx-press-author", "john-doe", "jk-rowling"],
  monorepo: ["jrr-tolkien", "guillermo-rauch"],
  unknown: ["william-shakespeare", "george-rr-martin"],
};

/**
 * Select personas for detected project stacks.
 * Board personas are always included; stack-specific ones are merged and deduped.
 */
export function selectPersonasForStacks(stacks: ProjectStack[]): string[] {
  const selected = new Set<string>(BOARD_PERSONAS);

  for (const stack of stacks) {
    const personas = STACK_PERSONAS[stack] ?? [];
    for (const persona of personas) {
      selected.add(persona);
    }
  }

  return [...selected].sort();
}
