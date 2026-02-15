#!/usr/bin/env bun
/**
 * Export a playlist's tracks to JSON on stdout.
 *
 * Usage:
 *   bun run scripts/examples/export-playlist.ts <playlist-id-or-url>
 *   bun run scripts/examples/export-playlist.ts 37i9dQZF1DXcBWIGoYBM5M > playlist.json
 */

import { connect } from "../../src/index.js";

const playlistId = process.argv[2];
if (!playlistId) {
  console.error("Usage: bun run scripts/examples/export-playlist.ts <playlist-id-or-url>");
  process.exit(1);
}

try {
  const spotify = await connect();
  const playlist = await spotify.getPlaylist(playlistId);
  const items = await spotify.getPlaylistTracks(playlistId);

  const tracks = items
    .filter((item) => item.track !== null)
    .map((item) => ({
      name: item.track!.name,
      artists: item.track!.artists.map((a) => a.name),
      album: item.track!.album.name,
      uri: item.track!.uri,
      durationMs: item.track!.durationMs,
      addedAt: item.addedAt,
    }));

  const output = {
    playlist: {
      id: playlist.id,
      name: playlist.name,
      description: playlist.description,
      owner: playlist.owner.displayName ?? playlist.owner.id,
      totalTracks: playlist.totalTracks,
      url: playlist.externalUrl,
    },
    tracks,
    exportedAt: new Date().toISOString(),
  };

  console.log(JSON.stringify(output, null, 2));
} catch (error) {
  console.error("Error:", error instanceof Error ? error.message : error);
  process.exit(1);
}
