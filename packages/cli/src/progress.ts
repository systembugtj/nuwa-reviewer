import { consola } from "consola";
import ora, { type Ora } from "ora";
import type { QueryStatusEvent } from "@nuwajs/core";

/** Spinner + persisted step lines for long CLI tasks */
export class TaskProgress {
  private spinner: Ora | null = null;

  /** Show a completed step (persists on screen) */
  step(message: string): void {
    if (this.spinner) {
      this.spinner.succeed(message);
      this.spinner = null;
      return;
    }
    consola.success(message);
  }

  /** Update the active spinner text */
  update(message: string): void {
    if (!this.spinner) {
      this.spinner = ora(message).start();
      return;
    }
    this.spinner.text = message;
  }

  /** Mark active spinner failed */
  fail(message: string): void {
    this.spinner?.fail(message);
    this.spinner = null;
  }

  /** Mark active spinner succeeded without starting a new one */
  done(message: string): void {
    if (this.spinner) {
      this.spinner.succeed(message);
      this.spinner = null;
      return;
    }
    consola.success(message);
  }

  /** Stop spinner without success/fail styling */
  stop(): void {
    this.spinner?.stop();
    this.spinner = null;
  }
}

/** Format `[i/n] personaId — detail` progress prefix */
export function formatPersonaPrefix(
  personaId: string,
  index: number,
  total: number,
): string {
  return `[${index}/${total}] ${personaId}`;
}

/** Map SDK stream events to short status text with live content */
export function formatSdkStatus(event: QueryStatusEvent): string {
  switch (event.kind) {
    case "init":
      return `session ${event.sessionId.slice(0, 8)}… · model ${event.model}`;
    case "status":
      return event.status === "requesting"
        ? "waiting for model…"
        : event.status === "compacting"
          ? "compacting context…"
          : event.status;
    case "tool":
      return `${event.toolName} (${event.elapsedSeconds.toFixed(1)}s)`;
    case "tool_summary":
      return event.summary.length > 72
        ? `${event.summary.slice(0, 69)}…`
        : event.summary;
    case "auth":
      return event.authenticating
        ? "authenticating…"
        : event.error
          ? `auth failed: ${event.error}`
          : "authenticated";
    case "retry":
      return `API retry ${event.attempt}/${event.maxRetries} in ${event.delayMs}ms`;
    case "assistant":
      if (event.snippet) {
        return event.delta
          ? `writing: ${event.snippet}`
          : `report: ${event.snippet}`;
      }
      return `drafting report (${event.totalChars} chars)…`;
    case "permission_denied":
      return `denied: ${event.toolName}`;
    default:
      return "working…";
  }
}
