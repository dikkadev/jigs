/**
 * GitHubProjectsClient — the main entry point for interacting with
 * GitHub Issues and Projects V2.
 *
 * Create a client via `connect()`, then call methods to read/write
 * issues, manage projects, and set field values.
 */

import { BulkUpdatePlan, findItems } from "./builders/bulk.js";
import { DraftBatch, DraftTicket } from "./builders/draft.js";
import { resolveIssues as resolveIssuesImpl } from "./builders/resolve.js";
import type { IssueRef } from "./builders/resolve.js";
import * as cli from "./gh.js";
import * as issueOps from "./operations/issues.js";
import * as projectOps from "./operations/projects.js";
import type {
	ConnectOptions,
	CreateIssueInput,
	CreateProjectInput,
	CreateProjectResult,
	DraftInput,
	FindItemsCriteria,
	GitHubIssue,
	Project,
	ProjectItem,
	ResolvedIssue,
} from "./types.js";

export class GitHubProjectsClient {
	/** @internal Use `connect()` to create a client. */
	constructor(
		public readonly owner: string,
		public readonly repo: string,
	) {}

	// ── Issues ──────────────────────────────────────────────────────────

	/**
	 * Get an issue by number.
	 *
	 * @example
	 * ```ts
	 * const issue = await gh.getIssue(142);
	 * console.log(issue.title, issue.labels);
	 * ```
	 */
	async getIssue(issueNumber: number): Promise<GitHubIssue> {
		return issueOps.getIssue(this.owner, this.repo, issueNumber);
	}

	/**
	 * Search for issues by text query.
	 *
	 * @example
	 * ```ts
	 * const issues = await gh.searchIssues("rate limiting");
	 * for (const issue of issues) console.log(`#${issue.number}: ${issue.title}`);
	 * ```
	 */
	async searchIssues(
		query: string,
		options?: { limit?: number; state?: "open" | "closed" | "all" },
	): Promise<GitHubIssue[]> {
		return issueOps.searchIssues(this.owner, this.repo, query, options);
	}

	/**
	 * Create a new issue (without project assignment).
	 *
	 * For creating issues with project fields, use `draft()` instead.
	 *
	 * @example
	 * ```ts
	 * const issue = await gh.createIssue({
	 *   title: "Fix login bug",
	 *   body: "Users can't log in with SSO",
	 *   labels: ["bug", "auth"],
	 * });
	 * console.log(issue.url);
	 * ```
	 */
	async createIssue(input: CreateIssueInput): Promise<GitHubIssue> {
		return issueOps.createIssue(this.owner, this.repo, input);
	}

	/**
	 * Resolve mixed issue references to actual issues.
	 *
	 * Accepts numbers, `#number` strings, URLs, or text queries.
	 * For text queries, searches for similar issues if no exact match is found.
	 *
	 * @example
	 * ```ts
	 * const issues = await gh.resolveIssues([142, "#145", "rate limiting"]);
	 * // If "rate limiting" doesn't match exactly, shows similar issues:
	 * //   ⚠ No exact match for "rate limiting". Similar issues:
	 * //     #147: "Add rate limiting to the /api/search endpoint"
	 * //   Using #147 (best match).
	 * ```
	 */
	async resolveIssues(refs: IssueRef[]): Promise<ResolvedIssue[]> {
		return resolveIssuesImpl(this.owner, this.repo, refs);
	}

	// ── Projects ────────────────────────────────────────────────────────

	/**
	 * Get a project by number, including all fields with their options and iterations.
	 *
	 * The returned `Project` object has a `fields` map for looking up field metadata
	 * (option IDs, iteration IDs) — but you rarely need this directly. The `draft()`
	 * and `setFields()` methods handle field resolution for you.
	 *
	 * @example
	 * ```ts
	 * const project = await gh.getProject(3);
	 * console.log(project.title);
	 * console.log([...project.fields.keys()]); // ["Status", "Priority", "Iteration", ...]
	 * ```
	 */
	async getProject(projectNumber: number): Promise<ProjectWithActions> {
		const project = await projectOps.getProject(this.owner, projectNumber);
		return new ProjectWithActions(project, this);
	}

