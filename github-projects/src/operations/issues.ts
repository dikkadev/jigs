/**
 * Issue operations — create, get, search, update.
 *
 * Uses `gh issue` subcommands where possible, falls back to `gh api` for
 * operations not covered by the CLI (e.g. getting node IDs).
 *
 * @internal
 */

import { NotFoundError, ValidationError } from "../errors.js";
import * as cli from "../gh.js";
import type { CreateIssueInput, GitHubIssue } from "../types.js";

// ── Types for gh CLI JSON output ────────────────────────────────────

interface GhIssueJson {
  number: number;
  id: string; // node ID
  title: string;
  body: string;
  state: string;
  labels: Array<{ name: string }>;
  assignees: Array<{ login: string }>;
  milestone: { title: string } | null;
  url: string;
  createdAt: string;
  updatedAt: string;
}

// ── Mappers ─────────────────────────────────────────────────────────

function mapIssue(raw: GhIssueJson): GitHubIssue {
  return {
    number: raw.number,
    nodeId: raw.id,
    title: raw.title,
    body: raw.body || null,
    state: raw.state.toLowerCase() === "open" ? "open" : "closed",
    labels: raw.labels.map((l) => l.name),
    assignees: raw.assignees.map((a) => a.login),
    milestone: raw.milestone?.title ?? null,
    url: raw.url,
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt,
  };
}

// ── Operations ──────────────────────────────────────────────────────

const ISSUE_FIELDS = "number,id,title,body,state,labels,assignees,milestone,url,createdAt,updatedAt";

/**
 * Get a single issue by number.
 *
 * @see https://cli.github.com/manual/gh_issue_view
 */
export async function getIssue(
  owner: string,
  repo: string,
  issueNumber: number,
): Promise<GitHubIssue> {
  try {
    const raw = await cli.ghJson<GhIssueJson>([
      "issue",
      "view",
      String(issueNumber),
      "-R",
      `${owner}/${repo}`,
      "--json",
      ISSUE_FIELDS,
    ]);
    return mapIssue(raw);
  } catch (e) {
    if (e instanceof Error && e.message.includes("not found")) {
      throw new NotFoundError("issue", issueNumber);
    }
    throw e;
  }
}

/**
 * Search for issues in a repo by text query.
 *
 * @see https://cli.github.com/manual/gh_issue_list
 */
export async function searchIssues(
  owner: string,
  repo: string,
  query: string,
  options?: { limit?: number; state?: "open" | "closed" | "all" },
): Promise<GitHubIssue[]> {
  const limit = options?.limit ?? 30;
  const state = options?.state ?? "all";

  const args = [
    "issue",
    "list",
    "-R",
    `${owner}/${repo}`,
    "--search",
    query,
    "--state",
    state,
    "--json",
    ISSUE_FIELDS,
    "-L",
    String(limit),
  ];

  const raw = await cli.ghJson<GhIssueJson[]>(args);
  return raw.map(mapIssue);
}

/**
 * Create a new issue.
 *
 * @see https://cli.github.com/manual/gh_issue_create
 */
export async function createIssue(
  owner: string,
  repo: string,
  input: CreateIssueInput,
): Promise<GitHubIssue> {
  if (!input.title.trim()) {
    throw new ValidationError("title", "Issue title cannot be empty");
  }

  const args = [
    "issue",
    "create",
    "-R",
    `${owner}/${repo}`,
    "--title",
    input.title,
  ];

  if (input.body) {
    args.push("--body", input.body);
  }

  if (input.labels?.length) {
    for (const label of input.labels) {
      args.push("--label", label);
    }
  }

  if (input.assignees?.length) {
    for (const assignee of input.assignees) {
      args.push("--assignee", assignee);
    }
  }

  if (input.milestone != null) {
    args.push("--milestone", String(input.milestone));
  }

  // gh issue create returns the URL of the created issue
  const output = await cli.gh(args);
  const urlMatch = output.trim().match(/https:\/\/github\.com\/[^\s]+/);

  if (!urlMatch) {
    throw new Error(`Unexpected gh issue create output: ${output}`);
  }

  // Extract issue number from URL
  const numberMatch = urlMatch[0].match(/\/issues\/(\d+)/);
  if (!numberMatch?.[1]) {
    throw new Error(`Could not parse issue number from URL: ${urlMatch[0]}`);
  }

  // Fetch the full issue data
  return getIssue(owner, repo, Number.parseInt(numberMatch[1], 10));
}

/**
 * Get the node ID for an issue (needed by `addProjectV2ItemById`).
 *
 * Uses the GraphQL API since `gh issue view --json id` returns the node ID.
 *
 * @see https://docs.github.com/en/graphql/reference/objects#issue
 */
export async function getIssueNodeId(
  owner: string,
  repo: string,
  issueNumber: number,
): Promise<string> {
  const issue = await getIssue(owner, repo, issueNumber);
  return issue.nodeId;
}

/**
 * List recent issues in a repo (for fuzzy matching fallback).
 *
 * @see https://cli.github.com/manual/gh_issue_list
 */
export async function listRecentIssues(
  owner: string,
  repo: string,
  limit: number = 100,
): Promise<GitHubIssue[]> {
  const raw = await cli.ghJson<GhIssueJson[]>([
    "issue",
    "list",
    "-R",
    `${owner}/${repo}`,
    "--state",
    "all",
    "--json",
    ISSUE_FIELDS,
    "-L",
    String(limit),
  ]);
  return raw.map(mapIssue);
}
