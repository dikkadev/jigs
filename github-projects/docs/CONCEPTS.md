# Concepts

## GitHub Projects V2 vs. Issues

GitHub has two separate systems that this library bridges:

1. **Issues** — live in a repository. Have a number, title, body, labels, assignees, milestone, state.
2. **Projects V2** — live on an org or user (not a repo). Have fields like Status, Priority, Size, Iteration.

When an issue is added to a project, it becomes a **project item**. The item has its own ID and its own field values, separate from the issue itself.

```
Issue #142 (in repo: owner/repo)
  ├── title: "Fix login bug"
  ├── labels: ["bug"]
  ├── assignees: ["dikka"]
  └── linked to Project #3 as item PVTI_xxx
       ├── Status: "In Progress"
       ├── Priority: "P1"
       └── Iteration: "Sprint 24"
```

## Node IDs

Everything in the Projects V2 API uses **node IDs** — opaque strings like:
- `PVT_kwDOxxx` — project
- `PVTI_xxx` — project item
- `PVTSSF_xxx` — single-select field
- `PVTIF_xxx` — iteration field
- `I_kwDOxxx` — issue

You never need to deal with these directly. The library resolves human-readable names (project numbers, field names, option names) to node IDs internally.

## Field Types

| Type | Example fields | Values |
|------|---------------|--------|
| **SingleSelect** | Status, Priority, Size | Dropdown with named options (e.g. "Todo", "In Progress", "Done") |
| **Iteration** | Iteration, Sprint | Time-boxed periods with title, start date, duration |
| **Text** | Notes, Description | Free-form text |
| **Number** | Story Points, Effort | Numeric value |
| **Date** | Due Date, Start Date | Calendar date (YYYY-MM-DD) |
| **Built-in** | Title, Assignees, Labels | Read-only in project context (modify via issue API) |

## Iteration Fields

Iteration fields are special:
- They have **active iterations** (current and future)
- They have **completed iterations** (past sprints)
- The library merges both lists for lookup
- Use `"@current"` to refer to the iteration containing today
- Use `"@next"` to refer to the first iteration starting after today

## Field Value Resolution

When you write `{ Status: "Todo" }`, the library:
1. Looks up the "Status" field on the project → finds its node ID
2. Looks up "Todo" in the field's options → finds the option ID
3. Uses both IDs in the `updateProjectV2ItemFieldValue` mutation

This means field names and option names are case-insensitive and you never need to know about IDs.

## Rate Limits

The GitHub GraphQL API has a point-based rate limit (5,000 points/hour). Complex queries cost more points.

The library uses `gh` CLI subcommands where possible (which handle pagination and retries) and falls back to `gh api graphql` for complex operations.

## Authentication

All API calls go through the `gh` CLI, which manages authentication. Required scopes:
- `repo` — for issue operations
- `project` — for project field mutations
- `read:org` — for accessing org-level projects

If the `project` scope is missing, run:
```bash
gh auth refresh -s project
```

## Project Views / Tabs

Projects V2 supports multiple views in the UI (board, table, roadmap, custom filtered tabs).  
As of today, GitHub's public API/CLI does not expose stable mutations for creating/editing those views.

This library accepts requested view names during project bootstrap and reports them as skipped, so scripts can preserve intent without pretending view setup happened.

## The Preview → Execute Pattern

This library is designed for human-in-the-loop workflows. Ticket and field update writes follow:

1. **Build** — construct a plan object describing what should happen
2. **Preview** — resolve all references, validate, show a human-readable summary
3. **Execute** — actually perform the API calls

This is safer than direct API calls because:
- Invalid field names or option names are caught at preview time
- The user sees exactly what will change before it happens
- Dry-run scripts naturally fall out of this pattern

Project bootstrap (`createProject`) is immediate; for that workflow, the recommended safety pattern is script-level `--dry-run` before execution.
