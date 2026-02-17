/**
 * Low-level wrapper around the `gh` CLI.
 *
 * All interaction with GitHub goes through this module — either via
 * `gh` subcommands or `gh api graphql` for complex queries.
 *
 * @internal Not part of the public API. Scripts should use the client.
 */

import { AuthError, GhCliError, MissingScopeError } from "./errors.js";

// ── Shell Execution ─────────────────────────────────────────────────

/** Run a `gh` command and return stdout as a string. */
export async function gh(args: string[]): Promise<string> {
  const proc = Bun.spawn(["gh", ...args], {
    stdout: "pipe",
    stderr: "pipe",
  });

  const [stdout, stderr] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
  ]);

  const exitCode = await proc.exited;

  if (exitCode !== 0) {
    // Detect auth issues
    if (stderr.includes("gh auth login") || stderr.includes("not logged in")) {
      throw new AuthError(`gh CLI not authenticated. Run: gh auth login`);
    }
    if (stderr.includes("insufficient scope") || stderr.includes("INSUFFICIENT_SCOPES")) {
      // Try to extract the missing scope
      const scopeMatch = stderr.match(/scope[s]?.*['"](\w+)['"]/i);
      if (scopeMatch?.[1]) {
        throw new MissingScopeError(scopeMatch[1]);
      }
      throw new MissingScopeError("project");
    }
    throw new GhCliError(["gh", ...args].join(" "), stderr, exitCode);
  }

  return stdout;
}

/** Run a `gh` command and parse stdout as JSON. */
export async function ghJson<T>(args: string[]): Promise<T> {
  const stdout = await gh(args);
  return JSON.parse(stdout) as T;
}

// ── GraphQL ─────────────────────────────────────────────────────────

/**
 * Execute a GraphQL query via `gh api graphql`.
 *
 * @param query - The GraphQL query/mutation string
 * @param variables - Variables to pass (as -f for strings, -F for numbers/booleans)
 * @returns The parsed `data` object from the response
 */
export async function graphql<T>(
  query: string,
  variables?: Record<string, string | number | boolean>,
): Promise<T> {
  const args = ["api", "graphql", "-f", `query=${query}`];

  if (variables) {
    for (const [key, value] of Object.entries(variables)) {
      if (typeof value === "string") {
        args.push("-f", `${key}=${value}`);
      } else {
        // -F for non-string values (numbers, booleans) — gh parses them as JSON
        args.push("-F", `${key}=${value}`);
      }
    }
  }

  const result = await ghJson<{ data: T; errors?: Array<{ message: string }> }>(args);

  if (result.errors?.length) {
    throw new GhCliError(
      "gh api graphql",
      result.errors.map((e) => e.message).join("; "),
      1,
    );
  }

  return result.data;
}

// ── REST ─────────────────────────────────────────────────────────────

/**
 * Execute a REST API call via `gh api`.
 *
 * @param path - API path (e.g. `repos/owner/repo/issues`)
 * @param options - HTTP method and fields
 * @returns Parsed JSON response
 *
 * @see https://docs.github.com/en/rest
 */
export async function rest<T>(
  path: string,
  options?: {
    method?: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
    fields?: Record<string, string | number | boolean | string[]>;
    jq?: string;
  },
): Promise<T> {
  const args = ["api", path];

  if (options?.method && options.method !== "GET") {
    args.push("-X", options.method);
  }

  if (options?.fields) {
    for (const [key, value] of Object.entries(options.fields)) {
      if (Array.isArray(value)) {
        for (const item of value) {
          args.push("-f", `${key}[]=${item}`);
        }
      } else if (typeof value === "string") {
        args.push("-f", `${key}=${value}`);
      } else {
        args.push("-F", `${key}=${value}`);
      }
    }
  }

  if (options?.jq) {
    args.push("--jq", options.jq);
  }

  return ghJson<T>(args);
}

// ── Repo Detection ──────────────────────────────────────────────────

/** Detect owner/repo from the current git remote. */
export async function detectRepo(): Promise<{ owner: string; repo: string }> {
  try {
    // gh repo view --json nameWithOwner is the most reliable way
    const result = await ghJson<{ nameWithOwner: string }>(["repo", "view", "--json", "nameWithOwner"]);
    const [owner, repo] = result.nameWithOwner.split("/");
    if (!owner || !repo) {
      throw new Error("Unexpected format");
    }
    return { owner, repo };
  } catch {
    throw new AuthError(
      "Could not detect repository from current directory. " +
        "Make sure you're in a git repo with a GitHub remote, or pass owner/repo explicitly.",
    );
  }
}

// ── Auth Check ──────────────────────────────────────────────────────

/** Check that `gh` is authenticated and has the required scopes. */
export async function checkAuth(): Promise<void> {
  try {
    const stdout = await gh(["auth", "status"]);
    // Check for project scope
    if (!stdout.includes("project") && !stdout.includes("'project'")) {
      // Try checking via token scopes
      const tokenInfo = await gh(["auth", "token", "--hostname", "github.com"]).catch(() => "");
      if (tokenInfo && !tokenInfo.includes("project")) {
        console.warn(
          "⚠ The 'project' scope may be missing. If project operations fail, run: gh auth refresh -s project",
        );
      }
    }
  } catch (e) {
    if (e instanceof AuthError) throw e;
    throw new AuthError("gh CLI not found or not authenticated. Install gh and run: gh auth login");
  }
}
