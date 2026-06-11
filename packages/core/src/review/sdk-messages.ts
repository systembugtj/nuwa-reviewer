import type {
  SDKAssistantMessage,
  SDKMessage,
  SDKResultMessage,
} from "@anthropic-ai/claude-agent-sdk";
import type { ReviewSdkTraceEvent } from "./trace.js";

/** Metadata from a successful SDK result message */
export interface QueryResultMeta {
  durationMs: number;
  durationApiMs: number;
  numTurns: number;
  totalCostUsd: number;
  stopReason: string | null;
  sessionId: string;
}

/** Live status from the Claude Agent SDK stream */
export type QueryStatusEvent =
  | { kind: "init"; model: string; sessionId: string }
  | { kind: "status"; status: string }
  | { kind: "tool"; toolName: string; elapsedSeconds: number }
  | { kind: "tool_summary"; summary: string }
  | { kind: "auth"; authenticating: boolean; error?: string }
  | {
      kind: "retry";
      attempt: number;
      maxRetries: number;
      delayMs: number;
      error?: string;
    }
  | {
      kind: "assistant";
      text: string;
      snippet: string;
      delta?: string;
      totalChars: number;
    }
  | { kind: "permission_denied"; toolName: string };

/** Collected text and metadata from a `query()` stream */
export interface QueryCollectResult {
  text: string;
  meta?: QueryResultMeta;
  errors: string[];
  permissionDenials: string[];
  trace: ReviewSdkTraceEvent[];
}

export interface CollectQueryTextOptions {
  onStatus?: (event: QueryStatusEvent) => void;
}

type TextBlock = { type?: string; text?: string };

/** Extract concatenated text blocks from an assistant BetaMessage */
export function extractTextFromAssistantMessage(
  assistant: SDKAssistantMessage,
): string {
  const content = assistant.message?.content;
  if (!Array.isArray(content)) {
    return "";
  }

  const parts: string[] = [];
  for (const block of content) {
    if (
      typeof block === "object" &&
      block !== null &&
      (block as TextBlock).type === "text"
    ) {
      parts.push((block as TextBlock).text ?? "");
    }
  }
  return parts.join("");
}

/** Extract incremental text from stream_event content_block_delta */
export function extractTextDeltaFromStreamEvent(
  event: { type?: string; delta?: { type?: string; text?: string } },
): string {
  if (event.type !== "content_block_delta") {
    return "";
  }
  const delta = event.delta;
  if (delta?.type === "text_delta" && typeof delta.text === "string") {
    return delta.text;
  }
  return "";
}

function metaFromResult(
  message: SDKResultMessage & { subtype: "success" },
): QueryResultMeta {
  return {
    durationMs: message.duration_ms,
    durationApiMs: message.duration_api_ms,
    numTurns: message.num_turns,
    totalCostUsd: message.total_cost_usd,
    stopReason: message.stop_reason,
    sessionId: message.session_id,
  };
}

function emitStatus(
  onStatus: CollectQueryTextOptions["onStatus"],
  event: QueryStatusEvent,
): void {
  onStatus?.(event);
}

function appendTrace(
  trace: ReviewSdkTraceEvent[],
  kind: string,
  message: string,
): void {
  trace.push({
    at: new Date().toISOString(),
    kind,
    message,
  });
}

function progressSnippet(text: string, maxLen = 72): string {
  const oneLine = text.replace(/\s+/g, " ").trim();
  if (!oneLine) {
    return "";
  }
  return oneLine.length > maxLen ? `${oneLine.slice(0, maxLen - 1)}…` : oneLine;
}

/**
 * Consume all messages from `query()` and return review text.
 * Prefers the final `result` message; falls back to accumulated assistant text.
 */
