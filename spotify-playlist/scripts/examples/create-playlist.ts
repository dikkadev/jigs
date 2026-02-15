#!/usr/bin/env bun
/**
 * Create a new playlist from a search query.
 * Searches for tracks matching the query and adds the top results.
 *
 * Usage:
 *   bun run scripts/examples/create-playlist.ts "My Playlist" "search query" [--count 10] [--dry-run]
 */

import { parseArgs } from "node:util";
import { connect } from "../../src/index.js";
import { formatTrack } from "../_utils.js";

const { values: flags, positionals } = parseArgs({
  options: {
    "dry-run": { type: "boolean", default: false },
    count: { type: "string", default: "10" },
    help: { type: "boolean", short: "h", default: false },
  },
  allowPositionals: true,
  strict: true,
});

if (flags.help || positionals.length < 2) {
  console.log(`
Create a playlist from search results.

Usage:
  bun run scripts/examples/create-playlist.ts "Playlist Name" "search query" [options]

Options:
  --count N   Number of tracks to add (default: 10)
  --dry-run   Show what would happen without making changes
  -h, --help  Show this help message
`);
  process.exit(flags.help ? 0 : 1);
}

const [playlistName, searchQuery] = positionals as [string, string];
const count = Number.parseInt(flags.count ?? "10", 10);
const dryRun = flags["dry-run"] ?? false;

try {
  const spotify = await connect();

  // Search for tracks
  const { tracks } = await spotify.search(searchQuery, { limit: count });

  if (tracks.length === 0) {
    console.log(`No tracks found for "${searchQuery}".`);
    process.exit(0);
  }

  console.log(`Found ${tracks.length} tracks for "${searchQuery}":\n`);
  for (const [i, track] of tracks.entries()) {
    console.log(formatTrack(track, i));
  }

  if (dryRun) {
    console.log(`\n[dry-run] Would create playlist "${playlistName}" with ${tracks.length} tracks.`);
    process.exit(0);
  }

  // Create the playlist and add tracks
  const playlist = await spotify.createPlaylist(playlistName, {
    description: `Created from search: "${searchQuery}"`,
  });

  if ("operation" in playlist) {
    // shouldn't happen when dryRun is false, but satisfies types
    process.exit(0);
  }

  await spotify.addTracks(playlist.id, tracks.map((t) => t.uri));

  console.log(`\nCreated playlist "${playlist.name}" with ${tracks.length} tracks.`);
  console.log(`URL: ${playlist.externalUrl}`);
} catch (error) {
  console.error("Error:", error instanceof Error ? error.message : error);
  process.exit(1);
}
