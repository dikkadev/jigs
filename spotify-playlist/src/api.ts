/**
 * Internal HTTP layer for authenticated Spotify API calls.
 * Handles token management, rate-limit retries, and error mapping.
 * Not part of the public API.
 */

import { AuthError, NotFoundError, RateLimitError, SpotifyError } from "./errors.js";

const BASE_URL = "https://api.spotify.com/v1";
const TOKEN_URL = "https://accounts.spotify.com/api/token";

export interface ApiConfig {
  accessToken: string;
  clientId?: string;
  clientSecret?: string;
  refreshToken?: string;
}

/**
 * Wraps the Spotify API with authentication and error handling.
 * Automatically retries once on 429 (rate limit) and refreshes the token on 401 when credentials are available.
 */
export class SpotifyApi {
  private accessToken: string;
  private readonly clientId?: string;
  private readonly clientSecret?: string;
  private readonly refreshToken?: string;

  constructor(config: ApiConfig) {
    this.accessToken = config.accessToken;
    this.clientId = config.clientId;
    this.clientSecret = config.clientSecret;
    this.refreshToken = config.refreshToken;
  }

  /** Whether automatic token refresh is available. */
  get canRefresh(): boolean {
    return !!(this.clientId && this.clientSecret && this.refreshToken);
  }

  /**
   * Make an authenticated GET request.
   * @param path - API path relative to `https://api.spotify.com/v1` (e.g. `/me/playlists`).
   * @param params - Query string parameters.
   */
  async get<T = unknown>(path: string, params?: Record<string, string | number | undefined>): Promise<T> {
    const url = this.buildUrl(path, params);
    return this.request<T>(url, { method: "GET" });
  }

  /** Authenticated POST request with a JSON body. */
  async post<T = unknown>(path: string, body?: unknown): Promise<T> {
    const url = this.buildUrl(path);
    return this.request<T>(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  }

  /** Authenticated PUT request with a JSON body. */
  async put<T = unknown>(path: string, body?: unknown): Promise<T> {
    const url = this.buildUrl(path);
    return this.request<T>(url, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  }

  /** Authenticated DELETE request with a JSON body. */
  async delete<T = unknown>(path: string, body?: unknown): Promise<T> {
    const url = this.buildUrl(path);
    return this.request<T>(url, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  }

  /**
   * Paginate through all results of a list endpoint.
   * Follows `next` URLs until exhausted.
   */
  async paginate<T>(path: string, params?: Record<string, string | number | undefined>): Promise<T[]> {
    const items: T[] = [];
    let url: string | null = this.buildUrl(path, params);

    while (url) {
      const page: { items: T[]; next: string | null } = await this.request(url, { method: "GET" });
      items.push(...page.items);
      url = page.next;
    }

    return items;
  }

  // ── Internals ──────────────────────────────────────────────────────

  private buildUrl(path: string, params?: Record<string, string | number | undefined>): string {
    const url = new URL(path.startsWith("http") ? path : `${BASE_URL}${path}`);
    if (params) {
      for (const [key, value] of Object.entries(params)) {
        if (value !== undefined) url.searchParams.set(key, String(value));
      }
    }
    return url.toString();
  }

  private async request<T>(url: string, init: RequestInit, isRetry = false): Promise<T> {
    const headers = new Headers(init.headers);
    headers.set("Authorization", `Bearer ${this.accessToken}`);

    const res = await fetch(url, { ...init, headers });

    // Rate limited — wait and retry once
    if (res.status === 429 && !isRetry) {
      const retryAfter = Number(res.headers.get("Retry-After") ?? "1");
      await new Promise((r) => setTimeout(r, retryAfter * 1000));
      return this.request<T>(url, init, true);
    }

    if (res.status === 429) {
      const retryAfter = Number(res.headers.get("Retry-After") ?? "1");
      throw new RateLimitError(retryAfter);
    }

    // Unauthorized — try refreshing the token
    if (res.status === 401 && !isRetry && this.canRefresh) {
      await this.refreshAccessToken();
      return this.request<T>(url, init, true);
    }

    if (res.status === 401) {
      throw new AuthError(
        "Spotify access token is invalid or expired. Set SPOTIFY_ACCESS_TOKEN or provide refresh credentials.",
        this.canRefresh,
      );
    }

    if (res.status === 403) {
      throw new AuthError("Insufficient permissions. Check your Spotify token scopes.");
    }

    if (res.status === 404) {
      // Try to extract the resource type from the URL path
      const resourceType = this.inferResourceType(url);
      const resourceId = url.split("/").pop()?.split("?")[0] ?? "unknown";
      throw new NotFoundError(resourceType, resourceId);
    }

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new SpotifyError(`Spotify API error ${res.status}: ${body}`);
    }

    // 204 No Content (e.g. PUT playlist details)
    if (res.status === 204) {
      return undefined as T;
    }

    return res.json() as Promise<T>;
  }

  private async refreshAccessToken(): Promise<void> {
    if (!this.clientId || !this.clientSecret || !this.refreshToken) {
      throw new AuthError("Cannot refresh token: missing client credentials.");
    }

    const body = new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: this.refreshToken,
    });

    const res = await fetch(TOKEN_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${btoa(`${this.clientId}:${this.clientSecret}`)}`,
      },
      body,
    });

    if (!res.ok) {
      throw new AuthError("Failed to refresh Spotify access token. Check your client credentials.");
    }

    const data = (await res.json()) as { access_token: string };
    this.accessToken = data.access_token;
  }

  private inferResourceType(url: string): "playlist" | "track" | "artist" | "album" | "user" {
    if (url.includes("/playlists")) return "playlist";
    if (url.includes("/tracks")) return "track";
    if (url.includes("/artists")) return "artist";
    if (url.includes("/albums")) return "album";
    return "user";
  }
}
