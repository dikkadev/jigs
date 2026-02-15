/**
 * # spotify-playlist
 *
 * A TypeScript library for reading and writing Spotify playlist data.
 * Designed for AI coding agents to write short, validated scripts.
 *
 * ## Quick Start
 *
 * ```ts
 * import { connect } from "./src/index.js";
 *
 * const spotify = await connect(); // reads SPOTIFY_ACCESS_TOKEN from env
 * const playlists = await spotify.getMyPlaylists();
 * console.log(playlists.map(p => p.name));
 * ```
 *
 * ## Documentation
 *
 * - `docs/GUIDE.md` — Mental model and usage patterns
 * - `docs/API.md` — Complete API reference
 * - `docs/EXAMPLES.md` — Curated script examples
 * - `docs/CONCEPTS.md` — Spotify domain concepts
 */

// ── Client ─────────────────────────────────────────────────────────
export { connect, SpotifyClient } from "./client.js";

// ── Types ──────────────────────────────────────────────────────────
export type {
  // Domain entities
  SpotifyImage,
  SpotifyUser,
  SpotifyPlaylist,
  SpotifyArtist,
  SpotifyArtistFull,
  SpotifyAlbum,
  SpotifyTrack,
  SpotifyPlaylistTrack,

  // Options
  ConnectOptions,
  ListPlaylistsOptions,
  GetPlaylistTracksOptions,
  CreatePlaylistOptions,
  UpdatePlaylistOptions,
  AddTracksOptions,
  ReorderTracksOptions,
  SearchOptions,
  SearchType,

  // Results
  SearchResults,
  AddTracksResult,
  RemoveTracksResult,
  ReorderTracksResult,
  DryRunResult,
} from "./types.js";

// ── Errors ─────────────────────────────────────────────────────────
export {
  SpotifyError,
  AuthError,
  NotFoundError,
  RateLimitError,
  ValidationError,
} from "./errors.js";

// ── Helpers (for advanced use) ─────────────────────────────────────
export { parseSpotifyId, toTrackUri, toTrackUris } from "./helpers.js";
