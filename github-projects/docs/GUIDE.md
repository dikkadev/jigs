# Guide

## Mental Model

This library wraps the GitHub Issues API and the GitHub Projects V2 API behind a clean TypeScript SDK. The key insight: **Projects V2 fields (Status, Priority, Iteration, Size) live on the project, not on the issue.** An issue can exist without a project, and a project item has field values that are separate from the issue's labels/assignees/milestone.

The library hides the complexity of:
- Node IDs (every Projects V2 entity has an opaque ID like `PVT_xxx`, `PVTSSF_xxx`)
- Field value resolution (you say `"Todo"`, the library finds the option ID `47fc9ee4`)
- Iteration lookup (you say `"@current"`, the library finds the active sprint)
- The mixed transport layer (`gh` CLI subcommands + GraphQL + REST)

## Two-Step Confirm Pattern

**Every write operation follows the same flow: build a plan → preview → execute.**

```ts
// 1. Build a plan (no API calls yet, or just read calls for validation)
const ticket = gh.draft({ title: "Fix bug", project: { number: 3, fields: { Status: "Todo" } } });

// 2. Preview (resolves all references, shows what would happen)
console.log(await ticket.preview());

// 3. Execute (creates the issue, sets fields)
const result = await ticket.create();
```

This pattern appears in three places:
- `DraftTicket` → `.preview()` → `.create()`
- `DraftBatch` → `.preview()` → `.create()`
- `BulkUpdatePlan` → `.preview()` → `.execute()`

## Connecting

```ts
import { connect } from "./src/index.js";

// Auto-detect owner/repo from cwd
const gh = await connect();

// Or explicit
const gh = await connect({ owner: "my-org", repo: "my-repo" });
```

The client uses `gh` CLI for all API calls — no token management needed.

## Working with Issues

```ts
// Get by number
const issue = await gh.getIssue(142);

// Search
const results = await gh.searchIssues("rate limiting", { state: "open" });

// Create (simple, without project)
const created = await gh.createIssue({
  title: "New issue",
  body: "Description here",
  labels: ["bug"],
  assignees: ["dikka"],
});
```

## Fuzzy Issue Resolution

`resolveIssues` accepts a mix of numbers, `#number` strings, URLs, and text queries:

```ts
const issues = await gh.resolveIssues([142, "#145", "rate limiting endpoint"]);
```

If a text query doesn't exactly match an issue title, the library searches for similar issues and picks the best match. It logs what it matched:

```
⚠ No exact match for "rate limiting endpoint". Similar issues:
  #147: "Add rate limiting to the /api/search endpoint"
  #89:  "Rate limiting middleware for auth service"
Using #147 (best match).
```

## Working with Projects

```ts
const project = await gh.getProject(3);

// Inspect available fields
for (const [name, field] of project.fields) {
  console.log(`${name}: ${field.type}`);
  if (field.type === "single_select") {
    console.log(`  Options: ${field.options.map(o => o.name).join(", ")}`);
  }
}
```

### Finding Items by Field Values

```ts
const inProgress = await project.findItems({ Status: "In Progress" });
const currentSprint = await project.findItems({ Status: "In Progress", Iteration: "@current" });
```

### Bulk Field Updates

```ts
const items = await project.findItems({ Status: "In Progress" });
const plan = project.setFields(items, { Status: "In Review" });

console.log(plan.preview());
// Shows a table with current and new values for each item

await plan.execute();
```

### Listing All Items

```ts
const items = await project.listItems();
for (const item of items) {
  const status = item.fieldValues.get("Status");
  console.log(`${item.content.title} — ${status?.type === "single_select" ? status.name : "?"}`);
}
```

## Creating Tickets with Project Fields

```ts
const ticket = gh.draft({
  title: "Add rate limiting",
  body: "## Problem\n...",
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
const result = await ticket.create();
console.log(result.issue.url);
```

### Batch Creating

```ts
const batch = gh.draftBatch([
  { title: "Task 1", project: { number: 3, fields: { Status: "Todo", Size: "S" } } },
  { title: "Task 2", project: { number: 3, fields: { Status: "Todo", Size: "M" } } },
]);

console.log(await batch.preview());
const results = await batch.create();
```

## Magic Iteration Values

For iteration fields, two special values are supported:
- `"@current"` — resolves to the iteration whose date range includes today
- `"@next"` — resolves to the first iteration that starts after today

```ts
fields: { Iteration: "@current" }  // e.g. "Sprint 24 (2026-02-10 → 2026-02-24)"
fields: { Iteration: "@next" }     // e.g. "Sprint 25 (2026-02-24 → 2026-03-10)"
```

You can also use explicit iteration names: `{ Iteration: "Sprint 24" }`.

## Error Handling

All errors extend `GitHubProjectsError`:

```ts
import { NotFoundError, AuthError, ValidationError } from "./src/index.js";

try {
  await gh.getIssue(99999);
} catch (e) {
  if (e instanceof NotFoundError) {
    console.log(`${e.resourceType} not found: ${e.resourceId}`);
  } else if (e instanceof AuthError) {
    console.log("Auth issue — run: gh auth login");
  }
}
```

## What NOT to Do

- Don't access `src/gh.ts` directly from scripts — use the client
- Don't hardcode node IDs — the library resolves them from human-readable names
- Don't skip `--dry-run` support in write scripts
- Don't set built-in fields (Title, Assignees, Labels) via project field mutations — use issue operations instead
