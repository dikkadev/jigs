#!/usr/bin/env bun
/**
 * Script: Look up issues flexibly with fuzzy matching
 * Created: 2026-02-17
 *
 * Accepts mixed references: issue numbers, URLs, or text fragments.
 * Shows similar issues when an exact match isn't found.
 *
 * Usage:
 *   bun run scripts/examples/find-issues.ts "rate limit" 142 "#145"
 */

import { parseArgs } from "node:util";
import { connect } from "../../src/index.js";
import { truncate } from "../_utils.js";

const { values: args, positionals } = parseArgs({
  options: {
    help: { type: "boolean", default: false },
  },
  allowPositionals: true,
});

if (args.help || positionals.length === 0) {
  console.log(`
Usage: bun run scripts/examples/find-issues.ts <ref> [<ref> ...]

Look up issues by number, URL, or text query.

Examples:
  bun run scripts/examples/find-issues.ts 142 "#145" "rate limit"
  bun run scripts/examples/find-issues.ts "https://github.com/owner/repo/issues/142"
`);
  process.exit(0);
}

async function main() {
  const gh = await connect();

  // Parse refs: numbers stay as numbers, strings stay as strings
  const refs = positionals.map((ref) => {
    const num = Number.parseInt(ref, 10);
    return !Number.isNaN(num) && String(num) === ref ? num : ref;
  });

  const issues = await gh.resolveIssues(refs);

  for (const issue of issues) {
    console.log(`#${issue.number}: ${issue.title}`);
    console.log(`  State: ${issue.state} | Labels: ${issue.labels.join(", ") || "(none)"}`);
    if (issue.matchedFrom) {
      console.log(`  Matched from: "${issue.matchedFrom}" (score: ${issue.matchScore?.toFixed(2)})`);
    }
    if (issue.body) {
      console.log(`  ${truncate(issue.body.replace(/\n/g, " "), 120)}`);
    }
    console.log();
  }
}

main().catch((err) => {
  console.error("Script failed:", err.message);
  process.exit(1);
});
