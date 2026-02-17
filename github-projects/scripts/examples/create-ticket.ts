#!/usr/bin/env bun
/**
 * Script: Create a ticket with project field assignments
 * Created: 2026-02-17
 *
 * Creates an issue, adds it to a project, and sets Status/Priority/Iteration.
 * Shows a preview before creating.
 *
 * Usage:
 *   bun run scripts/examples/create-ticket.ts                # Run normally
 *   bun run scripts/examples/create-ticket.ts --dry-run      # Preview only
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
Usage: bun run scripts/examples/create-ticket.ts [options]

Create a sample ticket with project field assignments.

Options:
  --dry-run    Preview the ticket without creating it
  --help       Show this help message
`);
  process.exit(0);
}

async function main() {
  const gh = await connect();

  const ticket = gh.draft({
    title: "Add rate limiting to the /api/search endpoint",
    body: `## Problem
Search endpoint has no rate limiting, allowing abuse.

## Proposed Solution
Add token-bucket rate limiter at 100 req/min per API key.

## Acceptance Criteria
- [ ] Rate limiter middleware added
- [ ] Returns 429 with Retry-After header
- [ ] Dashboard metrics for rate-limited requests`,
    labels: ["enhancement", "api"],
    assignees: ["dikka"],
    project: {
      number: 3,
      fields: {
        Status: "Todo",
        Priority: "P1",
        Iteration: "@current",
        Size: "M",
      },
    },
  });

  console.log(await ticket.preview());

  if (args["dry-run"]) {
    console.log("\nDRY RUN — no changes applied.");
    return;
  }

  const result = await ticket.create();
  console.log(`\nCreated: ${result.issue.url}`);
  if (result.projectItem) {
    console.log(`Added to project (item: ${result.projectItem.id})`);
  }
  if (result.fieldsSet) {
    console.log("Fields set:", result.fieldsSet);
  }
}

main().catch((err) => {
  console.error("Script failed:", err.message);
  process.exit(1);
});
