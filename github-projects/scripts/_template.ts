#!/usr/bin/env bun
/**
 * Script: [DESCRIPTION]
 * Created: [DATE]
 *
 * Usage:
 *   bun run scripts/this-script.ts                # Run normally
 *   bun run scripts/this-script.ts --dry-run      # Preview only
 *   bun run scripts/this-script.ts --help          # Show help
 */

import { parseArgs } from "node:util";
import { connect } from "../src/index.js";

// ── CLI Arguments ──────────────────────────────────────────────────
const { values: args } = parseArgs({
  options: {
    "dry-run": { type: "boolean", default: false },
    help: { type: "boolean", default: false },
    // Add script-specific args here
  },
});

if (args.help) {
  console.log(`
Usage: bun run scripts/this-script.ts [options]

[DESCRIPTION]

Options:
  --dry-run    Preview changes without applying them
  --help       Show this help message
`);
  process.exit(0);
}

// ── Main ───────────────────────────────────────────────────────────
async function main() {
  const gh = await connect();

  // ── Script logic here ──────────────────────────────────────────

  if (args["dry-run"]) {
    console.log("DRY RUN — no changes applied.");
    // console.log(plan.preview());
    return;
  }

  // ── Execute ────────────────────────────────────────────────────
}

main().catch((err) => {
  console.error("Script failed:", err.message);
  process.exit(1);
});
