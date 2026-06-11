import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import {
  NUWA_CANONICAL_FEEDBACK_SKILL_DIR,
  NUWA_FEEDBACK_SKILL_TARGETS,
  type NuwaFeedbackSkillTargetId,
} from "../constants.js";
import { readNuwaConfig } from "../persona/deploy.js";
import type {
  NuwaFeedbackSkillFormat,
  NuwaFeedbackSkillTarget,
} from "../types.js";

/** Resolved deployment target (built-in + optional config extensions) */
export interface ResolvedFeedbackSkillTarget {
  id: string;
  label: string;
  relativeFile: string;
  format: NuwaFeedbackSkillFormat;
}

/** Skill / rule file paths written under the project root */
export interface NuwaFeedbackSkillPaths {
  all: string[];
  [targetId: string]: string | string[];
}

const BUILTIN_FORMAT_BY_ID: Record<NuwaFeedbackSkillTargetId, NuwaFeedbackSkillFormat> =
  {
    canonical: "skill",
    cursor: "skill",
    claude: "skill",
    windsurf: "rules",
    continue: "rules",
    copilot: "copilot",
    cline: "rules",
    roo: "rules",
    openhands: "rules",
    agents: "agents",
  };

/** Built-in targets plus optional extras from `.nuwa/config.json` */
export function resolveFeedbackSkillTargets(
  extra?: NuwaFeedbackSkillTarget[],
): ResolvedFeedbackSkillTarget[] {
  const builtIn: ResolvedFeedbackSkillTarget[] =
    NUWA_FEEDBACK_SKILL_TARGETS.map((target) => ({
      id: target.id,
      label: target.label,
      relativeFile: target.relativeFile,
      format: BUILTIN_FORMAT_BY_ID[target.id],
    }));

  if (!extra?.length) {
    return builtIn;
  }

  const seen = new Set(builtIn.map((t) => t.relativeFile));
  const merged = [...builtIn];

  for (const target of extra) {
    if (seen.has(target.relativeFile)) {
      continue;
    }
    merged.push({
      id: target.id,
      label: target.label,
      relativeFile: target.relativeFile,
      format: target.format ?? "rules",
    });
    seen.add(target.relativeFile);
  }

  return merged;
}

const SKILL_DESCRIPTION =
  "Address review findings from Nuwa persona reviews. Use when FEEDBACK.md exists, user mentions nuwa review feedback, or asks to fix review findings.";

/** Shared markdown body (no frontmatter) */
export function buildNuwaFeedbackBody(): string {
  return `Systematically address findings in \`FEEDBACK.md\` from \`nuwa review\`.

## When to Use

- \`FEEDBACK.md\` exists in the project root
- User says "address nuwa feedback", "fix review findings", or "/nuwa-feedback"
- After \`nuwa review\` produced action items

## Workflow

1. **Read** \`FEEDBACK.md\` completely — check **Trend**, **Severity Scorecard**, and **Review Trace**
2. **Prioritize** by severity: critical → high → medium → low → info
3. **For each finding:**
   - Read the cited file and surrounding context
   - Apply the persona's suggested fix (root cause, not symptom)
   - Run relevant tests / lint
4. **Update** \`FEEDBACK.md\` — mark addressed items or regenerate via \`nuwa review\`
5. **Summarize** what changed and what remains

## Rules

- Fix root causes, not symptoms (Linus persona standard)
- Do not skip critical/high items without explicit user approval
- Match project conventions in surrounding code
- After fixes, suggest: \`nuwa review --staged\` to verify trend improved

## Output Format

\`\`\`markdown
## Nuwa Feedback Progress

### Fixed
- [severity] title — what you changed

### Remaining
- [severity] title — why deferred (if any)

### Verification
- commands run and results
\`\`\`
`;
}

/** Cursor / Claude Code / canonical SKILL.md */
export function buildNuwaFeedbackSkillMarkdown(): string {
  return `---
name: nuwa-feedback
description: >-
  ${SKILL_DESCRIPTION}
---

# Nuwa Feedback

${buildNuwaFeedbackBody()}`;
}

/** Windsurf, Continue, Cline, Roo, OpenHands rules file */
export function buildNuwaFeedbackRulesMarkdown(): string {
  return `# Nuwa Feedback

> ${SKILL_DESCRIPTION}

${buildNuwaFeedbackBody()}`;
}

/** GitHub Copilot custom instructions */
export function buildNuwaFeedbackCopilotMarkdown(): string {
  return `---
applyTo: "**"
---

${buildNuwaFeedbackRulesMarkdown()}`;
}

/** Universal AGENTS companion file (Codex, Copilot, others) */
export function buildNuwaFeedbackAgentsMarkdown(): string {
  return `# AGENTS — Nuwa Feedback

${buildNuwaFeedbackRulesMarkdown()}`;
}

/** Pick markdown variant for a deployment target */
export function buildNuwaFeedbackContentForFormat(
  format: NuwaFeedbackSkillFormat,
): string {
  switch (format) {
    case "skill":
      return buildNuwaFeedbackSkillMarkdown();
    case "copilot":
      return buildNuwaFeedbackCopilotMarkdown();
    case "agents":
      return buildNuwaFeedbackAgentsMarkdown();
    case "rules":
      return buildNuwaFeedbackRulesMarkdown();
  }
}

/** @deprecated Use buildNuwaFeedbackContentForFormat */
export function buildNuwaFeedbackContentForTarget(
  targetId: NuwaFeedbackSkillTargetId,
): string {
  return buildNuwaFeedbackContentForFormat(BUILTIN_FORMAT_BY_ID[targetId]);
}

async function writeSkillFile(
  projectRoot: string,
  relativeFile: string,
  content: string,
): Promise<string> {
  const filePath = join(projectRoot, relativeFile);
  await mkdir(dirname(filePath), { recursive: true });
  await writeFile(filePath, content, "utf8");
  return filePath;
}

/** Deploy nuwa-feedback to built-in and config-extended AI tool paths */
export async function writeNuwaFeedbackSkills(
  projectRoot: string,
): Promise<NuwaFeedbackSkillPaths> {
  const config = await readNuwaConfig(projectRoot);
  const targets = resolveFeedbackSkillTargets(config?.feedbackSkillTargets);

  const entries = await Promise.all(
    targets.map(async (target) => {
      const content = buildNuwaFeedbackContentForFormat(target.format);
      const path = await writeSkillFile(
        projectRoot,
        target.relativeFile,
        content,
      );
      return [target.id, path] as const;
    }),
  );

  const paths = Object.fromEntries(entries) as Record<string, string>;
  const all = entries.map(([, path]) => path);

  return { ...paths, all };
}

/** @deprecated Use writeNuwaFeedbackSkills */
export async function writeNuwaFeedbackSkill(
  projectRoot: string,
): Promise<string> {
  const paths = await writeNuwaFeedbackSkills(projectRoot);
  return paths.cursor;
}

/** Human-readable list of supported AI tools */
export function formatNuwaFeedbackSkillTargets(): string {
  return NUWA_FEEDBACK_SKILL_TARGETS.map((t) => t.label).join(", ");
}

/** Canonical skill directory under .nuwa (for docs) */
export { NUWA_CANONICAL_FEEDBACK_SKILL_DIR };
