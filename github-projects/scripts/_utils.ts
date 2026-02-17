/**
 * Shared utilities for scripts — formatting, confirmation, display.
 *
 * Not part of the public SDK. Import from `./_utils.js` in scripts.
 */

import type { GitHubIssue, ProjectItem } from "../src/index.js";

// ── Formatting ──────────────────────────────────────────────────────

/** Truncate a string to `maxLen` chars, adding "…" if truncated. */
export function truncate(s: string, maxLen: number): string {
  if (s.length <= maxLen) return s;
  return `${s.slice(0, maxLen - 1)}…`;
}

/** Format an issue as a one-line summary. */
export function formatIssue(issue: GitHubIssue): string {
  const labels = issue.labels.length > 0 ? ` [${issue.labels.join(", ")}]` : "";
  return `#${issue.number}: ${issue.title}${labels}`;
}

/** Format a project item as a one-line summary. */
export function formatItem(item: ProjectItem): string {
  const num = item.content.number ? `#${item.content.number}` : "draft";
  const status = item.fieldValues.get("Status");
  const statusStr = status?.type === "single_select" ? ` (${status.name})` : "";
  return `${num}: ${item.content.title}${statusStr}`;
}

// ── User Interaction ────────────────────────────────────────────────

/** Ask the user for confirmation (y/n). Returns true if confirmed. */
export async function confirm(message: string): Promise<boolean> {
  process.stdout.write(`${message} [y/N] `);

  for await (const line of console) {
    const answer = line.trim().toLowerCase();
    return answer === "y" || answer === "yes";
  }

  return false;
}
