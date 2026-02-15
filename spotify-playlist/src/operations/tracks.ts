/**
 * Track, artist, and album lookup operations.
 */

import type { SpotifyApi } from "../api.js";
import { parseSpotifyId } from "../helpers.js";
import { mapAlbum, mapArtistFull, mapTrack } from "../mappers.js";
import type { SpotifyAlbum, SpotifyArtistFull, SpotifyTrack } from "../types.js";

/**
 * Get a single track by ID, URI, or URL.
 *
 * @example
 * ```ts
 * const track = await spotify.getTrack("4uLU6hMCjMI75M1A2tKUQC");
 * console.log(`${track.name} by ${track.artists.map(a => a.name).join(", ")}`);
 * ```
 */
export async function getTrack(api: SpotifyApi, trackId: string): Promise<SpotifyTrack> {
  const id = parseSpotifyId(trackId, "track");
  const raw = await api.get(`/tracks/${id}`);
  return mapTrack(raw);
}

/**
 * Get multiple tracks in one request (max 50).
 *
 * @example
 * ```ts
 * const tracks = await spotify.getTracks(["4uLU6hMCjMI75M1A2tKUQC", "3n3Ppam7vgaVa1iaRUc9Lp"]);
 * ```
 */
export async function getTracks(api: SpotifyApi, trackIds: string[]): Promise<SpotifyTrack[]> {
  const ids = trackIds.map((t) => parseSpotifyId(t, "track"));

  const results: SpotifyTrack[] = [];
  // Batch in groups of 50 (Spotify limit)
  for (let i = 0; i < ids.length; i += 50) {
    const batch = ids.slice(i, i + 50);
    const data = await api.get<{ tracks: unknown[] }>("/tracks", { ids: batch.join(",") });
    results.push(...data.tracks.filter(Boolean).map(mapTrack));
  }

  return results;
}

/**
 * Get a full artist profile by ID, URI, or URL.
 *
 * Includes genres, popularity, follower count, and images.
 *
 * @example
 * ```ts
 * const artist = await spotify.getArtist("0OdUWJ0sBjDrqHygGUXeCF");
 * console.log(`${artist.name}: ${artist.genres.join(", ")}`);
 * ```
 */
export async function getArtist(api: SpotifyApi, artistId: string): Promise<SpotifyArtistFull> {
  const id = parseSpotifyId(artistId, "artist");
  const raw = await api.get(`/artists/${id}`);
  return mapArtistFull(raw);
}

/**
 * Get an album by ID, URI, or URL.
 *
 * @example
 * ```ts
 * const album = await spotify.getAlbum("6dVIqQ8qmQ5GBnJ9shOYGE");
 * console.log(`${album.name} (${album.totalTracks} tracks)`);
 * ```
 */
export async function getAlbum(api: SpotifyApi, albumId: string): Promise<SpotifyAlbum> {
  const id = parseSpotifyId(albumId, "album");
  const raw = await api.get(`/albums/${id}`);
  return mapAlbum(raw);
}