	/**
	 * List all projects for the repo's owner.
	 *
	 * @example
	 * ```ts
	 * const projects = await gh.listProjects();
	 * for (const p of projects) console.log(`#${p.number}: ${p.title}`);
	 * ```
	 */
	async listProjects(): Promise<
		Array<{ id: string; number: number; title: string; url: string }>
	> {
		return projectOps.listProjects(this.owner);
	}

	/**
	 * Create a new project and optionally bootstrap it with metadata, linked repo,
	 * and custom fields.
	 *
	 * View/tab creation is accepted as input (`views`) but currently skipped because
	 * GitHub's public API/CLI does not expose project view mutations.
	 *
	 * @example
	 * ```ts
	 * const created = await gh.createProject({
	 *   title: "API Platform Board",
	 *   description: "Kanban for API platform work",
	 *   linkRepository: true,
	 *   fields: [
	 *     { name: "Priority", dataType: "SINGLE_SELECT", options: ["P0", "P1", "P2"] },
	 *     { name: "Size", dataType: "SINGLE_SELECT", options: ["S", "M", "L"] },
	 *   ],
	 *   views: ["Backlog", "Board"], // currently reported as skipped
	 * });
	 *
	 * console.log(created.project.url);
	 * ```
	 */
	async createProject(input: CreateProjectInput): Promise<CreateProjectResult> {
		const created = await projectOps.createProject(this.owner, input.title);

		if (
			input.description != null ||
			input.readme != null ||
			input.visibility != null
		) {
			await projectOps.editProject(this.owner, created.number, {
				description: input.description,
				readme: input.readme,
				visibility: input.visibility,
			});
		}

		let linkedRepository = false;
		const shouldLinkRepository = input.linkRepository !== false;
		if (shouldLinkRepository) {
			const repoToLink =
				typeof input.linkRepository === "string"
					? input.linkRepository
					: this.repo;
			await projectOps.linkProjectToRepository(
				this.owner,
				created.number,
				repoToLink,
			);
			linkedRepository = true;
		}

		const fields: CreateProjectResult["fields"] = [];
		if (input.fields?.length) {
			const existing = await projectOps.getProject(this.owner, created.number);
			const existingNames = new Set(
				[...existing.fields.keys()].map((name) => name.toLowerCase()),
			);

			for (const field of input.fields) {
				const normalized = field.name.trim().toLowerCase();
				if (!normalized) {
					fields.push({
						name: field.name,
						created: false,
						reason: "name is empty after trimming",
					});
					continue;
				}

				if (existingNames.has(normalized)) {
					fields.push({
						name: field.name,
						created: false,
						reason: "field already exists",
					});
					continue;
				}

				await projectOps.createProjectField(this.owner, created.number, field);
				existingNames.add(normalized);
				fields.push({ name: field.name, created: true });
			}
		}

		const viewsSkipped = (input.views ?? []).map(
			(viewName) =>
				`${viewName}: GitHub public API/CLI does not currently expose project view mutations`,
		);

		const project = await this.getProject(created.number);
		return { project, linkedRepository, fields, viewsSkipped };
	}

	// ── Draft / Batch ─────────────────────────────────────────────────

	/**
	 * Draft a new ticket with optional project field assignments.
	 *
	 * Returns a `DraftTicket` — call `.preview()` to see what would be created,
	 * then `.create()` to actually create it.
	 *
	 * @example
	 * ```ts
	 * const ticket = gh.draft({
	 *   title: "Add rate limiting",
	 *   body: "## Problem\n...",
	 *   labels: ["enhancement"],
	 *   project: {
	 *     number: 3,
	 *     fields: { Status: "Todo", Priority: "P1", Iteration: "@current" },
	 *   },
	 * });
	 *
	 * console.log(await ticket.preview());
	 * const result = await ticket.create();
	 * console.log(result.issue.url);
	 * ```
	 */
	draft(input: DraftInput): DraftTicket {
		return new DraftTicket(this.owner, this.repo, input);
	}

