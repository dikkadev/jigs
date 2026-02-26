# Project: github-projects

## What This Is

A TypeScript (Bun) library for managing GitHub Issues and GitHub Projects V2.
Scripts in `scripts/` use the library.

## When Writing Scripts

- Start from `scripts/_template.ts`
- Always include `--dry-run` support for write operations
- Import from `../../src/index.js` (from examples) or `../src/index.js` (from scripts root)
- Read `docs/GUIDE.md` for usage patterns
- Read `docs/API.md` for available functions and types
- Check `scripts/examples/` for reference implementations
- Run scripts with `bun run scripts/your-script.ts`
- Use helpers from `scripts/_utils.ts` for formatting

## Key Patterns

### Two-Step Confirm Pattern
Issue and field update writes use preview → confirm → execute:
```ts
const ticket = gh.draft({ title: "...", project: { number: 3, fields: { Status: "Todo" } } });
console.log(await ticket.preview());  // shows what would happen
await ticket.create();                 // does it
```

### Fuzzy Issue Lookup
`resolveIssues()` accepts numbers, URLs, `#number`, or text queries:
```ts
const issues = await gh.resolveIssues([142, "#145", "rate limiting"]);
```

### Magic Iteration Values
Use `"@current"` and `"@next"` for iteration fields:
```ts
fields: { Iteration: "@current" }  // current active sprint
fields: { Iteration: "@next" }     // next upcoming sprint
```

### Bulk Field Updates
```ts
const project = await gh.getProject(3);
const items = await project.findItems({ Status: "In Progress" });
const plan = project.setFields(items, { Status: "In Review" });
console.log(plan.preview());
await plan.execute();
```

### Project Bootstrap
```ts
const created = await gh.createProject({
  title: "Platform Backlog",
  fields: [
    { name: "Priority", dataType: "SINGLE_SELECT", options: ["P0", "P1", "P2"] },
    { name: "Size", dataType: "SINGLE_SELECT", options: ["S", "M", "L"] },
  ],
  views: ["Backlog", "Board"], // currently reported as skipped
});
console.log(created.project.url);
```

## Prerequisites

- `gh` CLI installed and authenticated: `gh auth login`
- Project scope added: `gh auth refresh -s project`
- Run from a directory with a GitHub remote (or pass owner/repo explicitly)

## When Modifying the Library

- All public functions must have JSDoc with `@example`
- Run `bun run typecheck` after changes
- Keep the public API surface in `src/index.ts`
- Domain types go in `src/types.ts`
- `gh` CLI wrapper is in `src/gh.ts`
- Issue operations: `src/operations/issues.ts`
- Project operations: `src/operations/projects.ts`
- Field mutations: `src/operations/fields.ts`
- Builder patterns: `src/builders/` (draft, bulk, resolve)
