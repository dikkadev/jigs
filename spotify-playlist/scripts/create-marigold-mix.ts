#!/usr/bin/env bun
/**
 * Create a "Marigold Mix" playlist — Marigold by Jelani Aryeh at the top,
 * followed by related tracks in random order.
 *
 * Usage:
 *   bun run scripts/create-marigold-mix.ts [--dry-run] [--help]
 */

import { parseArgs } from "node:util";
import { connect } from "../src/index.js";
import { formatTrack } from "./_utils.js";

const { values: flags } = parseArgs({
  options: {
    "dry-run": { type: "boolean", default: false },
    help: { type: "boolean", short: "h", default: false },
  },
  strict: true,
});

if (flags.help) {
  console.log(`
Create a "Marigold Mix" playlist.

Marigold by Jelani Aryeh at position 1, then all related tracks shuffled.

Options:
  --dry-run   Show what would happen without making changes
  -h, --help  Show this help message
`);
  process.exit(0);
}

const dryRun = flags["dry-run"] ?? false;

// [track name, artist] — order doesn't matter for these, they get shuffled
const songs: [string, string][] = [
  ["Everytime", "Boy Pablo"],
  ["Can I Call You Tonight?", "Dayglow"],
  ["American Spirits", "Inner Wave"],
  ["Young", "Vacations"],
  ["Dark Red", "Steve Lacy"],
  ["Clear Bones", "Jean Dawson"],
  ["Cola", "Arlo Parks"],
  ["Empty", "Kevin Abstract"],
  ["Nice Boys", "TEMPOREX"],
  ["ily (i love you baby)", "Surf Mesa"],
  ["Prune, You Talk Funny", "Gus Dapperton"],
  ["Coffee", "beabadoobee"],
  ["ZIG ZAGGING", "Asha Imuno"],
  ["RIDE AGAIN", "Jasper Typical"],
  ["Lover Boy", "Phum Viphurit"],
  ["Show Me How", "Men I Trust"],
  ["Sink into the Floor", "Feng Suave"],
  ["Lo Que Siento", "Cuco"],
  ["You", "Mk.gee"],
  ["Goodie Bag", "Still Woozy"],
  ["Evergreen", "Omar Apollo"],
  ["You Say I'm In Love", "Bane's World"],
  ["In My Head", "Bedroom"],
  ["Dorothy", "Hers"],
  ["Cold War", "Cautious Clay"],
  ["3 Nights", "Dominic Fike"],
  ["Personal", "Emotional Oranges"],
  ["Social Sites", "Cosmo Pyke"],
  ["Get You", "Daniel Caesar"],
  ["Coca Cola", "Divino Niño"],
  ["Blind", "ROLE MODEL"],
  ["Jealous", "Eyedress"],
  ["Superbike", "Jay Som"],
  ["Mountain", "Monsune"],
];

// Fisher-Yates shuffle
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
}

try {
  const spotify = await connect();

  // Search for Marigold first
  console.log("Searching for tracks...\n");

  const { tracks: marigoldResults } = await spotify.search(
    "Marigold Jelani Aryeh",
    { limit: 1 },
  );

  if (marigoldResults.length === 0) {
    console.error("Could not find Marigold by Jelani Aryeh!");
    process.exit(1);
  }

  const marigold = marigoldResults[0]!;
  console.log(`  1. ${formatTrack(marigold)}`);

  // Search for the rest
  const foundTracks: { uri: string; name: string; artist: string }[] = [];
  const notFound: [string, string][] = [];

  for (const [track, artist] of songs) {
    // Try field-filtered search first, then fall back to unfiltered
    let { tracks } = await spotify.search(`track:${track} artist:${artist}`, { limit: 3 });

    // Check if any result is a reasonable match (track name contains our search term)
    const trackLower = track.toLowerCase();
    let match = tracks.find((t) =>
      t.name.toLowerCase().includes(trackLower) ||
      trackLower.includes(t.name.toLowerCase()),
    );

    // Fallback: unfiltered search
    if (!match) {
      const fallback = await spotify.search(`${track} ${artist}`, { limit: 5 });
      match = fallback.tracks.find((t) =>
        t.name.toLowerCase().includes(trackLower) ||
        trackLower.includes(t.name.toLowerCase()),
      );
      // If still no name match, take the first result from fallback
      if (!match && fallback.tracks.length > 0) {
        match = fallback.tracks[0]!;
      }
    }

    if (match) {
      foundTracks.push({
        uri: match.uri,
        name: match.name,
        artist: match.artists.map((a) => a.name).join(", "),
      });
    } else {
      notFound.push([track, artist]);
    }
  }

  // Shuffle the found tracks
  const shuffled = shuffle(foundTracks);

  // Print the full tracklist
  for (const [i, t] of shuffled.entries()) {
    console.log(`  ${String(i + 2).padStart(3)}. ${t.name} — ${t.artist}`);
  }

  if (notFound.length > 0) {
    console.log(`\nCould not find ${notFound.length} track(s):`);
    for (const [track, artist] of notFound) {
      console.log(`  - ${track} — ${artist}`);
    }
  }

  const totalTracks = 1 + shuffled.length;
  console.log(`\nTotal: ${totalTracks} tracks`);

  if (dryRun) {
    console.log(`\n[dry-run] Would create playlist "Marigold Mix" with ${totalTracks} tracks.`);
    process.exit(0);
  }

  // Create playlist and add tracks
  const playlist = await spotify.createPlaylist("Marigold Mix", {
    description: "Marigold by Jelani Aryeh + related indie vibes",
  });

  if ("operation" in playlist) {
    process.exit(0);
  }

  const uris = [marigold.uri, ...shuffled.map((t) => t.uri)];
  await spotify.addTracks(playlist.id, uris);

  console.log(`\nCreated playlist "${playlist.name}" with ${totalTracks} tracks.`);
  console.log(`URL: ${playlist.externalUrl}`);
} catch (error) {
  console.error("Error:", error instanceof Error ? error.message : error);
  process.exit(1);
}
