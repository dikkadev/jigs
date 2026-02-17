# github-projects

A TypeScript jig for managing GitHub Issues and Projects V2 — the project board system with typed fields like Status, Priority, Size, and Iteration.

An AI agent writes short scripts against this SDK. You review and run them.

## What It Does

- **Create tickets** with project field assignments (Status, Priority, Iteration, Size) in a single flow
- **Bulk-manage** issues — move them between statuses, iterations, priorities with a preview table before execution
- **Fuzzy-find** issues by number, URL, or title fragment — suggests similar issues when no exact match exists
- **Preview everything** before it happens — every write operation follows a plan → preview → execute pattern

## Quick Start

```bash
# Prerequisites
gh auth login
gh auth refresh -s project   # add the project scope

# Install
cd github-projects
bun install
```

```ts
import { connect } from "./src/index.js";

const gh = await connect();  // auto-detects owner/repo from git remote

// Draft a ticket with project fields
const ticket = gh.draft({
  title: "Add rate limiting to /api/search",
  labels: ["enhancement"],
  project: {
    number: 3,
    fields: { Status: "Todo", Priority: "P1", Iteration: "@current" },
  },
});
console.log(await ticket.preview());
// await ticket.create();

// Bulk move issues
const project = await gh.getProject(3);
const items = await project.findItems({ Status: "In Progress" });
const plan = project.setFields(items, { Status: "In Review" });
console.log(plan.preview());
// await plan.execute();

// Fuzzy lookup
const issues = await gh.resolveIssues([142, "rate limiting"]);
```

## How It Works

```
gh CLI (already authenticated)
  ├── gh project *         →  project/field/item operations
  ├── gh issue *           →  issue CRUD
  └── gh api graphql       →  complex queries (items + nested field values)
```

The library resolves human-readable names to the opaque node IDs that the Projects V2 API requires. You say `{ Status: "Todo" }`, it finds the option ID. You say `{ Iteration: "@current" }`, it finds the active sprint.

## Scripts

```bash
bun run scripts/examples/create-ticket.ts --dry-run    # Draft a ticket with project fields
bun run scripts/examples/bulk-move.ts --dry-run         # Move items between statuses
bun run scripts/examples/rollover-iteration.ts --dry-run # Roll over items to next sprint
bun run scripts/examples/batch-create.ts --dry-run      # Create multiple related tickets
bun run scripts/examples/find-issues.ts "search query"   # Fuzzy issue lookup
```

All write scripts support `--dry-run` to preview without making changes. Start new scripts from `scripts/_template.ts`.

## Documentation

| File | Purpose |
|------|---------|
| [DOMAIN.md](DOMAIN.md) | Domain contract — entities, operations, transport, dream scripts |
| [docs/GUIDE.md](docs/GUIDE.md) | Mental model and usage patterns |
| [docs/API.md](docs/API.md) | Complete API reference |
| [docs/EXAMPLES.md](docs/EXAMPLES.md) | Curated script examples |
| [docs/CONCEPTS.md](docs/CONCEPTS.md) | GitHub Projects V2 concepts (node IDs, field types, iterations) |
| [CLAUDE.md](CLAUDE.md) | Agent instructions for Claude Code |
| [AGENTS.md](AGENTS.md) | Agent instructions for other AI coding tools |

## Project Structure

```
github-projects/
├── src/
│   ├── index.ts              # Public API surface
│   ├── client.ts             # connect() + GitHubProjectsClient
│   ├── types.ts              # All domain types
│   ├── errors.ts             # Typed error classes
│   ├── gh.ts                 # Low-level gh CLI wrapper
│   ├── operations/
│   │   ├── issues.ts         # Issue CRUD (gh issue *)
│   │   ├── projects.ts       # Project queries (GraphQL)
│   │   └── fields.ts         # Field value resolution + mutations
│   └── builders/
│       ├── draft.ts          # DraftTicket / DraftBatch (create flow)
│       ├── bulk.ts           # BulkUpdatePlan (field update flow)
│       └── resolve.ts        # Fuzzy issue resolution
├── scripts/
│   ├── _template.ts          # Starting point for new scripts
│   ├── _utils.ts             # Shared formatting helpers
│   └── examples/             # Reference scripts
└── docs/                     # GUIDE, API, EXAMPLES, CONCEPTS
```
