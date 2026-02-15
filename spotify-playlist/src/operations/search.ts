/**
 * Spotify search operations.
 */

import type { SpotifyApi } from "../api.js";
import { mapAlbum, mapArtistFull, mapTrack } from "../mappers.js";
import type { SearchOptions, SearchResults } from "../types.js";

/**
 * Search Spotify for tracks, artists, and/or albums.
 *
 * By default searches for tracks only. Pass `types` to search other entities.
 *
 * @example
 * ```ts
 * // Search for tracks
 * const { tracks } = await spotify.search("bohemian rhapsody");
 * console.log(tracks[0]?.name);
 *
 * // Search for artists and albums
 * const results = await spotify.search("radiohead", {
 *   types: ["artist", "album"],
 *   limit: 5,
 * });
 * ```
 */
export async function search(
  api: SpotifyApi,
  query: string,
  options?: SearchOptions,
): Promise<SearchResults> {
  const types = options?.types ?? ["track"];

  const data = await api.get<Record<string, { items: unknown[] }>>("/search", {
    q: query,
    type: types.join(","),
    limit: options?.limit ?? 20,
    offset: options?.offset,
    market: options?.market,
  });

  return {
    tracks: (data.tracks?.items ?? []).map(mapTrack),
    artists: (data.artists?.items ?? []).map(mapArtistFull),
    albums: (data.albums?.items ?? []).map(mapAlbum),
  };
}
