#!/usr/bin/env bun
/**
 * Script: Batch-create related tickets for a feature
 * Created: 2026-02-17
 *
 * Creates multiple issues at once, each with project field assignments.
 *
 * Usage:
 *   bun run scripts/examples/batch-create.ts --dry-run
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
Usage: bun run scripts/examples/batch-create.ts [options]

Create a batch of related tickets for a feature.

Options:
  --dry-run    Preview the batch without creating
  --help       Show this help message
`);
  process.exit(0);
}

async function main() {
  const gh = await connect();

  const batch = gh.draftBatch([
    {
      title: "Design rate limiter configuration schema",
      body: "Define the YAML/JSON schema for rate limit rules per endpoint.",
      labels: ["design", "api"],
      project: { number: 3, fields: { Status: "Todo", Priority: "P1", Size: "S" } },
    },
    {
      title: "Implement token-bucket rate limiter middleware",
      body: "Core rate limiting logic using a token-bucket algorithm.",
      labels: ["enhancement", "api"],
      project: { number: 3, fields: { Status: "Todo", Priority: "P1", Size: "M" } },
    },
    {
      title: "Add rate limiter metrics to monitoring dashboard",
      body: "Grafana panels for rate-limited requests, top consumers, bucket fill rates.",
      labels: ["enhancement", "observability"],
      project: { number: 3, fields: { Status: "Todo", Priority: "P2", Size: "S" } },
    },
  ]);

  console.log(await batch.preview());

  if (args["dry-run"]) {
    console.log("\nDRY RUN — no changes applied.");
    return;
  }

  const results = await batch.create();
  for (const r of results) {
    console.log(`#${r.issue.number}: ${r.issue.url}`);
  }
}

main().catch((err) => {
  console.error("Script failed:", err.message);
  process.exit(1);
});
