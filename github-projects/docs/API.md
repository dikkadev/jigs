# API Reference

## `connect(options?)`

Create a connected client. Auto-detects owner/repo from cwd's git remote.

```ts
function connect(options?: ConnectOptions): Promise<GitHubProjectsClient>
```

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `options.owner` | `string` | auto-detect | Repository owner (org or user) |
| `options.repo` | `string` | auto-detect | Repository name |

---

## `GitHubProjectsClient`

### `getIssue(issueNumber)`

Get a single issue by number.

```ts
async getIssue(issueNumber: number): Promise<GitHubIssue>
```

**Throws:** `NotFoundError` if the issue doesn't exist.

### `searchIssues(query, options?)`

Search for issues by text query.

```ts
async searchIssues(query: string, options?: {
  limit?: number;          // default: 30
  state?: "open" | "closed" | "all";  // default: "all"
}): Promise<GitHubIssue[]>
```

### `createIssue(input)`

Create a new issue (without project assignment).

```ts
async createIssue(input: CreateIssueInput): Promise<GitHubIssue>
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `title` | `string` | yes | Issue title |
| `body` | `string` | no | Issue body (markdown) |
| `labels` | `string[]` | no | Label names |
| `assignees` | `string[]` | no | Assignee logins |
| `milestone` | `string \| number` | no | Milestone title or number |

### `resolveIssues(refs)`

Resolve mixed issue references to actual issues with fuzzy matching.

```ts
async resolveIssues(refs: IssueRef[]): Promise<ResolvedIssue[]>
```

`IssueRef` = `number | string` — a number, `#number`, URL, or text query.

### `getProject(projectNumber)`

Get a project by number with all fields resolved.

```ts
async getProject(projectNumber: number): Promise<ProjectWithActions>
```

**Throws:** `NotFoundError` if the project doesn't exist.

### `listProjects()`

List all projects for the repo's owner.

```ts
async listProjects(): Promise<Array<{
  id: string;
  number: number;
  title: string;
  url: string;
}>>
```

### `createProject(input)`

Create and bootstrap a GitHub Project board.

```ts
async createProject(input: CreateProjectInput): Promise<CreateProjectResult>
```

Supports:
- project creation (`title`)
- optional metadata (`description`, `readme`, `visibility`)
- optional repo linking (defaults to linking the connected repo)
- optional custom field creation (`TEXT`, `NUMBER`, `DATE`, `SINGLE_SELECT`)

If `views` are requested, they are returned in `viewsSkipped` because GitHub's public API/CLI currently does not expose project view mutation endpoints.

### `draft(input)`

Draft a new ticket with optional project field assignments.

```ts
draft(input: DraftInput): DraftTicket
```

See `DraftInput` and `DraftTicket` below.

### `draftBatch(inputs)`

Draft multiple tickets at once.

```ts
draftBatch(inputs: DraftInput[]): DraftBatch
```

---

## `ProjectWithActions`

Returned by `getProject()`. Extends `Project` with action methods.

### Properties

| Property | Type | Description |
|----------|------|-------------|
| `id` | `string` | Project node ID |
| `number` | `number` | Human-readable project number |
| `title` | `string` | Project title |
| `url` | `string` | Project URL |
| `description` | `string` | Short description |
| `fields` | `Map<string, ProjectField>` | All fields, keyed by name |

### `setFields(items, fieldValues)`

Create a bulk update plan for the given items.

```ts
setFields(items: ProjectItem[], fieldValues: Record<string, string | number>): BulkUpdatePlan
```

Field values use human-readable names (e.g. `"Todo"`, `"P1"`). Use `"@current"` / `"@next"` for iterations.

### `findItems(criteria)`

Find project items matching field value criteria.

```ts
async findItems(criteria: FindItemsCriteria): Promise<ProjectItem[]>
```

`FindItemsCriteria` = `Record<string, string>` — field name → expected value name.

### `listItems(options?)`

List all items in the project with their field values.

```ts
async listItems(options?: { limit?: number }): Promise<ProjectItem[]>
```

---

## `DraftTicket`

A planned ticket. Created by `gh.draft()`.

### `preview()`

Resolve all references and return a human-readable preview string.

```ts
async preview(): Promise<string>
```

### `create()`

Create the issue, add to project, and set field values.

```ts
async create(): Promise<CreateTicketResult>
```

---

## `DraftBatch`

A batch of planned tickets. Created by `gh.draftBatch()`.

### `preview()`

