import { describe, expect, it } from "vitest";
import {
  collectQueryText,
  extractTextFromAssistantMessage,
} from "../../review/sdk-messages.js";

describe("extractTextFromAssistantMessage", () => {
  it("joins text content blocks", () => {
    const text = extractTextFromAssistantMessage({
      type: "assistant",
      message: {
        content: [
          { type: "text", text: "Hello " },
          { type: "text", text: "world" },
        ],
      },
      parent_tool_use_id: null,
      uuid: "u1",
      session_id: "s1",
    } as never);

    expect(text).toBe("Hello world");
  });
});

describe("collectQueryText", () => {
  it("prefers result message over assistant chunks", async () => {
    const stream = (async function* () {
      yield {
        type: "assistant",
        message: { content: [{ type: "text", text: "partial" }] },
        parent_tool_use_id: null,
        uuid: "u1",
        session_id: "s1",
      };
      yield {
        type: "result",
        subtype: "success",
        result: "## Summary\nFinal report",
        duration_ms: 100,
        duration_api_ms: 80,
        num_turns: 1,
        total_cost_usd: 0.01,
        stop_reason: "end_turn",
        is_error: false,
        usage: {},
        modelUsage: {},
        permission_denials: [],
        uuid: "u2",
        session_id: "s1",
      };
    })();

    const collected = await collectQueryText(stream);
    expect(collected.text).toBe("## Summary\nFinal report");
    expect(collected.meta?.numTurns).toBe(1);
    expect(collected.errors).toHaveLength(0);
  });

  it("falls back to assistant text when result is empty", async () => {
    const stream = (async function* () {
      yield {
        type: "assistant",
        message: {
          content: [{ type: "text", text: "## Summary\nOnly assistant" }],
        },
        parent_tool_use_id: null,
        uuid: "u1",
        session_id: "s1",
      };
      yield {
        type: "result",
        subtype: "success",
        result: "",
        duration_ms: 50,
        duration_api_ms: 40,
        num_turns: 1,
        total_cost_usd: 0,
        stop_reason: null,
        is_error: false,
        usage: {},
        modelUsage: {},
        permission_denials: [],
        uuid: "u2",
        session_id: "s1",
      };
    })();

    const collected = await collectQueryText(stream);
    expect(collected.text).toBe("## Summary\nOnly assistant");
  });

  it("emits assistant content with snippet", async () => {
    const snippets: string[] = [];
    const stream = (async function* () {
      yield {
        type: "assistant",
        message: {
          content: [{ type: "text", text: "## Summary\nReview in progress" }],
        },
        parent_tool_use_id: null,
        uuid: "u1",
        session_id: "s1",
      };
      yield {
        type: "result",
        subtype: "success",
        result: "done",
        duration_ms: 1,
        duration_api_ms: 1,
        num_turns: 1,
        total_cost_usd: 0,
        stop_reason: null,
        is_error: false,
        usage: {},
        modelUsage: {},
        permission_denials: [],
        uuid: "u2",
        session_id: "s1",
      };
    })();

    const collected = await collectQueryText(stream, {
      onStatus: (e) => {
        if (e.kind === "assistant") {
          snippets.push(e.snippet);
        }
      },
    });
    expect(snippets.some((s) => s.includes("Review in progress"))).toBe(true);
    expect(collected.trace.length).toBeGreaterThan(0);
  });

  it("emits tool progress status", async () => {
    const events: string[] = [];
    const stream = (async function* () {
      yield {
        type: "tool_progress",
        tool_name: "Read",
        tool_use_id: "t1",
        parent_tool_use_id: null,
        elapsed_time_seconds: 2.5,
        uuid: "u1",
        session_id: "s1",
      };
      yield {
        type: "result",
        subtype: "success",
        result: "ok",
        duration_ms: 1,
        duration_api_ms: 1,
        num_turns: 1,
        total_cost_usd: 0,
        stop_reason: null,
        is_error: false,
        usage: {},
        modelUsage: {},
        permission_denials: [],
        uuid: "u2",
        session_id: "s1",
      };
    })();

    await collectQueryText(stream, {
      onStatus: (e) => events.push(e.kind),
    });
    expect(events).toContain("tool");
  });

  it("keeps partial assistant text when stream throws after error result", async () => {
    const stream = (async function* () {
      yield {
        type: "assistant",
        message: {
          content: [{ type: "text", text: "## Summary\nPartial review" }],
        },
        parent_tool_use_id: null,
        uuid: "u1",
        session_id: "s1",
      };
      throw new Error(
        "Claude Code returned an error result: Reached maximum number of turns (5)",
      );
    })();

    const collected = await collectQueryText(stream);
    expect(collected.text).toContain("Partial review");
    expect(collected.errors.some((e) => e.includes("maximum number of turns"))).toBe(
      true,
    );
  });

  it("records error results", async () => {
    const stream = (async function* () {
      yield {
        type: "result",
        subtype: "error_max_turns",
        duration_ms: 1,
        duration_api_ms: 1,
        is_error: true,
        num_turns: 1,
        stop_reason: null,
        total_cost_usd: 0,
        usage: {},
        modelUsage: {},
        permission_denials: [],
        errors: ["max turns exceeded"],
        uuid: "u1",
        session_id: "s1",
      };
    })();

    const collected = await collectQueryText(stream);
    expect(collected.text).toBe("");
    expect(collected.errors).toContain("max turns exceeded");
  });
});
