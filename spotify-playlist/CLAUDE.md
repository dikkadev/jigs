# Project: spotify-playlist

## What This Is

A TypeScript (Bun) library for reading and writing Spotify playlist data. Scripts in `scripts/` use the library. This is the Spotify component of a larger system.

## When Writing Scripts

- Start from `scripts/_template.ts`
- Always include `--dry-run` support for write operations
- Import from `../src/index.js` (or `../../src/index.js` from examples), never access internals
- Read `docs/GUIDE.md` for usage patterns
- Read `docs/API.md` for available functions and types
- Check `scripts/examples/` for reference implementations
- Run scripts with `bun run scripts/your-script.ts`
- Use helpers from `scripts/_utils.ts` for formatting

## Spotify Identifiers

The library accepts playlists, tracks, artists, and albums as:
- Bare IDs: `37i9dQZF1DXcBWIGoYBM5M`
- Spotify URIs: `spotify:playlist:37i9dQZF1DXcBWIGoYBM5M`
- Spotify URLs: `https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M`

No need to parse them yourself — just pass whatever the user gives you.

## Authentication

Set one of these in the environment (or a `.env` file):
- `SPOTIFY_ACCESS_TOKEN` — a valid OAuth token (expires after 1h)
- `SPOTIFY_CLIENT_ID` + `SPOTIFY_CLIENT_SECRET` + `SPOTIFY_REFRESH_TOKEN` — auto-refresh

Required scopes: `playlist-read-private`, `playlist-read-collaborative`, `playlist-modify-public`, `playlist-modify-private`, `user-read-private`.

## When Modifying the Library

- All public functions must have JSDoc with `@example`
- Run `bun run typecheck` after changes
- Keep the public API surface in `src/index.ts`
- Domain types go in `src/types.ts`
- Raw API response mapping goes in `src/mappers.ts`
- New operations go in `src/operations/`
