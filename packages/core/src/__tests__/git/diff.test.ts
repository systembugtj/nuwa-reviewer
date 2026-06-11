import { describe, expect, it } from "vitest";
import { parseDiffFiles } from "../../git/diff.js";

describe("parseDiffFiles", () => {
  it("extracts file paths from unified diff", () => {
    const diff = `diff --git a/src/a.ts b/src/a.ts
+++ b/src/a.ts
@@ -1 +1 @@
`;
    expect(parseDiffFiles(diff)).toEqual(["src/a.ts"]);
  });
});
