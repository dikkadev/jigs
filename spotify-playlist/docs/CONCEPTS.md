# spotify-playlist — Concepts

## Spotify OAuth & Scopes

Spotify uses OAuth 2.0. Every API call requires a **Bearer token** (access token).

Access tokens expire after **1 hour**. For scripts that run infrequently, you can manually generate a token via the [Spotify Developer Dashboard](https://developer.spotify.com/dashboard). For long-running or automated scripts, use the **refresh token flow** — the library handles this automatically when `SPOTIFY_CLIENT_ID`, `SPOTIFY_CLIENT_SECRET`, and `SPOTIFY_REFRESH_TOKEN` are set.

### Required Scopes

| Scope | What it enables |
|---|---|
| `playlist-read-private` | Read private playlists |
| `playlist-read-collaborative` | Read collaborative playlists |
| `playlist-modify-public` | Create/edit public playlists |
| `playlist-modify-private` | Create/edit private playlists |
| `user-read-private` | Read user profile |

## Snapshot IDs

Every playlist has a **snapshot ID** — an opaque string that changes whenever the playlist is modified (tracks added, removed, reordered, or metadata changed).

Write operations return the new snapshot ID. You can pass a snapshot ID to `reorderTracks` as an optimistic concurrency check — if the playlist changed since you read it, the API will reject the operation.

## Track URIs vs IDs

Spotify uses two identifier formats:

- **ID**: `4uLU6hMCjMI75M1A2tKUQC` (alphanumeric, used in API paths)
- **URI**: `spotify:track:4uLU6hMCjMI75M1A2tKUQC` (prefixed, used in request bodies for add/remove)

The library accepts both (plus full URLs) everywhere and converts internally. When adding or removing tracks, the API expects URIs — the library's `toTrackUri()` helper handles conversion.

## Pagination

Spotify list endpoints return paginated results:

```json
{
  "items": [...],
  "total": 150,
  "limit": 50,
  "offset": 0,
  "next": "https://api.spotify.com/v1/me/playlists?offset=50&limit=50",
  "previous": null
}
```

The library follows `next` URLs automatically to fetch all results. Pass `limit`/`offset` explicitly to get a single page instead.

## Rate Limiting

Spotify enforces rate limits per app. When exceeded, the API returns HTTP 429 with a `Retry-After` header.

The library retries **once** after the specified delay. If the retry also fails, it throws a `RateLimitError` with `retryAfterSeconds` so you can decide what to do.

## Null Tracks in Playlists

A `SpotifyPlaylistTrack` may have `track: null`. This happens when a track has been **removed from Spotify** (e.g., licensing expired, artist took it down) but still exists as a playlist entry. Always check for `null` when iterating playlist tracks:

```ts
const items = await spotify.getPlaylistTracks("id");
const validTracks = items.filter(i => i.track !== null);
```

## Batching

Two API endpoints have per-request limits:

- **Add/remove tracks**: max 100 per request
- **Get multiple tracks**: max 50 per request

The library batches automatically — pass any number of items and it splits into the right number of requests.

## Idempotency

| Operation | Idempotent? | Notes |
|---|---|---|
| `addTracks` | **No** | Adding the same track twice creates a duplicate |
| `removeTracks` | Yes | Removing a track not in the playlist is a no-op |
| `createPlaylist` | **No** | Creates a new playlist every time |
| `updatePlaylistDetails` | Yes | Setting the same value is a no-op |
| `reorderTracks` | **No** | Positions are relative to current state |
