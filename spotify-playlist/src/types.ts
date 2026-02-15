// ── Spotify Domain Types ─────────────────────────────────────────────

/** Minimal image object returned by the Spotify API. */
export interface SpotifyImage {
  /** Direct URL to the image. */
  url: string;
  /** Image height in pixels (may be `null` for some sizes). */
  height: number | null;
  /** Image width in pixels (may be `null` for some sizes). */
  width: number | null;
}

/** A Spotify user profile (the owner of a playlist, or the current user). */
export interface SpotifyUser {
  /** The Spotify user ID (e.g. `"smedjan"`). */
  id: string;
  /** Display name (may be `null` if not set). */
  displayName: string | null;
  /** Spotify URI (e.g. `"spotify:user:smedjan"`). */
  uri: string;
}

/** Summary of a playlist as returned in list endpoints. */
export interface SpotifyPlaylist {
  /** The Spotify playlist ID. */
  id: string;
  /** Playlist name. */
  name: string;
  /** Playlist description (HTML-encoded by Spotify). */
  description: string;
  /** Spotify URI (e.g. `"spotify:playlist:37i9..."`). */
  uri: string;
  /** Who owns this playlist. */
  owner: SpotifyUser;
  /** Whether the playlist is public. */
  public: boolean | null;
  /** Whether the playlist is collaborative. */
  collaborative: boolean;
  /** Total number of tracks (available without fetching them all). */
  totalTracks: number;
  /** Cover images in descending size order. */
  images: SpotifyImage[];
  /**
   * A snapshot ID — an opaque string that changes whenever the playlist is modified.
   * Useful for conditional updates and caching.
   */
  snapshotId: string;
  /** The external Spotify URL for this playlist. */
  externalUrl: string;
}

/** A simplified artist object (as embedded in tracks). */
export interface SpotifyArtist {
  /** The Spotify artist ID. */
  id: string;
  /** Artist name. */
  name: string;
  /** Spotify URI. */
  uri: string;
}

/** A full artist profile with genres and popularity. */
export interface SpotifyArtistFull extends SpotifyArtist {
  /** List of genre strings (e.g. `["indie rock", "shoegaze"]`). */
  genres: string[];
  /** 0–100 popularity score. */
  popularity: number;
  /** Artist images. */
  images: SpotifyImage[];
  /** Total follower count. */
  followers: number;
}

/** A simplified album object (as embedded in tracks). */
export interface SpotifyAlbum {
  /** The Spotify album ID. */
  id: string;
  /** Album name. */
  name: string;
  /** Spotify URI. */
  uri: string;
  /** Release date string (precision varies: `"2024"`, `"2024-01"`, `"2024-01-15"`). */
  releaseDate: string;
  /** Total number of tracks on this album. */
  totalTracks: number;
  /** Album cover art. */
  images: SpotifyImage[];
}

/** A Spotify track. */
export interface SpotifyTrack {
  /** The Spotify track ID. */
  id: string;
  /** Track name. */
  name: string;
  /** Spotify URI (e.g. `"spotify:track:4uLU6h..."`). Use this when adding to playlists. */
  uri: string;
  /** Artists credited on this track. */
  artists: SpotifyArtist[];
  /** The album this track belongs to. */
  album: SpotifyAlbum;
  /** Track duration in milliseconds. */
  durationMs: number;
  /** 0–100 popularity score. */
  popularity: number;
  /** Track number on the album. */
  trackNumber: number;
  /** Disc number (for multi-disc albums). */
  discNumber: number;
  /** Whether the track has explicit lyrics. */
  explicit: boolean;
  /** 30-second preview URL (may be `null`). */
  previewUrl: string | null;
  /** External Spotify URL. */
  externalUrl: string;
}

/** A track inside a playlist, with metadata about when/who added it. */
export interface SpotifyPlaylistTrack {
  /** ISO 8601 timestamp of when this track was added. */
  addedAt: string;
  /** The user who added this track. */
  addedBy: SpotifyUser;
  /** The track data. `null` if the track has been removed from Spotify. */
  track: SpotifyTrack | null;
}

// ── Options & Results ────────────────────────────────────────────────