Preview all tickets in a formatted table.

```ts
async preview(): Promise<string>
```

### `create()`

Create all tickets sequentially.

```ts
async create(): Promise<CreateTicketResult[]>
```

---

## `BulkUpdatePlan`

A planned bulk field update. Created by `project.setFields()`.

### `preview()`

Generate a table showing current vs. new values for each item.

```ts
preview(): string
```

### `execute()`

Apply all planned field updates.

```ts
async execute(): Promise<BulkUpdateResult[]>
```

---

## Types

### `GitHubIssue`

```ts
interface GitHubIssue {
  number: number;
  nodeId: string;
  title: string;
  body: string | null;
  state: "open" | "closed";
  labels: string[];
  assignees: string[];
  milestone: string | null;
  url: string;
  createdAt: string;
  updatedAt: string;
}
```

### `ResolvedIssue`

Extends `GitHubIssue` with fuzzy match info:

```ts
interface ResolvedIssue extends GitHubIssue {
  matchedFrom?: string;   // original text query
  matchScore?: number;    // 0–1 similarity score
}
```

### `ProjectItem`

```ts
interface ProjectItem {
  id: string;                              // project item node ID
  contentType: "issue" | "pull_request" | "draft_issue";
  content: ItemContent;
  fieldValues: Map<string, FieldValue>;    // keyed by field name
}
```

### `ProjectField` (discriminated union)

```ts
type ProjectField =
  | SingleSelectField    // { type: "single_select", options: [...] }
  | IterationField       // { type: "iteration", iterations: [...] }
  | TextField            // { type: "text" }
  | NumberField          // { type: "number" }
  | DateField            // { type: "date" }
  | BuiltInField         // { type: "built_in", dataType: "TITLE" | ... }
```

### `FieldValue` (discriminated union)

```ts
type FieldValue =
  | { type: "single_select"; optionId: string; name: string }
  | { type: "iteration"; iterationId: string; title: string; startDate: string; duration: number }
  | { type: "text"; text: string }
  | { type: "number"; number: number }
  | { type: "date"; date: string }
  | { type: "users"; logins: string[] }
  | { type: "labels"; names: string[] }
  | { type: "milestone"; title: string }
  | { type: "repository"; nameWithOwner: string }
```

### `DraftInput`

```ts
interface DraftInput {
  title: string;
  body?: string;
  labels?: string[];
  assignees?: string[];
  milestone?: string | number;
  project?: {
    number: number;
    fields: Record<string, string | number>;
  };
}
```

### `ProjectFieldCreateInput`

```ts
type ProjectFieldCreateInput =
  | {
      name: string;
      dataType: "TEXT" | "NUMBER" | "DATE";
    }
  | {
      name: string;
      dataType: "SINGLE_SELECT";
      options: string[];
    };
```

### `CreateProjectInput`

```ts
interface CreateProjectInput {
  title: string;
  description?: string;
  readme?: string;
  visibility?: "PUBLIC" | "PRIVATE";
  linkRepository?: boolean | string; // default: true
  fields?: ProjectFieldCreateInput[];
  views?: string[]; // best-effort request, currently skipped with reason
}
```

### `CreateTicketResult`

```ts
interface CreateTicketResult {
  issue: GitHubIssue;
  projectItem?: { id: string };
  fieldsSet?: Record<string, string>;
}
```

### `ProjectFieldCreateResult`

```ts
interface ProjectFieldCreateResult {
  name: string;
  created: boolean;
  reason?: string;
}
```

### `CreateProjectResult`

```ts
interface CreateProjectResult {
  project: Project;
  linkedRepository: boolean;
  fields: ProjectFieldCreateResult[];
  viewsSkipped: string[];
}
```

### `BulkUpdateResult`

```ts
interface BulkUpdateResult {
  itemId: string;
  issueNumber: number | null;
  title: string;
  fieldsUpdated: Record<string, { from: string | null; to: string }>;
}
```

---

## Errors

| Error | When | Key properties |
|-------|------|----------------|
| `GitHubProjectsError` | Base class for all errors | `message` |
| `AuthError` | `gh` not authenticated | — |
| `MissingScopeError` | Missing `project` scope | `scope` |
| `NotFoundError` | Issue/project/field/option doesn't exist | `resourceType`, `resourceId` |
| `ValidationError` | Invalid input before API call | `field`, `reason` |
| `GhCliError` | `gh` command failed | `command`, `stderr`, `exitCode` |
