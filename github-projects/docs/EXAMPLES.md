# Examples

## 1. Create a ticket with project fields

Create an issue, add it to a project, and set Status, Priority, Iteration, and Size.

```ts
import { connect } from "../src/index.js";

const gh = await connect();

const ticket = gh.draft({
  title: "Add rate limiting to the /api/search endpoint",
  body: "## Problem\nSearch endpoint has no rate limiting.\n\n## Solution\nToken-bucket at 100 req/min.",
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
// Output:
//   Issue: "Add rate limiting to the /api/search endpoint"
//   Labels: enhancement, api
//   Assignees: dikka
//   Project #3 "Backend Roadmap":
//     Status:    Todo
//     Priority:  P1
//     Iteration: Sprint 24 (2026-02-10 → 2026-02-24)
//     Size:      M

const result = await ticket.create();
console.log(`Created: ${result.issue.url}`);
```

## 2. Bulk move issues to a new status

Move all "In Progress" items to "In Review".

```ts
import { connect } from "../src/index.js";

const gh = await connect();
const project = await gh.getProject(3);

const items = await project.findItems({ Status: "In Progress" });
const plan = project.setFields(items, { Status: "In Review" });

console.log(plan.preview());
// Output:
//   Bulk update: 3 items → Status: "In Review"
//   ┌──────┬──────────────────────────────────┬────────────────┬────────────┐
//   │ #    │ Title                            │ Current Status │ New Status │
//   ├──────┼──────────────────────────────────┼────────────────┼────────────┤
//   │ #142 │ Fix auth token refresh           │ In Progress    │ In Review  │
//   │ #145 │ Add pagination to /api/users     │ In Progress    │ In Review  │
//   │ #147 │ Add rate limiting to /api/sea…   │ In Progress    │ In Review  │
//   └──────┴──────────────────────────────────┴────────────────┴────────────┘

await plan.execute();
```

## 3. Roll over items to next iteration

Move unfinished items from the current sprint to the next one.

```ts
import { connect } from "../src/index.js";

const gh = await connect();
const project = await gh.getProject(3);

const inProgress = await project.findItems({
  Status: "In Progress",
  Iteration: "@current",
});

const plan = project.setFields(inProgress, { Iteration: "@next" });
console.log(plan.preview());
await plan.execute();
```

## 4. Batch create related tickets

Create several tickets at once for a feature.

```ts
import { connect } from "../src/index.js";

const gh = await connect();

const batch = gh.draftBatch([
  {
    title: "Design rate limiter config schema",
    labels: ["design"],
    project: { number: 3, fields: { Status: "Todo", Priority: "P1", Size: "S" } },
  },
  {
    title: "Implement rate limiter middleware",
    labels: ["enhancement"],
    project: { number: 3, fields: { Status: "Todo", Priority: "P1", Size: "M" } },
  },
  {
    title: "Add rate limiter metrics dashboard",
    labels: ["observability"],
    project: { number: 3, fields: { Status: "Todo", Priority: "P2", Size: "S" } },
  },
]);

console.log(await batch.preview());
const results = await batch.create();
for (const r of results) {
  console.log(`#${r.issue.number}: ${r.issue.url}`);
}
```

## 5. Fuzzy issue lookup

Find issues by number, URL, or text query.

```ts
import { connect } from "../src/index.js";

const gh = await connect();

const issues = await gh.resolveIssues([142, "#145", "rate limiting endpoint"]);
// If "rate limiting endpoint" doesn't match exactly:
//   ⚠ No exact match for "rate limiting endpoint". Similar issues:
//     #147: "Add rate limiting to the /api/search endpoint"
//     #89:  "Rate limiting middleware for auth service"
//   Using #147 (best match).

for (const issue of issues) {
  console.log(`#${issue.number}: ${issue.title} (${issue.state})`);
}
```

## 6. Inspect project fields

See what fields and options are available on a project.

```ts
import { connect } from "../src/index.js";

const gh = await connect();
const project = await gh.getProject(3);

console.log(`Project: ${project.title}`);
console.log(`Fields:`);

for (const [name, field] of project.fields) {
  switch (field.type) {
    case "single_select":
      console.log(`  ${name}: ${field.options.map(o => o.name).join(" | ")}`);
      break;
    case "iteration":
      console.log(`  ${name}: ${field.iterations.map(i => i.title).join(" | ")}`);
      break;
    default:
      console.log(`  ${name}: (${field.type})`);
  }
}
```

## 7. Dry-run pattern

Every write script should support `--dry-run`:

```ts
import { parseArgs } from "node:util";
import { connect } from "../src/index.js";

const { values: args } = parseArgs({
  options: { "dry-run": { type: "boolean", default: false } },
});

const gh = await connect();
const ticket = gh.draft({
  title: "New feature",
  project: { number: 3, fields: { Status: "Todo" } },
});

console.log(await ticket.preview());

if (args["dry-run"]) {
  console.log("\nDRY RUN — no changes applied.");
  process.exit(0);
}

await ticket.create();
```

## 8. Bootstrap a new project board and seed issues

Create a project, set up custom fields, and then create issues directly into that project.

```ts
import { connect } from "../src/index.js";

const gh = await connect();

const created = await gh.createProject({
  title: "Platform Backlog",
  description: "Kanban board for platform work",
  fields: [
    { name: "Priority", dataType: "SINGLE_SELECT", options: ["P0", "P1", "P2", "P3"] },
    { name: "Size", dataType: "SINGLE_SELECT", options: ["XS", "S", "M", "L"] },
  ],
  views: ["Backlog", "Board"], // reported as skipped today
});

const batch = gh.draftBatch([
  {
    title: "Add rate limiting to /api/search",
    labels: ["enhancement", "api"],
    project: {
      number: created.project.number,
      fields: { Status: "Todo", Priority: "P1", Size: "M" },
    },
  },
  {
    title: "Improve API error observability",
    labels: ["observability"],
    project: {
      number: created.project.number,
      fields: { Status: "Todo", Priority: "P2", Size: "S" },
    },
  },
]);

console.log(await batch.preview());
const results = await batch.create();
console.log(results.map((r) => r.issue.url));
```
