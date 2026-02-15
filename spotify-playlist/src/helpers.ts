/**
 * Internal helpers for parsing Spotify identifiers.
 * Accepts IDs, URIs, or URLs and normalises to a bare ID.
 *
 * Not part of the public API.
 */

import { ValidationError } from "./errors.js";

const SPOTIFY_URI_RE = /^spotify:(track|playlist|artist|album|user):([a-zA-Z0-9]+)$/;
const SPOTIFY_URL_RE = /^https?:\/\/open\.spotify\.com\/(track|playlist|artist|album|user)\/([a-zA-Z0-9]+)/;
const BARE_ID_RE = /^[a-zA-Z0-9]{15,}$/;

/**
 * Extract a bare Spotify ID from an ID, URI, or URL.
 *
 * Accepted formats:
 * - `"37i9dQZF1DXcBWIGoYBM5M"` (bare ID)
 * - `"spotify:playlist:37i9dQZF1DXcBWIGoYBM5M"` (URI)
 * - `"https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M"` (URL)
 */
export function parseSpotifyId(input: string, expectedType?: string): string {
  const trimmed = input.trim();

  const uriMatch = trimmed.match(SPOTIFY_URI_RE);
  if (uriMatch) {
    if (expectedType && uriMatch[1] !== expectedType) {
      throw new ValidationError("id", `Expected a ${expectedType} URI but got ${uriMatch[1]}`);
    }
    return uriMatch[2]!;
  }

  const urlMatch = trimmed.match(SPOTIFY_URL_RE);
  if (urlMatch) {
    if (expectedType && urlMatch[1] !== expectedType) {
      throw new ValidationError("id", `Expected a ${expectedType} URL but got ${urlMatch[1]}`);
    }
    return urlMatch[2]!;
  }

  if (BARE_ID_RE.test(trimmed)) {
    return trimmed;
  }

  throw new ValidationError("id", `Cannot parse Spotify identifier: "${input}"`);
}

/**
 * Ensure a value is a Spotify track URI (`spotify:track:xxx`).
 * Accepts bare IDs, URIs, and URLs — always returns a URI.
 */
export function toTrackUri(input: string): string {
  const id = parseSpotifyId(input, "track");
  return `spotify:track:${id}`;
}

/**
 * Normalise an array of track identifiers to URIs.
 * Validates that all entries are parseable.
 */
export function toTrackUris(inputs: string[]): string[] {
  return inputs.map(toTrackUri);
}
