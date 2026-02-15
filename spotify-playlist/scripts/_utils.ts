/**
 * Shared utilities for scripts.
 */

import type { SpotifyTrack } from "../src/index.js";

/** Format a track duration from milliseconds to `m:ss`. */
export function formatDuration(ms: number): string {
  const minutes = Math.floor(ms / 60_000);
  const seconds = Math.floor((ms % 60_000) / 1000);
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

/** Format a track as a single readable line. */
export function formatTrack(track: SpotifyTrack, index?: number): string {
  const prefix = index !== undefined ? `${String(index + 1).padStart(3, ".")} ` : "";
  const artists = track.artists.map((a) => a.name).join(", ");
  const duration = formatDuration(track.durationMs);
  return `${prefix}${track.name} — ${artists} [${duration}]`;
}

/** Print a simple table to stdout. */
export function printTable(rows: string[][]): void {
  if (rows.length === 0) return;

  const colWidths = rows[0]!.map((_, colIdx) =>
    Math.max(...rows.map((row) => (row[colIdx] ?? "").length)),
  );

  for (const row of rows) {
    const line = row.map((cell, i) => cell.padEnd(colWidths[i]!)).join("  ");
    console.log(line);
  }
}

/** Ask for confirmation on stdin. Returns true if the user types 'y' or 'yes'. */
export async function confirm(message: string): Promise<boolean> {
  process.stdout.write(`${message} [y/N] `);
  for await (const line of console) {
    const answer = line.trim().toLowerCase();
    return answer === "y" || answer === "yes";
  }
  return false;
}
