/**
 * Base error for all github-projects jig errors.
 * Catch this to handle any error from the library.
 *
 * @example
 * ```ts
 * try {
 *   await gh.getProject(99);
 * } catch (e) {
 *   if (e instanceof GitHubProjectsError) console.error(e.message);
 * }
 * ```
 */
export class GitHubProjectsError extends Error {
  override readonly name: string = "GitHubProjectsError";

  constructor(message: string) {
    super(message);
  }
}

/**
 * Thrown when `gh` CLI is not available or authentication fails.
 *
 * Common fix: `gh auth login` or `gh auth refresh -s project`.
 */
export class AuthError extends GitHubProjectsError {
  override readonly name: string = "AuthError";
}

/**
 * Thrown when a requested resource (issue, project, field, option) does not exist.
 *
 * @example
 * ```ts
 * catch (e) {
 *   if (e instanceof NotFoundError) {
 *     console.error(`${e.resourceType} not found: ${e.resourceId}`);
 *   }
 * }
 * ```
 */
export class NotFoundError extends GitHubProjectsError {
  override readonly name = "NotFoundError";

  constructor(
    public readonly resourceType: "issue" | "project" | "field" | "option" | "iteration",
    public readonly resourceId: string | number,
  ) {
    super(`${resourceType} not found: ${resourceId}`);
  }
}

/**
 * Thrown when input validation fails before a request is sent.
 *
 * @example
 * ```ts
 * catch (e) {
 *   if (e instanceof ValidationError) {
 *     console.error(`Invalid ${e.field}: ${e.reason}`);
 *   }
 * }
 * ```
 */
export class ValidationError extends GitHubProjectsError {
  override readonly name = "ValidationError";

  constructor(
    public readonly field: string,
    public readonly reason: string,
  ) {
    super(`Validation failed for "${field}": ${reason}`);
  }
}

/**
 * Thrown when the `gh` CLI command fails.
 * Contains the stderr output and exit code.
 */
export class GhCliError extends GitHubProjectsError {
  override readonly name = "GhCliError";

  constructor(
    public readonly command: string,
    public readonly stderr: string,
    public readonly exitCode: number,
  ) {
    super(`gh command failed (exit ${exitCode}): ${stderr.trim()}`);
  }
}

/**
 * Thrown when a required `gh` auth scope is missing.
 *
 * Fix: `gh auth refresh -s <scope>`.
 */
export class MissingScopeError extends AuthError {
  override readonly name = "MissingScopeError";

  constructor(public readonly scope: string) {
    super(`Missing required gh auth scope: "${scope}". Run: gh auth refresh -s ${scope}`);
  }
}
