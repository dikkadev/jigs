// ── GitHub Domain Types ─────────────────────────────────────────────

/** A GitHub issue in a repository. */
export interface GitHubIssue {
	/** Issue number (human-readable, e.g. `142`). */
	number: number;
	/** Global node ID (e.g. `"I_kwDOxxx"`). Used by Projects V2 API. */
	nodeId: string;
	/** Issue title. */
	title: string;
	/** Issue body (markdown). May be `null` if empty. */
	body: string | null;
	/** Whether the issue is open or closed. */
	state: "open" | "closed";
	/** Label names. */
	labels: string[];
	/** Assignee login names. */
	assignees: string[];
	/** Milestone title, if any. */
	milestone: string | null;
	/** The full issue URL (e.g. `"https://github.com/owner/repo/issues/142"`). */
	url: string;
	/** ISO 8601 timestamp of when the issue was created. */
	createdAt: string;
	/** ISO 8601 timestamp of last update. */
	updatedAt: string;
}

/** A GitHub Projects V2 board. */
export interface Project {
	/** Global node ID (e.g. `"PVT_kwDOxxx"`). Required for all mutations. */
	id: string;
	/** Human-readable project number. */
	number: number;
	/** Project title. */
	title: string;
	/** Project URL. */
	url: string;
	/** Short description. */
	description: string;
	/** All fields on this project, keyed by name for easy lookup. */
	fields: Map<string, ProjectField>;
}

// ── Field Types ─────────────────────────────────────────────────────

/** Discriminated union of all project field types. */
export type ProjectField =
	| SingleSelectField
	| IterationField
	| TextField
	| NumberField
	| DateField
	| BuiltInField;

/** A single-select dropdown field (Status, Priority, Size, custom). */
export interface SingleSelectField {
	type: "single_select";
	/** Field node ID (e.g. `"PVTSSF_xxx"`). */
	id: string;
	/** Human-readable field name (e.g. `"Status"`). */
	name: string;
	/** Available options. */
	options: SingleSelectOption[];
}

/** An option within a single-select field. */
export interface SingleSelectOption {
	/** Option node ID (opaque string). Required for mutations. */
	id: string;
	/** Human-readable option name (e.g. `"In Progress"`). */
	name: string;
	/** Option color (may be empty). */
	color: string;
	/** Option description (may be empty). */
	description: string;
}

/** An iteration (sprint/cycle) field. */
export interface IterationField {
	type: "iteration";
	/** Field node ID (e.g. `"PVTIF_xxx"`). */
	id: string;
	/** Human-readable field name (e.g. `"Iteration"`). */
	name: string;
	/** All iterations (active + completed), most recent first. */
	iterations: Iteration[];
}

/** A single iteration (sprint). */
export interface Iteration {
	/** Iteration node ID (opaque string). Required for mutations. */
	id: string;
	/** Iteration title (e.g. `"Sprint 24"`). */
	title: string;
	/** Start date as `YYYY-MM-DD`. */
	startDate: string;
	/** Duration in days. */
	duration: number;
}

/** A free-text field. */
export interface TextField {
	type: "text";
	id: string;
	name: string;
}

/** A numeric field. */
export interface NumberField {
	type: "number";
	id: string;
	name: string;
}

/** A date field. */
export interface DateField {
	type: "date";
	id: string;
	name: string;
}

/** A built-in field (Title, Assignees, Labels, etc.) that can't be mutated via Projects V2. */
export interface BuiltInField {
	type: "built_in";
	id: string;
	name: string;
	/** The underlying GitHub data type (e.g. `"TITLE"`, `"ASSIGNEES"`, `"LABELS"`). */
	dataType: string;
}

// ── Project Items ───────────────────────────────────────────────────

/** An item (issue, PR, or draft) linked to a project, with its field values. */
export interface ProjectItem {
	/** Project item node ID (e.g. `"PVTI_xxx"`). Used for field mutations. */
	id: string;
	/** What kind of content this item represents. */
	contentType: "issue" | "pull_request" | "draft_issue";
	/** The underlying issue/PR content. */
	content: ItemContent;
	/** Current field values, keyed by field name. */
	fieldValues: Map<string, FieldValue>;
}

/** Content of a project item — the issue, PR, or draft underneath. */
export interface ItemContent {
	/** Node ID of the issue/PR/draft. */
	nodeId: string;
	/** Issue/PR number (drafts don't have one). */
	number: number | null;
	/** Title. */
	title: string;
	/** Body (first N chars for display). */
	body: string | null;
	/** State (open/closed/merged). Drafts don't have state. */
	state: string | null;
	/** Full URL. Drafts don't have one. */
	url: string | null;
	/** Label names (issues/PRs only). */
	labels: string[];
	/** Assignee logins (issues/PRs only). */
	assignees: string[];
}

/** A resolved field value on a project item. */
export type FieldValue =
	| { type: "single_select"; optionId: string; name: string }
	| {
			type: "iteration";
			iterationId: string;
			title: string;
			startDate: string;
			duration: number;
	  }
	| { type: "text"; text: string }
	| { type: "number"; number: number }
	| { type: "date"; date: string }
	| { type: "users"; logins: string[] }
	| { type: "labels"; names: string[] }
	| { type: "milestone"; title: string }
	| { type: "repository"; nameWithOwner: string };

