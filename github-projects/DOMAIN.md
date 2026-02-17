# Domain: GitHub Issues & Projects

## What This Is

A library for managing GitHub Issues and GitHub Projects V2 — the project-board system with typed fields (Status, Priority, Size, Iteration, etc.). The primary workflows are:

1. **Ticket authoring** — iterate on issue content and project fields, preview, then create on confirmation
2. **Bulk management** — move issues between statuses/iterations/priorities with preview and confirmation
3. **Fuzzy lookup** — when an issue reference doesn't resolve, search for similar titles

## Entities

### Issue
A GitHub issue in a repository. Has a number, title, body (markdown), state (open/closed), labels, assignees, and milestone. Each issue has a `node_id` (opaque global ID) used by the Projects V2 API.

### Project
A GitHub Projects V2 board owned by an org or user. Identified by number (human-readable) and node ID (`PVT_xxx`). Has fields, items, and views. Projects have a title, description, and visibility.

### ProjectItem
An issue, PR, or draft issue linked to a project. Has its own node ID (`PVTI_xxx`) distinct from the underlying issue/PR ID. Field values are set on items, not directly on issues.

### Field
A column/property on a project. Each field has a type:
- **SingleSelect** — Status, Priority, Size, custom dropdowns. Has a list of options, each with an `id`, `name`, and `color`.
- **Iteration** — Sprint/cycle tracking. Has active and completed iterations, each with `id`, `title`, `startDate`, `duration`.
- **Text** — Free-form text.
- **Number** — Numeric value.
- **Date** — Calendar date (`YYYY-MM-DD`).
- **Built-in** — Title, Assignees, Labels, Milestone, Repository, etc. Read-only in the project context.

Fields are identified by node IDs (`PVTF_xxx`, `PVTSSF_xxx`, `PVTIF_xxx`). Options within SingleSelect and Iteration fields have their own opaque IDs.

### FieldValue
A specific value set on a project item for a given field. Different field types use different value shapes:
- SingleSelect → `{ optionId, name }`
- Iteration → `{ iterationId, title, startDate }`
- Text → `{ text }`
- Number → `{ number }`
- Date → `{ date }`

## Operations

### Read
- **Detect repo** — infer owner/repo from cwd's git remote (with explicit override)
- **List projects** — list Projects V2 on an org or user
- **Get project** — get a project by number, including all fields with their options/iterations
- **List items** — list project items with their issue content and field values (paginated)
- **Get issue** — look up an issue by number, including its node ID
- **Search issues** — text search across repo issues (for fuzzy matching)
- **Find similar** — when an issue reference fails, search for issues with similar titles

### Write
- **Create issue** — create with title, body, labels, assignees, milestone
- **Update issue** — modify title, body, labels, assignees, state
- **Add to project** — add an existing issue to a project (returns the project item ID)
- **Set field value** — set a single field on a project item (status, priority, iteration, etc.)
- **Set fields (batch)** — set multiple fields on one or more items in a single operation
- **Clear field** — remove a field value from a project item

### Destructive
- **Remove from project** — delete an item from a project
- **Archive item** — archive an item in a project
- **Close issue** — close an issue

## Transport

Mixed transport via the `gh` CLI:
- **`gh project *`** — for project listing, field listing, item listing, item editing
- **`gh issue *`** — for issue creation, listing, editing
- **`gh api graphql`** — for complex queries (items with nested field values, batch mutations)
- **`gh api`** (REST) — for operations not covered by `gh` subcommands (e.g., getting issue node IDs)

Authentication is handled entirely by `gh auth`. Required scopes: `repo`, `project`, `read:org`.

## Constraints

- All Projects V2 mutations require node IDs (not human-readable numbers). The library resolves numbers → node IDs transparently.
- Field values are set one at a time per API call, but the library batches multiple field updates into a single GraphQL request using aliases.
- `gh project item-list` returns at most 100 items per page. The library paginates automatically.
- Iteration fields have two separate lists: active iterations and completed iterations. The library merges them for lookup.
- The `project` scope must be added to `gh auth`: `gh auth refresh -s project`.

## Protocol Examples