/** Options for listing the current user's playlists. */
export interface ListPlaylistsOptions {
  /** Max number of playlists to return. Omit to fetch all. */
  limit?: number;
  /** Offset for pagination (only used when `limit` is set). */
  offset?: number;
}

/** Options for fetching playlist tracks. */
export interface GetPlaylistTracksOptions {
  /** Max number of tracks to return. Omit to fetch all. */
  limit?: number;
  /** Offset for pagination (only used when `limit` is set). */
  offset?: number;
  /** ISO 3166-1 alpha-2 country code for market filtering. */
  market?: string;
}

/** Options for creating a new playlist. */
export interface CreatePlaylistOptions {
  /** Playlist description. */
  description?: string;
  /** Whether the playlist should be public. Defaults to `false`. */
  public?: boolean;
  /** Whether the playlist should be collaborative. Defaults to `false`. */
  collaborative?: boolean;
}

/** Options for updating an existing playlist's metadata. */
export interface UpdatePlaylistOptions {
  /** New playlist name. */
  name?: string;
  /** New playlist description. */
  description?: string;
  /** New public/private status. */
  public?: boolean;
  /** New collaborative status. */
  collaborative?: boolean;
}

/** Options for adding tracks to a playlist. */
export interface AddTracksOptions {
  /** Zero-based position to insert at. Omit to append. */
  position?: number;
}

/** Options for reordering tracks in a playlist. */
export interface ReorderTracksOptions {
  /** Number of tracks to move (default 1). */
  rangeLength?: number;
  /** Snapshot ID for optimistic concurrency. */
  snapshotId?: string;
}

/** Options for searching. */
export interface SearchOptions {
  /** What to search for: tracks, artists, albums. Defaults to `["track"]`. */
  types?: SearchType[];
  /** Max results per type (1–50, default 20). */
  limit?: number;
  /** Offset for pagination. */
  offset?: number;
  /** ISO 3166-1 alpha-2 country code for market filtering. */
  market?: string;
}

/** Searchable entity types. */
export type SearchType = "track" | "artist" | "album";

/** Search results grouped by type. */
export interface SearchResults {
  tracks: SpotifyTrack[];
  artists: SpotifyArtistFull[];
  albums: SpotifyAlbum[];
}

/** Result of adding tracks to a playlist. */
export interface AddTracksResult {
  /** The new snapshot ID after the change. */
  snapshotId: string;
}

/** Result of removing tracks from a playlist. */
export interface RemoveTracksResult {
  /** The new snapshot ID after the change. */
  snapshotId: string;
}

/** Result of reordering tracks in a playlist. */
export interface ReorderTracksResult {
  /** The new snapshot ID after the change. */
  snapshotId: string;
}

/** What a dry-run write operation would do, without actually doing it. */
export interface DryRunResult<T> {
  /** What would have been executed. */
  operation: string;
  /** Human-readable summary of the planned action. */
  summary: string;
  /** The parameters that would be sent. */
  params: T;
}

// ── Connection ───────────────────────────────────────────────────────

/**
 * Options for connecting to the Spotify API.
 *
 * All fields are optional — the library resolves configuration in this order:
 * 1. Explicit options passed here
 * 2. Environment variables (`SPOTIFY_ACCESS_TOKEN`, `SPOTIFY_CLIENT_ID`, etc.)
 * 3. `.env` file in the project root
 */
export interface ConnectOptions {
  /**
   * A valid Spotify access token with the required scopes.
   * Falls back to `SPOTIFY_ACCESS_TOKEN` env var.
   */
  accessToken?: string;

  /**
   * Spotify OAuth client ID — used together with `clientSecret` and `refreshToken`
   * to automatically refresh expired access tokens.
   * Falls back to `SPOTIFY_CLIENT_ID` env var.
   */
  clientId?: string;

  /**
   * Spotify OAuth client secret.
   * Falls back to `SPOTIFY_CLIENT_SECRET` env var.
   */
  clientSecret?: string;

  /**
   * Spotify OAuth refresh token — enables automatic token refresh.
   * Falls back to `SPOTIFY_REFRESH_TOKEN` env var.
   */
  refreshToken?: string;
}
