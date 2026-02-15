# spotify-playlist — API Reference

All exports are available from `src/index.ts`.

---

## Connection

### `connect(options?: ConnectOptions): Promise<SpotifyClient>`

Create a connected client. Resolves credentials from: explicit options → env vars → `.env` file.

**ConnectOptions:**
| Field | Type | Env Var | Description |
|---|---|---|---|
| `accessToken` | `string` | `SPOTIFY_ACCESS_TOKEN` | OAuth access token |
| `clientId` | `string` | `SPOTIFY_CLIENT_ID` | Client ID for token refresh |
| `clientSecret` | `string` | `SPOTIFY_CLIENT_SECRET` | Client secret for token refresh |
| `refreshToken` | `string` | `SPOTIFY_REFRESH_TOKEN` | Refresh token for auto-renewal |

---

## SpotifyClient Methods

### User

#### `getCurrentUser(): Promise<SpotifyUser>`
Get the authenticated user's profile. Cached after first call.

---

### Playlists

#### `getMyPlaylists(options?: ListPlaylistsOptions): Promise<SpotifyPlaylist[]>`
List the current user's playlists. Fetches all by default.

| Option | Type | Default | Description |
|---|---|---|---|
| `limit` | `number` | all | Max playlists to return |
| `offset` | `number` | `0` | Pagination offset |

#### `getPlaylist(playlistId: string): Promise<SpotifyPlaylist>`
Get a single playlist. Accepts ID, URI, or URL.

#### `getPlaylistTracks(playlistId: string, options?: GetPlaylistTracksOptions): Promise<SpotifyPlaylistTrack[]>`
Get tracks in a playlist. Fetches all by default.

| Option | Type | Default | Description |
|---|---|---|---|
| `limit` | `number` | all | Max tracks to return |
| `offset` | `number` | `0` | Pagination offset |
| `market` | `string` | — | ISO country code for market filtering |

#### `createPlaylist(name: string, options?: CreatePlaylistOptions, dryRun?: boolean): Promise<SpotifyPlaylist | DryRunResult>`
Create a new playlist for the current user.

| Option | Type | Default | Description |
|---|---|---|---|
| `description` | `string` | `""` | Playlist description |
| `public` | `boolean` | `false` | Public visibility |
| `collaborative` | `boolean` | `false` | Collaborative mode |

#### `updatePlaylistDetails(playlistId: string, updates: UpdatePlaylistOptions, dryRun?: boolean): Promise<void | DryRunResult>`
Update a playlist's metadata.

| Update | Type | Description |
|---|---|---|
| `name` | `string` | New name |
| `description` | `string` | New description |
| `public` | `boolean` | New visibility |
| `collaborative` | `boolean` | New collaborative mode |

#### `addTracks(playlistId: string, trackIds: string[], options?: AddTracksOptions, dryRun?: boolean): Promise<AddTracksResult | DryRunResult>`
Add tracks to a playlist. Accepts IDs, URIs, or URLs. Auto-batches >100.

| Option | Type | Default | Description |
|---|---|---|---|
| `position` | `number` | append | Insert position |

**Returns:** `{ snapshotId: string }`

#### `removeTracks(playlistId: string, trackIds: string[], dryRun?: boolean): Promise<RemoveTracksResult | DryRunResult>`
Remove all occurrences of given tracks. Accepts IDs, URIs, or URLs. Auto-batches >100.

**Returns:** `{ snapshotId: string }`

#### `reorderTracks(playlistId: string, rangeStart: number, insertBefore: number, options?: ReorderTracksOptions, dryRun?: boolean): Promise<ReorderTracksResult | DryRunResult>`
Reorder tracks within a playlist.

| Option | Type | Default | Description |
|---|---|---|---|
| `rangeLength` | `number` | `1` | Number of tracks to move |
| `snapshotId` | `string` | — | Optimistic concurrency check |

**Returns:** `{ snapshotId: string }`

---

### Search

#### `search(query: string, options?: SearchOptions): Promise<SearchResults>`
Search Spotify.

| Option | Type | Default | Description |
|---|---|---|---|
| `types` | `SearchType[]` | `["track"]` | Entity types to search |
| `limit` | `number` | `20` | Results per type (1–50) |
| `offset` | `number` | `0` | Pagination offset |
| `market` | `string` | — | Market filter |

**SearchType:** `"track" | "artist" | "album"`

**Returns:** `{ tracks: SpotifyTrack[], artists: SpotifyArtistFull[], albums: SpotifyAlbum[] }`

---

### Lookups

#### `getTrack(trackId: string): Promise<SpotifyTrack>`
Get a single track. Accepts ID, URI, or URL.

#### `getTracks(trackIds: string[]): Promise<SpotifyTrack[]>`
Batch get tracks (auto-batches >50).

#### `getArtist(artistId: string): Promise<SpotifyArtistFull>`
Get a full artist profile with genres, popularity, and followers.

#### `getAlbum(albumId: string): Promise<SpotifyAlbum>`
Get an album.

---

## Helpers

#### `parseSpotifyId(input: string, expectedType?: string): string`
Extract a bare ID from an ID, URI, or URL.

#### `toTrackUri(input: string): string`
Convert any track identifier to a `spotify:track:xxx` URI.

#### `toTrackUris(inputs: string[]): string[]`
Batch convert track identifiers to URIs.

---

## Error Classes

All extend `SpotifyError`.

| Class | When | Key Fields |
|---|---|---|
| `SpotifyError` | Base class | `message` |
| `AuthError` | 401/403, missing/expired token | `retryable: boolean` |
| `NotFoundError` | 404, resource doesn't exist | `resourceType`, `resourceId` |
| `RateLimitError` | 429 after retry | `retryAfterSeconds` |
| `ValidationError` | Invalid input before request | `field`, `reason` |

---

## Types

### Domain Entities
- `SpotifyImage` — `{ url, height, width }`
- `SpotifyUser` — `{ id, displayName, uri }`
- `SpotifyPlaylist` — `{ id, name, description, uri, owner, public, collaborative, totalTracks, images, snapshotId, externalUrl }`
- `SpotifyArtist` — `{ id, name, uri }` (simplified, as embedded in tracks)
- `SpotifyArtistFull` — extends `SpotifyArtist` with `{ genres, popularity, images, followers }`
- `SpotifyAlbum` — `{ id, name, uri, releaseDate, totalTracks, images }`
- `SpotifyTrack` — `{ id, name, uri, artists, album, durationMs, popularity, trackNumber, discNumber, explicit, previewUrl, externalUrl }`
- `SpotifyPlaylistTrack` — `{ addedAt, addedBy, track }` (track may be `null` if removed from Spotify)

### Result Types
- `AddTracksResult` — `{ snapshotId }`
- `RemoveTracksResult` — `{ snapshotId }`
- `ReorderTracksResult` — `{ snapshotId }`
- `SearchResults` — `{ tracks, artists, albums }`
- `DryRunResult<T>` — `{ operation, summary, params }`
