/**
 * SpotifyClient — the main entry point for interacting with the Spotify API.
 *
 * Create a client via `connect()`, then call methods to read/write playlists,
 * search, and look up tracks/artists.
 */

import { ApiConfig, SpotifyApi } from "./api.js";
import { AuthError } from "./errors.js";
import * as playlistOps from "./operations/playlists.js";
import * as searchOps from "./operations/search.js";
import * as trackOps from "./operations/tracks.js";
import type {
  AddTracksOptions,
  AddTracksResult,
  ConnectOptions,
  CreatePlaylistOptions,
  DryRunResult,
  GetPlaylistTracksOptions,
  ListPlaylistsOptions,
  RemoveTracksResult,
  ReorderTracksOptions,
  ReorderTracksResult,
  SearchOptions,
  SearchResults,
  SpotifyAlbum,
  SpotifyArtistFull,
  SpotifyPlaylist,
  SpotifyPlaylistTrack,
  SpotifyTrack,
  SpotifyUser,
  UpdatePlaylistOptions,
} from "./types.js";
import { mapUser } from "./mappers.js";

export class SpotifyClient {
  private readonly api: SpotifyApi;
  private cachedUser: SpotifyUser | null = null;

  /** @internal Use `connect()` to create a client. */
  constructor(api: SpotifyApi) {
    this.api = api;
  }

  // ── User ─────────────────────────────────────────────────────────

  /**
   * Get the current authenticated user's profile.
   *
   * @example
   * ```ts
   * const me = await spotify.getCurrentUser();
   * console.log(`Logged in as ${me.displayName} (${me.id})`);
   * ```
   */
  async getCurrentUser(): Promise<SpotifyUser> {
    if (this.cachedUser) return this.cachedUser;
    const raw = await this.api.get("/me");
    this.cachedUser = mapUser(raw);
    return this.cachedUser;
  }

  // ── Playlists ────────────────────────────────────────────────────

  /**
   * List the current user's playlists.
   *
   * Fetches all by default (handles pagination). Pass `limit`/`offset` for a single page.
   *
   * @example
   * ```ts
   * const playlists = await spotify.getMyPlaylists();
   * for (const p of playlists) {
   *   console.log(`${p.name} — ${p.totalTracks} tracks`);
   * }
   * ```
   */
  async getMyPlaylists(options?: ListPlaylistsOptions): Promise<SpotifyPlaylist[]> {
    return playlistOps.getMyPlaylists(this.api, options);
  }

  /**
   * Get a playlist by ID, URI, or URL.
   *
   * @example
   * ```ts
   * const p = await spotify.getPlaylist("37i9dQZF1DXcBWIGoYBM5M");
   * console.log(p.name);
   * ```
   */
  async getPlaylist(playlistId: string): Promise<SpotifyPlaylist> {
    return playlistOps.getPlaylist(this.api, playlistId);
  }

  /**
   * Get tracks in a playlist.
   *
   * Fetches all by default. Pass `limit`/`offset` for a single page.
   *
   * @example
   * ```ts
   * const items = await spotify.getPlaylistTracks("37i9dQZF1DXcBWIGoYBM5M");
   * const names = items.filter(i => i.track).map(i => i.track!.name);
   * ```
   */
  async getPlaylistTracks(
    playlistId: string,
    options?: GetPlaylistTracksOptions,
  ): Promise<SpotifyPlaylistTrack[]> {
    return playlistOps.getPlaylistTracks(this.api, playlistId, options);
  }

  /**
   * Create a new playlist for the current user.
   *
   * @param dryRun - Pass `true` to see what would be created without creating it.
   *
   * @example
   * ```ts
   * const playlist = await spotify.createPlaylist("Road Trip", {
   *   description: "Songs for the drive",
   * });
   * console.log(playlist.externalUrl);
   * ```
   */
  async createPlaylist(
    name: string,
    options?: CreatePlaylistOptions,
    dryRun?: boolean,
  ): Promise<SpotifyPlaylist | DryRunResult<{ name: string } & CreatePlaylistOptions>> {
    const user = await this.getCurrentUser();
    return playlistOps.createPlaylist(this.api, user.id, name, options, dryRun);
  }

  /**
   * Update a playlist's name, description, or visibility.
   *
   * @example
   * ```ts
   * await spotify.updatePlaylistDetails("playlist-id", { name: "New Name" });
   * ```
   */
  async updatePlaylistDetails(
    playlistId: string,
    updates: UpdatePlaylistOptions,
    dryRun?: boolean,
  ): Promise<void | DryRunResult<UpdatePlaylistOptions>> {
    return playlistOps.updatePlaylistDetails(this.api, playlistId, updates, dryRun);
  }

  /**
   * Add tracks to a playlist.
   *
   * Accepts track IDs, URIs, or URLs. Batches automatically if > 100 tracks.
   *
   * @example
   * ```ts
   * await spotify.addTracks("playlist-id", [
   *   "spotify:track:4uLU6hMCjMI75M1A2tKUQC",
   *   "3n3Ppam7vgaVa1iaRUc9Lp",
   * ]);
   * ```
   */
  async addTracks(
    playlistId: string,
    trackIds: string[],
    options?: AddTracksOptions,
    dryRun?: boolean,
  ): Promise<AddTracksResult | DryRunResult<{ uris: string[]; position?: number }>> {
    return playlistOps.addTracks(this.api, playlistId, trackIds, options, dryRun);
  }