export async function collectQueryText(
  stream: AsyncIterable<SDKMessage>,
  options: CollectQueryTextOptions = {},
): Promise<QueryCollectResult> {
  const { onStatus } = options;
  const assistantTexts: string[] = [];
  let streamingBuffer = "";
  let resultText = "";
  let meta: QueryResultMeta | undefined;
  const errors: string[] = [];
  const permissionDenials: string[] = [];
  const trace: ReviewSdkTraceEvent[] = [];

  const consumeMessage = (message: SDKMessage): void => {
    switch (message.type) {
      case "assistant": {
        const text = extractTextFromAssistantMessage(message);
        if (text.trim()) {
          assistantTexts.push(text);
          streamingBuffer = text;
          const snippet = progressSnippet(text);
          const event: QueryStatusEvent = {
            kind: "assistant",
            text,
            snippet,
            totalChars: text.length,
          };
          emitStatus(onStatus, event);
          appendTrace(trace, "assistant", snippet || `${text.length} chars`);
        }
        if (message.error) {
          errors.push(`assistant error: ${message.error}`);
          appendTrace(trace, "error", message.error);
        }
        break;
      }
      case "stream_event": {
        const delta = extractTextDeltaFromStreamEvent(
          message.event as { type?: string; delta?: { type?: string; text?: string } },
        );
        if (delta) {
          streamingBuffer += delta;
          const snippet = progressSnippet(streamingBuffer);
          const event: QueryStatusEvent = {
            kind: "assistant",
            text: streamingBuffer,
            snippet,
            delta,
            totalChars: streamingBuffer.length,
          };
          emitStatus(onStatus, event);
        }
        break;
      }
      case "result": {
        if (message.subtype === "success") {
          if (message.result.trim()) {
            resultText = message.result;
          }
          meta = metaFromResult(message);
          appendTrace(
            trace,
            "result",
            `${message.num_turns} turns, ${message.duration_ms}ms`,
          );
          for (const denial of message.permission_denials ?? []) {
            permissionDenials.push(
              `${denial.tool_name} (${denial.tool_use_id})`,
            );
          }
        } else {
          const resultErrors =
            message.errors.length > 0
              ? message.errors
              : message.subtype === "error_max_turns"
                ? ["Reached maximum number of turns"]
                : [`query ended: ${message.subtype}`];
          errors.push(...resultErrors);
          appendTrace(trace, "result_error", resultErrors.join("; "));
        }
        break;
      }
      case "auth_status": {
        emitStatus(onStatus, {
          kind: "auth",
          authenticating: message.isAuthenticating,
          error: message.error,
        });
        appendTrace(
          trace,
          "auth",
          message.isAuthenticating ? "authenticating" : "authenticated",
        );
        if (message.error) {
          errors.push(`auth: ${message.error}`);
        }
        break;
      }
      case "tool_progress": {
        const detail = `${message.tool_name} (${message.elapsed_time_seconds.toFixed(1)}s)`;
        emitStatus(onStatus, {
          kind: "tool",
          toolName: message.tool_name,
          elapsedSeconds: message.elapsed_time_seconds,
        });
        appendTrace(trace, "tool", detail);
        break;
      }
      case "tool_use_summary": {
        emitStatus(onStatus, {
          kind: "tool_summary",
          summary: message.summary,
        });
        appendTrace(trace, "tool_summary", message.summary);
        break;
      }
      case "system": {
        if (message.subtype === "permission_denied") {
          permissionDenials.push(message.tool_name ?? "unknown tool");
          emitStatus(onStatus, {
            kind: "permission_denied",
            toolName: message.tool_name,
          });
          appendTrace(trace, "permission_denied", message.tool_name);
        } else if (message.subtype === "init") {
          emitStatus(onStatus, {
            kind: "init",
            model: message.model,
            sessionId: message.session_id,
          });
          appendTrace(trace, "init", `${message.model} · ${message.session_id.slice(0, 8)}`);
        } else if (message.subtype === "status" && message.status) {
          emitStatus(onStatus, {
            kind: "status",
            status: message.status,
          });
          appendTrace(trace, "status", message.status);
        } else if (message.subtype === "api_retry") {
          emitStatus(onStatus, {
            kind: "retry",
            attempt: message.attempt,
            maxRetries: message.max_retries,
            delayMs: message.retry_delay_ms,
            error: message.error,
          });
          appendTrace(
            trace,
            "retry",
            `attempt ${message.attempt}/${message.max_retries}`,
          );
        }
        break;
      }
      default:
        break;
    }
  };

  try {
    for await (const message of stream) {
      consumeMessage(message);
    }
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    errors.push(detail);
    appendTrace(trace, "stream_error", detail);
  }

  const text =
    resultText.trim() ||
    assistantTexts.join("\n\n").trim() ||
    streamingBuffer.trim();

  return { text, meta, errors, permissionDenials, trace };
}
