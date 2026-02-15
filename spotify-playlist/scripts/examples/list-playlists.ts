#!/usr/bin/env bun
/**
 * List all of the current user's playlists.
 *
 * Usage:
 *   bun run scripts/examples/list-playlists.ts
 */

import { connect } from "../../src/index.js";
import { printTable } from "../_utils.js";

try {
  const spotify = await connect();
  const playlists = await spotify.getMyPlaylists();

  console.log(`Found ${playlists.length} playlists:\n`);

  printTable([
    ["Name", "Tracks", "Owner", "Public"],
    ["────", "──────", "─────", "──────"],
    ...playlists.map((p) => [
      p.name,
      String(p.totalTracks),
      p.owner.displayName ?? p.owner.id,
      p.public ? "yes" : "no",
    ]),
  ]);
} catch (error) {
  console.error("Error:", error instanceof Error ? error.message : error);
  process.exit(1);
}
