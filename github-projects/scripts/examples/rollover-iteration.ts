#!/usr/bin/env bun
/**
 * Script: Roll over in-progress issues to the next iteration
 * Created: 2026-02-17
 *
 * Finds all "In Progress" items in the current iteration and moves them
 * to the next iteration. Useful for sprint boundaries.
 *
 * Usage:
 *   bun run scripts/examples/rollover-iteration.ts --dry-run
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
Usage: bun run scripts/examples/rollover-iteration.ts [options]

Move all "In Progress" items from the current iteration to the next one.

Options:
  --dry-run    Preview changes without applying them
  --help       Show this help message
`);
  process.exit(0);
}

async function main() {
  const gh = await connect();
  const project = await gh.getProject(3);

  const inProgress = await project.findItems({
    Status: "In Progress",
    Iteration: "@current",
  });

  if (inProgress.length === 0) {
    console.log("No in-progress items in the current iteration.");
    return;
  }

  const plan = project.setFields(inProgress, {
    Iteration: "@next",
  });

  console.log(plan.preview());

  if (args["dry-run"]) {
    console.log("\nDRY RUN — no changes applied.");
    return;
  }

  const results = await plan.execute();
  console.log(`\nRolled over ${results.length} items to next sprint.`);
}

main().catch((err) => {
  console.error("Script failed:", err.message);
  process.exit(1);
});
