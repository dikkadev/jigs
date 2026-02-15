# spotify-playlist — Guide

## Mental Model

Everything starts with `connect()`, which returns a `SpotifyClient`. The client is the single entry point for all operations. It handles authentication, pagination, rate limiting, and error mapping internally.

```
connect() → SpotifyClient → call methods → get typed results
```

## Typical Workflow

```ts
import { connect } from "../src/index.js";

// 1. Connect (reads credentials from env)
const spotify = await connect();

// 2. Read data
const playlists = await spotify.getMyPlaylists();
const tracks = await spotify.getPlaylistTracks(playlists[0]!.id);

// 3. Write data (with dry-run support)
await spotify.createPlaylist("New Playlist", { description: "..." });
await spotify.addTracks("playlist-id", tracks.map(t => t.track!.uri));
```

## Identifiers

The library accepts Spotify resources in three formats — no parsing needed:

| Format | Example |
|---|---|
| Bare ID | `37i9dQZF1DXcBWIGoYBM5M` |
| URI | `spotify:playlist:37i9dQZF1DXcBWIGoYBM5M` |
| URL | `https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M` |

This works for playlists, tracks, artists, and albums.

## Pagination

List operations (`getMyPlaylists`, `getPlaylistTracks`) fetch **all results** by default. This is usually what you want.

To paginate manually, pass `limit` and `offset`:

```ts
// First 20 playlists
const page = await spotify.getMyPlaylists({ limit: 20, offset: 0 });
```

## Dry-Run

Write methods (`createPlaylist`, `addTracks`, `removeTracks`, `reorderTracks`, `updatePlaylistDetails`) accept a `dryRun` parameter. When `true`, they return a `DryRunResult` describing what would happen without doing it:

```ts
const result = await spotify.addTracks("playlist-id", trackUris, {}, true);
// result = { operation: "addTracks", summary: "Would add 5 track(s)...", params: {...} }
console.log(result.summary);
```

## Error Handling

All errors extend `SpotifyError`. Catch specific types for targeted handling:

```ts
import { AuthError, NotFoundError, RateLimitError } from "../src/index.js";

try {
  await spotify.getPlaylist("bad-id");
} catch (e) {
  if (e instanceof NotFoundError) {
    console.log(`${e.resourceType} not found: ${e.resourceId}`);
  } else if (e instanceof AuthError) {
    console.log("Token expired or invalid");
  }
}
```

## Common Patterns

### Export a playlist as data
```ts
const items = await spotify.getPlaylistTracks("playlist-id");
const data = items.filter(i => i.track).map(i => ({
  name: i.track!.name,
  artists: i.track!.artists.map(a => a.name),
  uri: i.track!.uri,
}));
```

### Copy tracks between playlists
```ts
const source = await spotify.getPlaylistTracks("source-id");
const uris = source.filter(i => i.track).map(i => i.track!.uri);
await spotify.addTracks("destination-id", uris);
```

### Search and add
```ts
const { tracks } = await spotify.search("bohemian rhapsody", { limit: 1 });
if (tracks[0]) {
  await spotify.addTracks("playlist-id", [tracks[0].uri]);
}
```

### Deduplicate a playlist
```ts
const items = await spotify.getPlaylistTracks("playlist-id");
const seen = new Set<string>();
const dupes: string[] = [];
for (const item of items) {
  if (!item.track) continue;
  if (seen.has(item.track.uri)) dupes.push(item.track.uri);
  else seen.add(item.track.uri);
}
if (dupes.length > 0) {
  await spotify.removeTracks("playlist-id", dupes);
}
```
