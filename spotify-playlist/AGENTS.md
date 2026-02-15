# spotify-playlist — Agent Instructions

## Overview

TypeScript (Bun) library for Spotify playlist operations. Scripts in `scripts/` use the library.

## Writing Scripts

1. Copy `scripts/_template.ts` as your starting point
2. Import from the library: `import { connect } from "../src/index.js";`
3. Call `connect()` to get a client (reads credentials from env)
4. Use client methods — see `docs/API.md` for the full list
5. Always support `--dry-run` for write operations
6. Run with: `bun run scripts/your-script.ts`

## Key Files

| File | Purpose |
|---|---|
| `src/index.ts` | Public API — all exports |
| `src/types.ts` | All TypeScript types |
| `docs/GUIDE.md` | Usage patterns and mental model |
| `docs/API.md` | Complete API reference |
| `docs/EXAMPLES.md` | Curated script examples |
| `scripts/_template.ts` | Script boilerplate |
| `scripts/_utils.ts` | Formatting helpers |
| `scripts/examples/` | Working example scripts |

## Quick Example

```ts
import { connect } from "../src/index.js";

const spotify = await connect();
const playlists = await spotify.getMyPlaylists();
for (const p of playlists) {
  console.log(`${p.name} — ${p.totalTracks} tracks`);
}
```