### List project fields (via gh CLI)
```
$ gh project field-list 1 --owner my-org --format json
{
  "fields": [
    {"id": "PVTF_xxx", "name": "Title", "type": "TITLE"},
    {"id": "PVTSSF_xxx", "name": "Status", "type": "SINGLE_SELECT",
     "options": [{"id": "abc", "name": "Todo"}, {"id": "def", "name": "In Progress"}, {"id": "ghi", "name": "Done"}]},
    {"id": "PVTSSF_yyy", "name": "Priority", "type": "SINGLE_SELECT",
     "options": [{"id": "p1", "name": "P0"}, {"id": "p2", "name": "P1"}, {"id": "p3", "name": "P2"}]},
    {"id": "PVTIF_zzz", "name": "Iteration", "type": "ITERATION"}
  ]
}
```

### Set a field value (via gh CLI)
```
$ gh project item-edit --id PVTI_itemId --field-id PVTSSF_statusFieldId --project-id PVT_projectId --single-select-option-id abc
```

### Batch field mutation (via gh api graphql)
```graphql
mutation {
  setStatus: updateProjectV2ItemFieldValue(input: {
    projectId: "PVT_xxx", itemId: "PVTI_yyy", fieldId: "PVTSSF_aaa",
    value: { singleSelectOptionId: "abc" }
  }) { projectV2Item { id } }
  setPriority: updateProjectV2ItemFieldValue(input: {
    projectId: "PVT_xxx", itemId: "PVTI_yyy", fieldId: "PVTSSF_bbb",
    value: { singleSelectOptionId: "p1" }
  }) { projectV2Item { id } }
}
```

---

## Dream Scripts

### 1. Create a ticket with project fields

```ts
#!/usr/bin/env bun
/**
 * Create an issue, add it to a project, and set Status/Priority/Iteration.
 *
 * Usage: bun run scripts/create-ticket.ts --dry-run
 */
import { parseArgs } from "node:util";
import { connect } from "../src/index.js";

const { values: args } = parseArgs({
  options: {
    "dry-run": { type: "boolean", default: false },
  },
});

const gh = await connect();

// The library knows the repo from cwd, and resolves project by number
const project = await gh.getProject(3);

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
    number: project.number,
    fields: {
      Status: "Todo",
      Priority: "P1",
      Iteration: "@current",    // magic value: resolves to the current active iteration
      Size: "M",
    },
  },
});

// Preview what would be created
console.log(ticket.preview());
// Output:
//   Issue: "Add rate limiting to the /api/search endpoint"
//   Labels: enhancement, api
//   Assignee: dikka
//   Project #3 "Backend Roadmap":
//     Status:    Todo
//     Priority:  P1
//     Iteration: Sprint 24 (2026-02-10 → 2026-02-24)
//     Size:      M

if (args["dry-run"]) process.exit(0);

const result = await ticket.create();
console.log(`Created: ${result.issue.url}`);
console.log(`Added to project: ${result.projectItem.id}`);
```

### 2. Bulk move issues to a different status

```ts
#!/usr/bin/env bun
/**
 * Move multiple issues to "In Review" status.
 *
 * Usage: bun run scripts/move-to-review.ts --dry-run
 */
import { parseArgs } from "node:util";
import { connect } from "../src/index.js";

const { values: args } = parseArgs({
  options: {
    "dry-run": { type: "boolean", default: false },
  },
});

const gh = await connect();
const project = await gh.getProject(3);

// Look up issues — accepts numbers, URLs, or title fragments
// If an exact match isn't found, searches for similar titles and asks
const issues = await gh.resolveIssues([142, 145, "rate limiting endpoint"]);
// Might print:
//   ⚠ No exact match for "rate limiting endpoint". Similar issues:
//     #147: "Add rate limiting to the /api/search endpoint"
//     #89:  "Rate limiting middleware for auth service"
//   Using #147 (best match).

const plan = project.setFields(issues, {
  Status: "In Review",
});

// Preview shows real ticket data
console.log(plan.preview());
// Output:
//   Bulk update: 3 issues → Status: "In Review"
//   ┌──────┬───────────────────────────────────────────────────┬────────────────┬─────────────┐
//   │ #    │ Title                                             │ Current Status │ New Status  │
//   ├──────┼───────────────────────────────────────────────────┼────────────────┼─────────────┤
//   │ #142 │ Fix auth token refresh on expired sessions        │ In Progress    │ In Review   │
//   │ #145 │ Add pagination to /api/users list endpoint        │ In Progress    │ In Review   │
//   │ #147 │ Add rate limiting to the /api/search endpoi…      │ Todo           │ In Review   │
//   └──────┴───────────────────────────────────────────────────┴────────────────┴─────────────┘

if (args["dry-run"]) process.exit(0);

const results = await plan.execute();
console.log(`Updated ${results.length} items.`);
```

