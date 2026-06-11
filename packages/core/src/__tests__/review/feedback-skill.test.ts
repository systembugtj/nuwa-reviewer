import { access, mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { NUWA_FEEDBACK_SKILL_TARGETS } from "../../constants.js";
import {
  buildNuwaFeedbackCopilotMarkdown,
  buildNuwaFeedbackSkillMarkdown,
  writeNuwaFeedbackSkills,
} from "../../review/feedback-skill.js";

describe("nuwa-feedback skills", () => {
  it("builds skill and copilot markdown variants", () => {
    const skill = buildNuwaFeedbackSkillMarkdown();
    const copilot = buildNuwaFeedbackCopilotMarkdown();
    expect(skill).toContain("name: nuwa-feedback");
    expect(skill).toContain("Severity Scorecard");
    expect(copilot).toContain('applyTo: "**"');
    expect(copilot).toContain("Nuwa Feedback");
  });

  it("writes all configured AI tool skill paths", async () => {
    const dir = await mkdtemp(join(tmpdir(), "nuwa-skill-"));
    const paths = await writeNuwaFeedbackSkills(dir);

    expect(paths.all).toHaveLength(NUWA_FEEDBACK_SKILL_TARGETS.length);

    for (const target of NUWA_FEEDBACK_SKILL_TARGETS) {
      const expected = join(dir, target.relativeFile);
      expect(paths[target.id]).toBe(expected);
      await expect(access(expected)).resolves.toBeUndefined();
      const content = await readFile(expected, "utf8");
      expect(content).toContain("nuwa-feedback");
      expect(content).toContain("FEEDBACK.md");
    }
  });
});