// ── Options & Inputs ────────────────────────────────────────────────

/**
 * Options for `connect()`.
 *
 * All fields are optional — the library detects owner/repo from `cwd`'s git remote.
 * Override with explicit values when needed.
 */
export interface ConnectOptions {
	/** Repository owner (org or user). Detected from git remote if omitted. */
	owner?: string;
	/** Repository name. Detected from git remote if omitted. */
	repo?: string;
}

/** Visibility for a GitHub Project. */
export type ProjectVisibility = "PUBLIC" | "PRIVATE";

/**
 * Input for creating a project field.
 *
 * GitHub only allows creating custom fields (`TEXT`, `NUMBER`, `DATE`, `SINGLE_SELECT`).
 */
export type ProjectFieldCreateInput =
	| {
			/** Human-readable field name (e.g. `"Priority"`). */
			name: string;
			/** Field type. */
			dataType: "TEXT" | "NUMBER" | "DATE";
	  }
	| {
			/** Human-readable field name (e.g. `"Priority"`). */
			name: string;
			/** Field type. */
			dataType: "SINGLE_SELECT";
			/** Dropdown options in display order. */
			options: string[];
	  };

/** Input for creating and bootstrapping a project. */
export interface CreateProjectInput {
	/** Project title. */
	title: string;
	/** Optional short description. */
	description?: string;
	/** Optional project readme markdown. */
	readme?: string;
	/** Optional visibility. */
	visibility?: ProjectVisibility;
	/**
	 * Link a repository to the project.
	 * - `true` (default) links the connected repo
	 * - `false` skips linking
	 * - `string` links the provided repo value (same format accepted by `gh project link --repo`)
	 */
	linkRepository?: boolean | string;
	/** Optional custom fields to create if missing by name. */
	fields?: ProjectFieldCreateInput[];
	/**
	 * Optional view names the caller would like to set up.
	 * Current GitHub public API/CLI does not expose view creation/editing, so these are reported as skipped.
	 */
	views?: string[];
}

/** Input for creating a new issue. */
export interface CreateIssueInput {
	/** Issue title. */
	title: string;
	/** Issue body (markdown). */
	body?: string;
	/** Labels to apply. */
	labels?: string[];
	/** Assignee login names. */
	assignees?: string[];
	/** Milestone title or number. */
	milestone?: string | number;
}

/** Project field assignments when creating/drafting an issue. */
export interface ProjectFieldsInput {
	/** Project number to add the issue to. */
	number: number;
	/** Field values to set, keyed by field name. Values are human-readable names, not IDs.
	 *
	 * Special values for Iteration fields:
	 * - `"@current"` — the currently active iteration
	 * - `"@next"` — the next upcoming iteration
	 */
	fields: Record<string, string | number>;
}

/** Full input for drafting a ticket (issue + project fields). */
export interface DraftInput extends CreateIssueInput {
	/** Optional project to add the issue to and set fields on. */
	project?: ProjectFieldsInput;
}

/** Criteria for finding items in a project. Field names map to value names. */
export type FindItemsCriteria = Record<string, string>;

// ── Results ─────────────────────────────────────────────────────────

/** Result of creating a ticket. */
export interface CreateTicketResult {
	/** The created issue. */
	issue: GitHubIssue;
	/** The project item, if the issue was added to a project. */
	projectItem?: { id: string };
	/** Field values that were set on the project item. */
	fieldsSet?: Record<string, string>;
}

/** Result for one requested field during `createProject()`. */
export interface ProjectFieldCreateResult {
	/** Field name from the input request. */
	name: string;
	/** `true` if this field was newly created, else `false`. */
	created: boolean;
	/** Why creation was skipped/adjusted. Present when `created === false`. */
	reason?: string;
}

/** Result of creating and bootstrapping a project. */
export interface CreateProjectResult {
	/** The created project with action helpers. */
	project: Project;
	/** Whether repository linking was applied. */
	linkedRepository: boolean;
	/** Per-field creation outcomes. */
	fields: ProjectFieldCreateResult[];
	/** Requested views that were skipped due to API limitations. */
	viewsSkipped: string[];
}

/** Result of a bulk field update on a single item. */
export interface BulkUpdateResult {
	/** The project item ID. */
	itemId: string;
	/** Issue number (if the item is an issue). */
	issueNumber: number | null;
	/** Issue title. */
	title: string;
	/** Fields that were updated. */
	fieldsUpdated: Record<string, { from: string | null; to: string }>;
}

/** A preview row for bulk operations. */
export interface PreviewRow {
	/** Issue/PR number. */
	number: number | null;
	/** Issue title (may be truncated). */
	title: string;
	/** The project item ID. */
	itemId: string;
	/** Per-field changes: field name → { current value, new value }. */
	changes: Record<string, { from: string | null; to: string }>;
}

/** A resolved issue reference, possibly fuzzy-matched. */
export interface ResolvedIssue extends GitHubIssue {
	/** If the issue was found via fuzzy search, the original query that matched it. */
	matchedFrom?: string;
	/** Similarity score (0–1) if fuzzy-matched. */
	matchScore?: number;
}
