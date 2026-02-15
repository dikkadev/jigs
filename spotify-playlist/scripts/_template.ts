#!/usr/bin/env bun
/**
 * [SCRIPT NAME] — [one-line description]
 *
 * Usage:
 *   bun run scripts/_template.ts [--dry-run] [--help]
 */

import { parseArgs } from "node:util";
import { connect } from "../src/index.js";

const { values: flags } = parseArgs({
  options: {
    "dry-run": { type: "boolean", default: false },
    help: { type: "boolean", short: "h", default: false },
  },
  strict: true,
});

if (flags.help) {
  console.log(`
[SCRIPT NAME]

  [Detailed description of what this script does.]

Options:
  --dry-run   Show what would happen without making changes
  -h, --help  Show this help message
`);
  process.exit(0);
}

const dryRun = flags["dry-run"] ?? false;

try {
  const spotify = await connect();

  // ── Your script logic here ────────────────────────────────────────

  if (dryRun) {
    console.log("[dry-run] No changes made.");
  }
} catch (error) {
  console.error("Error:", error instanceof Error ? error.message : error);
  process.exit(1);
}
