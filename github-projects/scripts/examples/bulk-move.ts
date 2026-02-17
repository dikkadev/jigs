#!/usr/bin/env bun
/**
 * Script: Bulk move issues to a different status
 * Created: 2026-02-17
 *
 * Shows a table of what would change, then applies the update on confirmation.
 *
 * Usage:
 *   bun run scripts/examples/bulk-move.ts --dry-run
 */

import { parseArgs } from "node:util";
import { connect } from "../../src/index.js";

const { values: args } = parseArgs({
  options: {
    "dry-run": { type: "boolean", default: false },
    help: { type: "boolean", default: false },
  },
});

if (args.help) {
  console.log(`
Usage: bun run scripts/examples/bulk-move.ts [options]

Move all "In Progress" items to "In Review" status.

Options:
  --dry-run    Preview changes without applying them
  --help       Show this help message
`);
  process.exit(0);
}

async function main() {
  const gh = await connect();
  const project = await gh.getProject(3);

  // Find all items currently "In Progress"
  const items = await project.findItems({ Status: "In Progress" });

  if (items.length === 0) {
    console.log("No items with Status: In Progress");
    return;
  }

  const plan = project.setFields(items, { Status: "In Review" });

  console.log(plan.preview());

  if (args["dry-run"]) {
    console.log("\nDRY RUN — no changes applied.");
    return;
  }

  const results = await plan.execute();
  console.log(`\nUpdated ${results.length} items.`);
}

main().catch((err) => {
  console.error("Script failed:", err.message);
  process.exit(1);
});
