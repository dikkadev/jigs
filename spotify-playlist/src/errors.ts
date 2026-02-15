/**
 * Base error for all Spotify jig errors.
 * Catch this to handle any error from the library.
 *
 * @example
 * ```ts
 * try {
 *   await spotify.getPlaylist("bad-id");
 * } catch (e) {
 *   if (e instanceof SpotifyError) console.error(e.message);
 * }
 * ```
 */
export class SpotifyError extends Error {
  override readonly name: string = "SpotifyError";

  constructor(message: string) {
    super(message);
  }
}

/**
 * Thrown when authentication fails — the access token is missing, expired, or lacks required scopes.
 *
 * If `retryable` is true, the token may have just expired and a retry after refresh could work.
 *
 * @example
 * ```ts
 * catch (e) {
 *   if (e instanceof AuthError && e.retryable) {
 *     // Token expired — reconnect or refresh
 *   }
 * }
 * ```
 */
export class AuthError extends SpotifyError {
  override readonly name = "AuthError";

  constructor(
    message: string,
    public readonly retryable: boolean = false,
  ) {
    super(message);
  }
}

/**
 * Thrown when a requested resource (playlist, track, artist, album) does not exist.
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
export class NotFoundError extends SpotifyError {
  override readonly name = "NotFoundError";

  constructor(
    public readonly resourceType: "playlist" | "track" | "artist" | "album" | "user",
    public readonly resourceId: string,
  ) {
    super(`${resourceType} not found: ${resourceId}`);
  }
}

/**
 * Thrown when the Spotify API rate limit is hit (HTTP 429).
 *
 * The library automatically retries once after the `retryAfterSeconds` delay,
 * but throws this if the retry also fails.
 */
export class RateLimitError extends SpotifyError {
  override readonly name = "RateLimitError";

  constructor(
    public readonly retryAfterSeconds: number,
  ) {
    super(`Rate limited by Spotify. Retry after ${retryAfterSeconds}s.`);
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
export class ValidationError extends SpotifyError {
  override readonly name = "ValidationError";

  constructor(
    public readonly field: string,
    public readonly reason: string,
  ) {
    super(`Validation failed for "${field}": ${reason}`);
  }
}
