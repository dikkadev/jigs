# Domain: Spotify Playlists

## What This Is

A library for interacting with the Spotify Web API, focused on playlist operations (reading and writing playlist data). This is the Spotify component of a larger agent system — other data sources may be added alongside it.

## Entities

### Playlist
A collection of tracks owned by a user. Has a name, description, public/private visibility, and a snapshot ID that changes on every modification.

### Track
A single song. Has a name, duration, artists, album, popularity score, and a URI used to reference it in API calls.

### Artist
A music creator. Has a name, genres, popularity, and follower count.

### Album
A collection of tracks released together. Has a name, release date, cover art, and track count.

### User
A Spotify account. Playlists are owned by users.

## Operations

### Read
- **List playlists** — get the current user's playlists (paginated, fetches all by default)
- **Get playlist** — get a single playlist's metadata
- **Get playlist tracks** — get all tracks in a playlist (paginated, fetches all by default)
- **Search** — find tracks, artists, or albums by text query
- **Get track** — look up a single track by ID
- **Get tracks** — batch look up multiple tracks
- **Get artist** — look up an artist with genres and stats
- **Get album** — look up an album

### Write
- **Create playlist** — create a new playlist for the current user
- **Update playlist** — change name, description, or visibility
- **Add tracks** — append or insert tracks (batches >100 automatically)
- **Remove tracks** — remove all occurrences of given tracks
- **Reorder tracks** — move tracks within a playlist

### Destructive
- Remove tracks is the most destructive operation. There is no "unfollow playlist" in this library yet.

## Transport

REST API over HTTPS. Base URL: `https://api.spotify.com/v1`.

Authentication: OAuth 2.0 Bearer token. The library accepts a direct access token or client credentials with a refresh token for automatic renewal.

## Constraints

- Access tokens expire after 1 hour. Use refresh token flow for long sessions.
- Rate limits: Spotify returns HTTP 429 with a `Retry-After` header. The library retries once automatically.
- Playlist track operations are limited to 100 items per request (library batches automatically).
- Track batch lookups are limited to 50 per request (library batches automatically).
- Playlist IDs can be passed as bare IDs, Spotify URIs, or open.spotify.com URLs — the library normalises them.
