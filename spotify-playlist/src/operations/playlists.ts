/**
 * Playlist operations — list, get, create, update, add/remove/reorder tracks.
 */

import type { SpotifyApi } from "../api.js";
import { parseSpotifyId, toTrackUris } from "../helpers.js";
import { mapPlaylist, mapPlaylistTrack } from "../mappers.js";
import type {
  AddTracksOptions,
  AddTracksResult,
  CreatePlaylistOptions,
  DryRunResult,
  GetPlaylistTracksOptions,
  ListPlaylistsOptions,
  RemoveTracksResult,
  ReorderTracksOptions,
  ReorderTracksResult,
  SpotifyPlaylist,
  SpotifyPlaylistTrack,
  UpdatePlaylistOptions,
} from "../types.js";

/**
 * List the current user's playlists.
 *
 * By default fetches all playlists (handles pagination internally).
 * Pass `limit` and `offset` to fetch a single page instead.
 *
 * @example
 * ```ts
 * const playlists = await spotify.getMyPlaylists();
 * for (const p of playlists) {
 *   console.log(`${p.name} (${p.totalTracks} tracks)`);
 * }
 * ```
 */
export async function getMyPlaylists(
  api: SpotifyApi,
  options?: ListPlaylistsOptions,
): Promise<SpotifyPlaylist[]> {
  if (options?.limit !== undefined) {
    const data = await api.get<{ items: unknown[] }>("/me/playlists", {
      limit: options.limit,
      offset: options.offset ?? 0,
    });
    return data.items.map(mapPlaylist);
  }

  const raw = await api.paginate("/me/playlists", { limit: 50 });
  return raw.map(mapPlaylist);
}

/**
 * Get a single playlist by ID, URI, or URL.
 *
 * @example
 * ```ts
 * const playlist = await spotify.getPlaylist("37i9dQZF1DXcBWIGoYBM5M");
 * console.log(playlist.name, playlist.totalTracks);
 * ```
 */
export async function getPlaylist(
  api: SpotifyApi,
  playlistId: string,
): Promise<SpotifyPlaylist> {
  const id = parseSpotifyId(playlistId, "playlist");
  const raw = await api.get(`/playlists/${id}`);
  return mapPlaylist(raw);
}

/**
 * Get all tracks in a playlist.
 *
 * By default fetches every track (handles pagination internally).
 * Pass `limit` and `offset` to fetch a single page instead.
 *
 * @example
 * ```ts
 * const tracks = await spotify.getPlaylistTracks("37i9dQZF1DXcBWIGoYBM5M");
 * for (const item of tracks) {
 *   if (item.track) console.log(item.track.name);
 * }
 * ```
 */
export async function getPlaylistTracks(
  api: SpotifyApi,
  playlistId: string,
  options?: GetPlaylistTracksOptions,
): Promise<SpotifyPlaylistTrack[]> {
  const id = parseSpotifyId(playlistId, "playlist");

  const params: Record<string, string | number | undefined> = {
    market: options?.market,
  };

  if (options?.limit !== undefined) {
    params.limit = options.limit;
    params.offset = options.offset ?? 0;
    const data = await api.get<{ items: unknown[] }>(`/playlists/${id}/tracks`, params);
    return data.items.map(mapPlaylistTrack);
  }

  params.limit = 100; // max page size for playlist tracks
  const raw = await api.paginate(`/playlists/${id}/tracks`, params);
  return raw.map(mapPlaylistTrack);
}

/**
 * Create a new playlist for the current user.
 *
 * @param dryRun - If `true`, returns what would be created without actually creating it.
 *
 * @example
 * ```ts
 * const playlist = await spotify.createPlaylist("Road Trip", {
 *   description: "Songs for the drive",
 *   public: false,
 * });
 * console.log(`Created: ${playlist.externalUrl}`);
 * ```
 */
export async function createPlaylist(
  api: SpotifyApi,
  userId: string,
  name: string,
  options?: CreatePlaylistOptions,
  dryRun?: boolean,
): Promise<SpotifyPlaylist | DryRunResult<{ name: string } & CreatePlaylistOptions>> {
  const body = {
    name,
    description: options?.description ?? "",
    public: options?.public ?? false,
    collaborative: options?.collaborative ?? false,
  };

  if (dryRun) {
    return {
      operation: "createPlaylist",
      summary: `Would create playlist "${name}" (public: ${body.public}, collaborative: ${body.collaborative})`,
      params: body,
    };
  }

  const raw = await api.post(`/users/${userId}/playlists`, body);
  return mapPlaylist(raw);
}

/**
 * Update a playlist's name, description, or visibility.
 *
 * @example
 * ```ts
 * await spotify.updatePlaylistDetails("playlist-id", {
 *   name: "New Name",
 *   description: "Updated description",
 * });
 * ```
 */
