/**
 * Internal mappers that convert raw Spotify API JSON into our clean domain types.
 * Not part of the public API.
 */

import type {
  SpotifyAlbum,
  SpotifyArtist,
  SpotifyArtistFull,
  SpotifyImage,
  SpotifyPlaylist,
  SpotifyPlaylistTrack,
  SpotifyTrack,
  SpotifyUser,
} from "./types.js";

// biome-ignore lint: raw API shapes are loosely typed
type Raw = any;

export function mapImage(raw: Raw): SpotifyImage {
  return {
    url: raw.url,
    height: raw.height ?? null,
    width: raw.width ?? null,
  };
}

export function mapUser(raw: Raw): SpotifyUser {
  return {
    id: raw.id,
    displayName: raw.display_name ?? null,
    uri: raw.uri,
  };
}

export function mapArtistSimple(raw: Raw): SpotifyArtist {
  return {
    id: raw.id,
    name: raw.name,
    uri: raw.uri,
  };
}

export function mapArtistFull(raw: Raw): SpotifyArtistFull {
  return {
    id: raw.id,
    name: raw.name,
    uri: raw.uri,
    genres: raw.genres ?? [],
    popularity: raw.popularity ?? 0,
    images: (raw.images ?? []).map(mapImage),
    followers: raw.followers?.total ?? 0,
  };
}

export function mapAlbum(raw: Raw): SpotifyAlbum {
  return {
    id: raw.id,
    name: raw.name,
    uri: raw.uri,
    releaseDate: raw.release_date ?? "",
    totalTracks: raw.total_tracks ?? 0,
    images: (raw.images ?? []).map(mapImage),
  };
}

export function mapTrack(raw: Raw): SpotifyTrack {
  return {
    id: raw.id,
    name: raw.name,
    uri: raw.uri,
    artists: (raw.artists ?? []).map(mapArtistSimple),
    album: mapAlbum(raw.album ?? {}),
    durationMs: raw.duration_ms ?? 0,
    popularity: raw.popularity ?? 0,
    trackNumber: raw.track_number ?? 0,
    discNumber: raw.disc_number ?? 1,
    explicit: raw.explicit ?? false,
    previewUrl: raw.preview_url ?? null,
    externalUrl: raw.external_urls?.spotify ?? "",
  };
}

export function mapPlaylist(raw: Raw): SpotifyPlaylist {
  return {
    id: raw.id,
    name: raw.name,
    description: raw.description ?? "",
    uri: raw.uri,
    owner: mapUser(raw.owner ?? {}),
    public: raw.public ?? null,
    collaborative: raw.collaborative ?? false,
    totalTracks: raw.tracks?.total ?? 0,
    images: (raw.images ?? []).map(mapImage),
    snapshotId: raw.snapshot_id ?? "",
    externalUrl: raw.external_urls?.spotify ?? "",
  };
}

export function mapPlaylistTrack(raw: Raw): SpotifyPlaylistTrack {
  return {
    addedAt: raw.added_at ?? "",
    addedBy: mapUser(raw.added_by ?? {}),
    track: raw.track ? mapTrack(raw.track) : null,
  };
}
