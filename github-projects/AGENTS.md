# github-projects — Agent Instructions

## What This Is

A TypeScript (Bun) library for managing GitHub Issues and GitHub Projects V2.
Scripts in `scripts/` use the library. An AI agent writes scripts; a human reviews and runs them.

## Quick Start

```ts
import { connect } from "./src/index.js";  // adjust path based on script location

const gh = await connect();  // auto-detects owner/repo from git remote
```

## When Writing Scripts

1. Start from `scripts/_template.ts`
2. Always include `--dry-run` support for write operations
3. Import only from the public API (`src/index.js`), never access internals
4. Read `docs/GUIDE.md` for usage patterns, `docs/API.md` for the full reference
5. Check `scripts/examples/` for working reference implementations
6. Run scripts with `bun run scripts/your-script.ts`

## Core API

- `connect(options?)` → `GitHubProjectsClient` — create a client
- `gh.getIssue(number)` → `GitHubIssue` — get an issue
- `gh.searchIssues(query)` → `GitHubIssue[]` — search issues
- `gh.resolveIssues(refs)` → `ResolvedIssue[]` — fuzzy lookup (numbers, URLs, text)
- `gh.draft(input)` → `DraftTicket` — plan a ticket (`.preview()` then `.create()`)
- `gh.draftBatch(inputs)` → `DraftBatch` — plan multiple tickets
- `gh.getProject(number)` → `ProjectWithActions` — get a project
- `project.findItems(criteria)` → `ProjectItem[]` — filter by field values
- `project.setFields(items, fields)` → `BulkUpdatePlan` — plan bulk updates (`.preview()` then `.execute()`)
- `project.listItems()` → `ProjectItem[]` — list all items

## Key Conventions

- Field values use human-readable names (e.g. `"Todo"`, `"P1"`) — the library resolves to IDs
- Use `"@current"` / `"@next"` for iteration fields
- All writes go through a two-step flow: build plan → preview → execute
- Error classes: `GitHubProjectsError`, `AuthError`, `NotFoundError`, `ValidationError`, `GhCliError`

## Prerequisites

- `gh` CLI authenticated with `project` scope
- Run from a git repo with a GitHub remote (or pass `{ owner, repo }` to `connect()`)