export async function updatePlaylistDetails(
  api: SpotifyApi,
  playlistId: string,
  updates: UpdatePlaylistOptions,
  dryRun?: boolean,
): Promise<void | DryRunResult<UpdatePlaylistOptions>> {
  const id = parseSpotifyId(playlistId, "playlist");

  if (dryRun) {
    return {
      operation: "updatePlaylistDetails",
      summary: `Would update playlist ${id}: ${Object.entries(updates).map(([k, v]) => `${k}=${JSON.stringify(v)}`).join(", ")}`,
      params: updates,
    };
  }

  await api.put(`/playlists/${id}`, updates);
}

/**
 * Add tracks to a playlist.
 *
 * Accepts track IDs, URIs, or URLs — they are normalised internally.
 * Spotify allows max 100 tracks per request; this function batches automatically.
 *
 * @example
 * ```ts
 * const result = await spotify.addTracks("playlist-id", [
 *   "spotify:track:4uLU6hMCjMI75M1A2tKUQC",
 *   "3n3Ppam7vgaVa1iaRUc9Lp",
 * ]);
 * console.log(`Snapshot: ${result.snapshotId}`);
 * ```
 */
export async function addTracks(
  api: SpotifyApi,
  playlistId: string,
  trackIds: string[],
  options?: AddTracksOptions,
  dryRun?: boolean,
): Promise<AddTracksResult | DryRunResult<{ uris: string[]; position?: number }>> {
  const id = parseSpotifyId(playlistId, "playlist");
  const uris = toTrackUris(trackIds);

  if (dryRun) {
    return {
      operation: "addTracks",
      summary: `Would add ${uris.length} track(s) to playlist ${id}${options?.position !== undefined ? ` at position ${options.position}` : ""}`,
      params: { uris, position: options?.position },
    };
  }

  let lastSnapshot = "";

  // Batch in groups of 100 (Spotify limit)
  for (let i = 0; i < uris.length; i += 100) {
    const batch = uris.slice(i, i + 100);
    const body: Record<string, unknown> = { uris: batch };
    // Only set position for the first batch; subsequent batches append after
    if (i === 0 && options?.position !== undefined) {
      body.position = options.position;
    }
    const res = await api.post<{ snapshot_id: string }>(`/playlists/${id}/tracks`, body);
    lastSnapshot = res.snapshot_id;
  }

  return { snapshotId: lastSnapshot };
}

/**
 * Remove tracks from a playlist.
 *
 * Removes all occurrences of each track. Accepts IDs, URIs, or URLs.
 *
 * @example
 * ```ts
 * await spotify.removeTracks("playlist-id", [
 *   "spotify:track:4uLU6hMCjMI75M1A2tKUQC",
 * ]);
 * ```
 */
export async function removeTracks(
  api: SpotifyApi,
  playlistId: string,
  trackIds: string[],
  dryRun?: boolean,
): Promise<RemoveTracksResult | DryRunResult<{ uris: string[] }>> {
  const id = parseSpotifyId(playlistId, "playlist");
  const uris = toTrackUris(trackIds);

  if (dryRun) {
    return {
      operation: "removeTracks",
      summary: `Would remove ${uris.length} track(s) from playlist ${id}`,
      params: { uris },
    };
  }

  let lastSnapshot = "";

  for (let i = 0; i < uris.length; i += 100) {
    const batch = uris.slice(i, i + 100);
    const body = { tracks: batch.map((uri) => ({ uri })) };
    const res = await api.delete<{ snapshot_id: string }>(`/playlists/${id}/tracks`, body);
    lastSnapshot = res.snapshot_id;
  }

  return { snapshotId: lastSnapshot };
}

/**
 * Reorder tracks within a playlist.
 *
 * Moves `rangeLength` tracks starting at `rangeStart` to `insertBefore`.
 *
 * @example
 * ```ts
 * // Move the first track to position 5
 * await spotify.reorderTracks("playlist-id", 0, 5);
 * ```
 */
export async function reorderTracks(
  api: SpotifyApi,
  playlistId: string,
  rangeStart: number,
  insertBefore: number,
  options?: ReorderTracksOptions,
  dryRun?: boolean,
): Promise<ReorderTracksResult | DryRunResult<Record<string, number | string | undefined>>> {
  const id = parseSpotifyId(playlistId, "playlist");

  const body: Record<string, unknown> = {
    range_start: rangeStart,
    insert_before: insertBefore,
    range_length: options?.rangeLength ?? 1,
  };
  if (options?.snapshotId) body.snapshot_id = options.snapshotId;

  if (dryRun) {
    return {
      operation: "reorderTracks",
      summary: `Would move ${options?.rangeLength ?? 1} track(s) from position ${rangeStart} to before position ${insertBefore}`,
      params: {
        rangeStart,
        insertBefore,
        rangeLength: options?.rangeLength,
        snapshotId: options?.snapshotId,
      },
    };
  }

  const res = await api.put<{ snapshot_id: string }>(`/playlists/${id}/tracks`, body);
  return { snapshotId: res.snapshot_id };
}
