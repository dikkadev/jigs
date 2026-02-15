# spotify-playlist — Examples

## 1. List all playlists

```ts
import { connect } from "../src/index.js";

const spotify = await connect();
const playlists = await spotify.getMyPlaylists();

for (const p of playlists) {
  console.log(`${p.name} — ${p.totalTracks} tracks (${p.public ? "public" : "private"})`);
}
```

## 2. Export a playlist to JSON

```ts
import { connect } from "../src/index.js";

const spotify = await connect();
const items = await spotify.getPlaylistTracks("37i9dQZF1DXcBWIGoYBM5M");

const data = items
  .filter((i) => i.track)
  .map((i) => ({
    name: i.track!.name,
    artists: i.track!.artists.map((a) => a.name),
    album: i.track!.album.name,
    uri: i.track!.uri,
    durationMs: i.track!.durationMs,
  }));

console.log(JSON.stringify(data, null, 2));
```

## 3. Create a playlist from search results

```ts
import { connect } from "../src/index.js";

const spotify = await connect();

const { tracks } = await spotify.search("90s alternative rock", { limit: 25 });
const playlist = await spotify.createPlaylist("90s Alt Rock Mix", {
  description: "Top search results for 90s alternative rock",
});

if (!("operation" in playlist)) {
  await spotify.addTracks(
    playlist.id,
    tracks.map((t) => t.uri),
  );
  console.log(`Created: ${playlist.externalUrl}`);
}
```

## 4. Deduplicate a playlist

```ts
import { connect } from "../src/index.js";

const spotify = await connect();
const playlistId = "your-playlist-id";

const items = await spotify.getPlaylistTracks(playlistId);
const seen = new Set<string>();
const duplicateUris: string[] = [];

for (const item of items) {
  if (!item.track) continue;
  if (seen.has(item.track.uri)) {
    duplicateUris.push(item.track.uri);
  } else {
    seen.add(item.track.uri);
  }
}

if (duplicateUris.length === 0) {
  console.log("No duplicates found.");
} else {
  console.log(`Found ${duplicateUris.length} duplicate(s). Removing...`);
  await spotify.removeTracks(playlistId, duplicateUris);
  console.log("Done.");
}
```

## 5. Copy tracks from one playlist to another

```ts
import { connect } from "../src/index.js";

const spotify = await connect();

const sourceId = "source-playlist-id";
const destId = "destination-playlist-id";

const items = await spotify.getPlaylistTracks(sourceId);
const uris = items.filter((i) => i.track).map((i) => i.track!.uri);

console.log(`Copying ${uris.length} tracks...`);
await spotify.addTracks(destId, uris);
console.log("Done.");
```

## 6. Search and display results

```ts
import { connect } from "../src/index.js";

const spotify = await connect();

const { tracks, artists } = await spotify.search("daft punk", {
  types: ["track", "artist"],
  limit: 5,
});

console.log("Tracks:");
for (const t of tracks) {
  const mins = Math.floor(t.durationMs / 60000);
  const secs = Math.floor((t.durationMs % 60000) / 1000);
  console.log(`  ${t.name} — ${t.artists.map((a) => a.name).join(", ")} [${mins}:${String(secs).padStart(2, "0")}]`);
}

console.log("\nArtists:");
for (const a of artists) {
  console.log(`  ${a.name} — ${a.genres.slice(0, 3).join(", ")} (${a.followers.toLocaleString()} followers)`);
}
```

## 7. Dry-run: preview adding tracks

```ts
import { connect } from "../src/index.js";

const spotify = await connect();

const result = await spotify.addTracks(
  "playlist-id",
  ["spotify:track:4uLU6hMCjMI75M1A2tKUQC", "spotify:track:3n3Ppam7vgaVa1iaRUc9Lp"],
  {},
  true, // dry-run
);

if ("operation" in result) {
  console.log(result.summary);
  // "Would add 2 track(s) to playlist ..."
}
```
