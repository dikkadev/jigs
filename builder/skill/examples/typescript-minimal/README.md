# TypeScript Example: REST API Wrapper Jig

This shows what a completed jig looks like for a hypothetical
JSON REST API (e.g., a task management system).

## Dream Scripts (what usage looks like)

### List all tasks
```typescript
#!/usr/bin/env bun
/** List all open tasks, grouped by assignee. */

import { connect } from "../src";

const client = await connect();
const tasks = await client.tasks.list({ status: "open" });

const byAssignee = Map.groupBy(tasks, (t) => t.assignee);

for (const [assignee, items] of [...byAssignee].sort()) {
  console.log(`\n${assignee} (${items.length} tasks):`);
  for (const t of items) {
    console.log(`  [${t.priority}] ${t.title}`);
  }
}
```

### Bulk reassign with dry-run
```typescript
#!/usr/bin/env bun
/** Reassign all tasks from one person to another. */

import { parseArgs } from "node:util";
import { connect } from "../src";

const { values: args } = parseArgs({
  options: {
    from: { type: "string" },
    to: { type: "string" },
    "dry-run": { type: "boolean", default: false },
  },
});

if (!args.from || !args.to) {
  console.error("Usage: bun run scripts/reassign.ts --from alice --to bob [--dry-run]");
  process.exit(1);
}

const client = await connect();
const tasks = await client.tasks.list({ assignee: args.from });
console.log(`Found ${tasks.length} tasks assigned to ${args.from}`);

const plan = client
  .batch()
  .updateMany(tasks, { assignee: args.to })
  .preview();

for (const change of plan.changes) {
  console.log(`  ${change.taskId}: ${change.field} ${change.old} → ${change.new}`);
}

if (args["dry-run"]) {
  console.log("\nDRY RUN — no changes applied.");
  process.exit(0);
}

const result = await plan.execute();
console.log(`\nReassigned ${result.succeeded} tasks (${result.failed} failed)`);
```

## Corresponding Library Structure

```
task-jig/
├── src/
│   ├── index.ts             # Re-exports: connect, Client, Task, TaskStatus, etc.
│   ├── client.ts            # connect(), Client class
│   ├── types.ts             # Task, TaskStatus, Priority, CreateTaskInput, etc.
│   ├── errors.ts            # TaskNotFoundError, PermissionError, etc.
│   └── operations/
│       ├── tasks.ts         # TaskOperations (list, get, create, update, delete)
│       └── batch.ts         # BatchBuilder with .preview() and .execute()
├── scripts/
│   ├── _template.ts
│   └── examples/
│       ├── list-tasks.ts
│       └── bulk-reassign.ts
├── docs/
│   ├── GUIDE.md
│   ├── API.md
│   ├── EXAMPLES.md
│   └── CONCEPTS.md
├── CLAUDE.md
├── DOMAIN.md
├── package.json
├── tsconfig.json
└── bun.lock
```

## Key Observations

1. **Scripts are ~30 lines** — all complexity is in the library
2. **Bun runs TypeScript directly** — no build step for scripts
3. **Top-level await** — Bun supports it, scripts read linearly
4. **Batch operations** have `.preview()` before `.execute()`
5. **--dry-run is standard** — every write script supports it
6. **Full type inference** — `t.priority`, `t.assignee` are typed, AI can see what's available