  /**
   * Remove tracks from a playlist.
   *
   * Removes all occurrences. Accepts IDs, URIs, or URLs.
   *
   * @example
   * ```ts
   * await spotify.removeTracks("playlist-id", ["spotify:track:4uLU6hMCjMI75M1A2tKUQC"]);
   * ```
   */
  async removeTracks(
    playlistId: string,
    trackIds: string[],
    dryRun?: boolean,
  ): Promise<RemoveTracksResult | DryRunResult<{ uris: string[] }>> {
    return playlistOps.removeTracks(this.api, playlistId, trackIds, dryRun);
  }

  /**
   * Reorder tracks within a playlist.
   *
   * @example
   * ```ts
   * // Move the first track to position 5
   * await spotify.reorderTracks("playlist-id", 0, 5);
   * ```
   */
  async reorderTracks(
    playlistId: string,
    rangeStart: number,
    insertBefore: number,
    options?: ReorderTracksOptions,
    dryRun?: boolean,
  ): Promise<ReorderTracksResult | DryRunResult<Record<string, number | string | undefined>>> {
    return playlistOps.reorderTracks(this.api, playlistId, rangeStart, insertBefore, options, dryRun);
  }

  // ── Search ───────────────────────────────────────────────────────

  /**
   * Search Spotify for tracks, artists, and/or albums.
   *
   * @example
   * ```ts
   * const { tracks } = await spotify.search("bohemian rhapsody");
   * console.log(tracks[0]?.name);
   * ```
   */
  async search(query: string, options?: SearchOptions): Promise<SearchResults> {
    return searchOps.search(this.api, query, options);
  }

  // ── Track / Artist / Album Lookups ───────────────────────────────

  /**
   * Get a track by ID, URI, or URL.
   *
   * @example
   * ```ts
   * const track = await spotify.getTrack("4uLU6hMCjMI75M1A2tKUQC");
   * ```
   */
  async getTrack(trackId: string): Promise<SpotifyTrack> {
    return trackOps.getTrack(this.api, trackId);
  }

  /**
   * Get multiple tracks in a single request (max 50 per batch, batches automatically).
   *
   * @example
   * ```ts
   * const tracks = await spotify.getTracks(["id1", "id2", "id3"]);
   * ```
   */
  async getTracks(trackIds: string[]): Promise<SpotifyTrack[]> {
    return trackOps.getTracks(this.api, trackIds);
  }

  /**
   * Get a full artist profile (includes genres, popularity, followers).
   *
   * @example
   * ```ts
   * const artist = await spotify.getArtist("0OdUWJ0sBjDrqHygGUXeCF");
   * console.log(`${artist.name}: ${artist.genres.join(", ")}`);
   * ```
   */
  async getArtist(artistId: string): Promise<SpotifyArtistFull> {
    return trackOps.getArtist(this.api, artistId);
  }

  /**
   * Get an album by ID, URI, or URL.
   *
   * @example
   * ```ts
   * const album = await spotify.getAlbum("6dVIqQ8qmQ5GBnJ9shOYGE");
   * ```
   */
  async getAlbum(albumId: string): Promise<SpotifyAlbum> {
    return trackOps.getAlbum(this.api, albumId);
  }
}

// ── connect() ──────────────────────────────────────────────────────

/**
 * Create a connected Spotify client.
 *
 * Configuration is resolved in priority order:
 * 1. Explicit `options` passed here
 * 2. Environment variables (`SPOTIFY_ACCESS_TOKEN`, `SPOTIFY_CLIENT_ID`, etc.)
 * 3. `.env` file in the working directory
 *
 * **Minimal usage** (token in env):
 * ```ts
 * const spotify = await connect();
 * ```
 *
 * **With explicit token**:
 * ```ts
 * const spotify = await connect({ accessToken: "BQD..." });
 * ```
 *
 * **With auto-refresh** (recommended for long-running scripts):
 * ```ts
 * const spotify = await connect({
 *   clientId: "your-client-id",
 *   clientSecret: "your-client-secret",
 *   refreshToken: "your-refresh-token",
 * });
 * ```
 *
 * ### Required Spotify Scopes
 *
 * The token must have these scopes for full functionality:
 * - `playlist-read-private` — read private playlists
 * - `playlist-read-collaborative` — read collaborative playlists
 * - `playlist-modify-public` — create/modify public playlists
 * - `playlist-modify-private` — create/modify private playlists
 * - `user-read-private` — read user profile
 */
export async function connect(options?: ConnectOptions): Promise<SpotifyClient> {
  const accessToken =
    options?.accessToken ?? process.env.SPOTIFY_ACCESS_TOKEN ?? "";
  const clientId = options?.clientId ?? process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = options?.clientSecret ?? process.env.SPOTIFY_CLIENT_SECRET;
  const refreshToken = options?.refreshToken ?? process.env.SPOTIFY_REFRESH_TOKEN;

  if (!accessToken && !(clientId && clientSecret && refreshToken)) {
    throw new AuthError(
      "No Spotify credentials found. Set SPOTIFY_ACCESS_TOKEN or provide SPOTIFY_CLIENT_ID + SPOTIFY_CLIENT_SECRET + SPOTIFY_REFRESH_TOKEN.",
    );
  }

  const config: ApiConfig = { accessToken, clientId, clientSecret, refreshToken };

  // If we only have refresh credentials and no access token, do an initial refresh
  if (!accessToken && clientId && clientSecret && refreshToken) {
    const api = new SpotifyApi({ ...config, accessToken: "pending" });
    // Force a refresh by triggering the refresh flow
    const body = new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    });
    const res = await fetch("https://accounts.spotify.com/api/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${btoa(`${clientId}:${clientSecret}`)}`,
      },
      body,
    });
    if (!res.ok) {
      throw new AuthError("Failed to obtain initial access token from refresh token.");
    }
    const data = (await res.json()) as { access_token: string };
    config.accessToken = data.access_token;
  }

  const api = new SpotifyApi(config);
  return new SpotifyClient(api);
}