### 3. Move issues to next iteration

```ts
#!/usr/bin/env bun
/**
 * Move all "In Progress" issues from current iteration to the next one.
 *
 * Usage: bun run scripts/rollover-iteration.ts --dry-run
 */
import { parseArgs } from "node:util";
import { connect } from "../src/index.js";

const { values: args } = parseArgs({
  options: {
    "dry-run": { type: "boolean", default: false },
  },
});

const gh = await connect();
const project = await gh.getProject(3);

// Find items matching criteria
const inProgress = await project.findItems({
  Status: "In Progress",
  Iteration: "@current",
});

const plan = project.setFields(inProgress, {
  Iteration: "@next",      // magic value: resolves to next iteration
});

console.log(plan.preview());
// Output:
//   Bulk update: 5 issues → Iteration: "Sprint 25" (2026-02-24 → 2026-03-10)
//   ┌──────┬───────────────────────────────────────────────────┬─────────────────┬──────────────┐
//   │ #    │ Title                                             │ Current Iter.   │ New Iter.    │
//   ├──────┼───────────────────────────────────────────────────┼─────────────────┼──────────────┤
//   │ #142 │ Fix auth token refresh on expired sessions        │ Sprint 24       │ Sprint 25    │
//   │ #145 │ Add pagination to /api/users list endpoint        │ Sprint 24       │ Sprint 25    │
//   │ #147 │ Add rate limiting to the /api/search endpoi…      │ Sprint 24       │ Sprint 25    │
//   │ #151 │ Migrate user sessions to Redis                    │ Sprint 24       │ Sprint 25    │
//   │ #153 │ Add OpenTelemetry tracing to API gateway          │ Sprint 24       │ Sprint 25    │
//   └──────┴───────────────────────────────────────────────────┴─────────────────┴──────────────┘

if (args["dry-run"]) process.exit(0);

const results = await plan.execute();
console.log(`Rolled over ${results.length} items to next sprint.`);
```

### 4. Create multiple tickets at once

```ts
#!/usr/bin/env bun
/**
 * Batch-create several related tickets for a feature.
 *
 * Usage: bun run scripts/create-feature-tickets.ts --dry-run
 */
import { parseArgs } from "node:util";
import { connect } from "../src/index.js";

const { values: args } = parseArgs({
  options: {
    "dry-run": { type: "boolean", default: false },
  },
});

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

console.log(batch.preview());
// Output:
//   Batch create: 3 issues in owner/repo
//   ┌───┬────────────────────────────────────────────────────┬───────────┬──────────┬──────┐
//   │ # │ Title                                              │ Status    │ Priority │ Size │
//   ├───┼────────────────────────────────────────────────────┼───────────┼──────────┼──────┤
//   │ 1 │ Design rate limiter configuration schema           │ Todo      │ P1       │ S    │
//   │ 2 │ Implement token-bucket rate limiter middleware      │ Todo      │ P1       │ M    │
//   │ 3 │ Add rate limiter metrics to monitoring dashboard   │ Todo      │ P2       │ S    │
//   └───┴────────────────────────────────────────────────────┴───────────┴──────────┴──────┘

if (args["dry-run"]) process.exit(0);

const results = await batch.create();
for (const r of results) {
  console.log(`#${r.issue.number}: ${r.issue.url}`);
}
```

### 5. Quick issue lookup with fuzzy matching

```ts
#!/usr/bin/env bun
/**
 * Look up issues flexibly — by number, URL, or title fragment.
 *
 * Usage: bun run scripts/find-issues.ts "rate limit"
 */
import { connect } from "../src/index.js";

const gh = await connect();

// Accepts mixed references: numbers, URLs, or text queries
const issues = await gh.resolveIssues(["rate limit", 142, "#145"]);

for (const issue of issues) {
  console.log(`#${issue.number}: ${issue.title}`);
  console.log(`  State: ${issue.state} | Labels: ${issue.labels.join(", ")}`);
  console.log(`  ${issue.body?.slice(0, 120)}...`);
  console.log();
}
```