	/**
	 * Draft multiple tickets at once.
	 *
	 * Returns a `DraftBatch` — call `.preview()` to see the full table,
	 * then `.create()` to create all tickets.
	 *
	 * @example
	 * ```ts
	 * const batch = gh.draftBatch([
	 *   { title: "Design schema", labels: ["design"], project: { number: 3, fields: { Status: "Todo", Size: "S" } } },
	 *   { title: "Implement middleware", labels: ["enhancement"], project: { number: 3, fields: { Status: "Todo", Size: "M" } } },
	 * ]);
	 *
	 * console.log(await batch.preview());
	 * const results = await batch.create();
	 * ```
	 */
	draftBatch(inputs: DraftInput[]): DraftBatch {
		return new DraftBatch(this.owner, this.repo, inputs);
	}
}

// ── Project with Actions ────────────────────────────────────────────

/**
 * A `Project` enriched with action methods for setting fields and finding items.
 *
 * Returned by `gh.getProject()`.
 */
export class ProjectWithActions implements Project {
	readonly id: string;
	readonly number: number;
	readonly title: string;
	readonly url: string;
	readonly description: string;
	readonly fields: Map<string, import("./types.js").ProjectField>;

	constructor(
		project: Project,
		private readonly client: GitHubProjectsClient,
	) {
		this.id = project.id;
		this.number = project.number;
		this.title = project.title;
		this.url = project.url;
		this.description = project.description;
		this.fields = project.fields;
	}

	/**
	 * Create a bulk field update plan for the given items.
	 *
	 * Returns a `BulkUpdatePlan` — call `.preview()` to see the table of changes,
	 * then `.execute()` to apply them.
	 *
	 * @example
	 * ```ts
	 * const project = await gh.getProject(3);
	 * const issues = await gh.resolveIssues([142, 145, 147]);
	 * // Need ProjectItems, not GitHubIssues — use findItems or listItems instead
	 * const plan = project.setFields(items, { Status: "In Review" });
	 * console.log(plan.preview());
	 * await plan.execute();
	 * ```
	 */
	setFields(
		items: ProjectItem[],
		fieldValues: Record<string, string | number>,
	): BulkUpdatePlan {
		return new BulkUpdatePlan(this, items, fieldValues);
	}

	/**
	 * Find project items matching field value criteria.
	 *
	 * Criteria are matched by name (case-insensitive).
	 * Supports `@current` and `@next` for iteration fields.
	 *
	 * @example
	 * ```ts
	 * const project = await gh.getProject(3);
	 * const inProgress = await project.findItems({ Status: "In Progress" });
	 * const currentSprint = await project.findItems({ Status: "In Progress", Iteration: "@current" });
	 * ```
	 */
	async findItems(criteria: FindItemsCriteria): Promise<ProjectItem[]> {
		return findItems(this, criteria);
	}

	/**
	 * List all items in the project with their field values.
	 *
	 * @example
	 * ```ts
	 * const project = await gh.getProject(3);
	 * const items = await project.listItems();
	 * for (const item of items) {
	 *   const status = item.fieldValues.get("Status");
	 *   console.log(`#${item.content.number}: ${item.content.title} [${status?.type === "single_select" ? status.name : ""}]`);
	 * }
	 * ```
	 */
	async listItems(options?: { limit?: number }): Promise<ProjectItem[]> {
		return projectOps.listProjectItems(this.id, options);
	}
}

// ── connect() ───────────────────────────────────────────────────────

/**
 * Create a connected GitHub Projects client.
 *
 * Configuration is resolved in priority order:
 * 1. Explicit `options` passed here
 * 2. Auto-detected from the current directory's git remote
 *
 * **Minimal usage** (auto-detect from cwd):
 * ```ts
 * const gh = await connect();
 * ```
 *
 * **With explicit repo**:
 * ```ts
 * const gh = await connect({ owner: "my-org", repo: "my-repo" });
 * ```
 *
 * ### Prerequisites
 *
 * - `gh` CLI must be installed and authenticated (`gh auth login`)
 * - The `project` scope must be added: `gh auth refresh -s project`
 */
export async function connect(
	options?: ConnectOptions,
): Promise<GitHubProjectsClient> {
	let owner = options?.owner;
	let repo = options?.repo;

	if (!owner || !repo) {
		const detected = await cli.detectRepo();
		owner = owner ?? detected.owner;
		repo = repo ?? detected.repo;
	}

	return new GitHubProjectsClient(owner, repo);
}
