/**
 * Project operations — get project, list fields, list items, find items.
 *
 * Uses `gh project` subcommands for simple queries and `gh api graphql`
 * for complex queries (items with nested field values).
 *
 * @internal
 */

import { NotFoundError, ValidationError } from "../errors.js";
import * as cli from "../gh.js";
import type {
	BuiltInField,
	DateField,
	FieldValue,
	ItemContent,
	Iteration,
	IterationField,
	NumberField,
	Project,
	ProjectField,
	ProjectFieldCreateInput,
	ProjectItem,
	ProjectVisibility,
	SingleSelectField,
	SingleSelectOption,
	TextField,
} from "../types.js";

// ── Types for gh CLI JSON output ────────────────────────────────────

interface GhProjectJson {
	id: string;
	number: number;
	title: string;
	url: string;
	shortDescription: string;
}

interface GhProjectCreateJson {
	id: string;
	number: number;
	title: string;
	url: string;
	shortDescription?: string;
}

interface GhFieldJson {
	id: string;
	name: string;
	type: string;
	options?: Array<{
		id: string;
		name: string;
		color: string;
		description: string;
	}>;
}

// ── Project Lookup ──────────────────────────────────────────────────

/**
 * Get a project by number. Resolves all fields with options and iterations.
 *
 * Uses `gh project view` for basic info + GraphQL for full field details.
 *
 * @see https://cli.github.com/manual/gh_project_view
 */
export async function getProject(
	owner: string,
	projectNumber: number,
): Promise<Project> {
	// Get basic project info
	let projectJson: GhProjectJson;
	try {
		projectJson = await cli.ghJson<GhProjectJson>([
			"project",
			"view",
			String(projectNumber),
			"--owner",
			owner,
			"--format",
			"json",
		]);
	} catch (e) {
		if (
			e instanceof Error &&
			(e.message.includes("not found") ||
				e.message.includes("Could not resolve"))
		) {
			throw new NotFoundError("project", projectNumber);
		}
		throw e;
	}

	// Get full field details via GraphQL (includes iterations which gh project field-list doesn't return fully)
	const fields = await getProjectFields(projectJson.id);

	return {
		id: projectJson.id,
		number: projectJson.number,
		title: projectJson.title,
		url: projectJson.url,
		description: projectJson.shortDescription ?? "",
		fields,
	};
}

/**
 * Get all fields for a project, including single-select options and iteration details.
 *
 * Uses GraphQL because `gh project field-list` doesn't return iteration configuration.
 *
 * @see https://docs.github.com/en/graphql/reference/objects#projectv2
 */
async function getProjectFields(
	projectNodeId: string,
): Promise<Map<string, ProjectField>> {
	const query = `query($projectId: ID!) {
    node(id: $projectId) {
      ... on ProjectV2 {
        fields(first: 50) {
          nodes {
            ... on ProjectV2Field {
              id
              name
              dataType
            }
            ... on ProjectV2SingleSelectField {
              id
              name
              dataType
              options {
                id
                name
                color
                description
              }
            }
            ... on ProjectV2IterationField {
              id
              name
              dataType
              configuration {
                iterations {
                  id
                  title
                  startDate
                  duration
                }
                completedIterations {
                  id
                  title
                  startDate
                  duration
                }
              }
            }
          }
        }
      }
    }
  }`;

	interface FieldNode {
		id: string;
		name: string;
		dataType: string;
		options?: Array<{
			id: string;
			name: string;
			color: string;
			description: string;
		}>;
		configuration?: {
			iterations: Array<{
				id: string;
				title: string;
				startDate: string;
				duration: number;
			}>;
			completedIterations: Array<{
				id: string;
				title: string;
				startDate: string;
				duration: number;
			}>;
		};
	}

	const data = await cli.graphql<{
		node: { fields: { nodes: FieldNode[] } };
	}>(query, { projectId: projectNodeId });

	const fields = new Map<string, ProjectField>();

	for (const node of data.node.fields.nodes) {
		const field = mapField(node);
		if (field) {
			fields.set(field.name, field);
		}
	}

	return fields;
}

function mapField(node: {
	id: string;
	name: string;
	dataType: string;
	options?: Array<{
		id: string;
		name: string;
		color: string;
		description: string;
	}>;
	configuration?: {
		iterations: Array<{
			id: string;
			title: string;
			startDate: string;
			duration: number;
		}>;
		completedIterations: Array<{
			id: string;
			title: string;
			startDate: string;
			duration: number;
		}>;
	};
}): ProjectField | null {
	switch (node.dataType) {
		case "SINGLE_SELECT": {
			const field: SingleSelectField = {
				type: "single_select",
				id: node.id,
				name: node.name,
				options: (node.options ?? []).map(
					(o): SingleSelectOption => ({
						id: o.id,
						name: o.name,
						color: o.color ?? "",
						description: o.description ?? "",
					}),
				),
			};
			return field;
		}

		case "ITERATION": {
			const active = node.configuration?.iterations ?? [];
			const completed = node.configuration?.completedIterations ?? [];
			// Merge and sort by start date, most recent first
			const allIterations: Iteration[] = [...active, ...completed]
				.map(
					(i): Iteration => ({
						id: i.id,
						title: i.title,
						startDate: i.startDate,
						duration: i.duration,
					}),
				)
				.sort((a, b) => b.startDate.localeCompare(a.startDate));

			const field: IterationField = {
				type: "iteration",
				id: node.id,
				name: node.name,
				iterations: allIterations,
			};
			return field;
		}

		case "TEXT": {
			const field: TextField = { type: "text", id: node.id, name: node.name };
			return field;
		}

		case "NUMBER": {
			const field: NumberField = {
				type: "number",
				id: node.id,
				name: node.name,
			};
			return field;
		}

		case "DATE": {
			const field: DateField = { type: "date", id: node.id, name: node.name };
			return field;
		}

		case "TITLE":
		case "ASSIGNEES":
		case "LABELS":
		case "MILESTONE":
		case "LINKED_PULL_REQUESTS":
		case "REVIEWERS":
		case "REPOSITORY":
		case "TRACKS":
		case "TRACKED_BY":
		case "ISSUE_TYPE":
		case "PARENT_ISSUE":
		case "SUB_ISSUES_PROGRESS": {
			const field: BuiltInField = {
				type: "built_in",
				id: node.id,
				name: node.name,
				dataType: node.dataType,
			};
			return field;
		}

		default:
			return null;
	}
}

// ── List Projects ───────────────────────────────────────────────────

/**
 * List projects for an owner (org or user).
 *
 * @see https://cli.github.com/manual/gh_project_list
 */
export async function listProjects(
	owner: string,
): Promise<Array<{ id: string; number: number; title: string; url: string }>> {
	interface GhProjectListJson {
		projects: Array<{
			id: string;
			number: number;
			title: string;
			url: string;
		}>;
	}

	const result = await cli.ghJson<GhProjectListJson>([
		"project",
		"list",
		"--owner",
		owner,
		"--format",
		"json",
	]);

	return result.projects ?? [];
}

// ── Create / Edit / Link Projects ───────────────────────────────────

/**
 * Create a new project for an owner.
 *
 * @see https://cli.github.com/manual/gh_project_create
 */
export async function createProject(
	owner: string,
	title: string,
): Promise<GhProjectCreateJson> {
	const normalizedTitle = title.trim();
	if (!normalizedTitle) {
		throw new ValidationError("title", "Project title cannot be empty");
	}

	return cli.ghJson<GhProjectCreateJson>([
		"project",
		"create",
		"--owner",
		owner,
		"--title",
		normalizedTitle,
		"--format",
		"json",
	]);
}

/**
 * Edit project metadata.
 *
 * No-op if no editable fields are provided.
 *
 * @see https://cli.github.com/manual/gh_project_edit
 */
export async function editProject(
	owner: string,
	projectNumber: number,
	input: {
		title?: string;
		description?: string;
		readme?: string;
		visibility?: ProjectVisibility;
	},
): Promise<void> {
	const args = ["project", "edit", String(projectNumber), "--owner", owner];

	if (input.title != null) {
		const normalizedTitle = input.title.trim();
		if (!normalizedTitle) {
			throw new ValidationError("title", "Project title cannot be empty");
		}
		args.push("--title", normalizedTitle);
	}
	if (input.description != null) {
		args.push("--description", input.description);
	}
	if (input.readme != null) {
		args.push("--readme", input.readme);
	}
	if (input.visibility != null) {
		args.push("--visibility", input.visibility);
	}

	// Base args only, nothing to edit.
	if (args.length === 5) {
		return;
	}

	await cli.gh(args);
}

/**
 * Link a repository to a project.
 *
 * @see https://cli.github.com/manual/gh_project_link
 */
export async function linkProjectToRepository(
	owner: string,
	projectNumber: number,
	repo?: string,
): Promise<void> {
	const args = ["project", "link", String(projectNumber), "--owner", owner];
	if (repo) {
		args.push("--repo", repo);
	}
	await cli.gh(args);
}

/**
 * Create a custom field on a project.
 *
 * Supports `TEXT`, `NUMBER`, `DATE`, `SINGLE_SELECT`.
 *
 * @see https://cli.github.com/manual/gh_project_field-create
 */
export async function createProjectField(
	owner: string,
	projectNumber: number,
	input: ProjectFieldCreateInput,
): Promise<void> {
	const normalizedName = input.name.trim();
	if (!normalizedName) {
		throw new ValidationError("field.name", "Field name cannot be empty");
	}

	const args = [
		"project",
		"field-create",
		String(projectNumber),
		"--owner",
		owner,
		"--name",
		normalizedName,
		"--data-type",
		input.dataType,
	];

	switch (input.dataType) {
		case "SINGLE_SELECT": {
			const options = input.options
				.map((option) => option.trim())
				.filter((option) => option.length > 0);

			if (options.length === 0) {
				throw new ValidationError(
					"field.options",
					`Single-select field "${normalizedName}" requires at least one option`,
				);
			}

			args.push("--single-select-options", options.join(","));
			break;
		}

		case "TEXT":
		case "NUMBER":
		case "DATE":
			break;

		default: {
			const unreachable: never = input;
			throw new ValidationError(
				"field.dataType",
				`Unsupported field type: ${JSON.stringify(unreachable)}`,
			);
		}
	}

	await cli.gh(args);
}

// ── Project Items ───────────────────────────────────────────────────

/**
 * List all items in a project with their field values.
 *
 * Uses GraphQL because `gh project item-list` doesn't include field values.
 *
 * @see https://docs.github.com/en/graphql/reference/objects#projectv2item
 */
export async function listProjectItems(
	projectNodeId: string,
	options?: { limit?: number },
): Promise<ProjectItem[]> {
	const items: ProjectItem[] = [];
	let cursor: string | null = null;
	const perPage = 50;
	const maxItems = options?.limit ?? 500;

	while (items.length < maxItems) {
		const query = `query($projectId: ID!, $first: Int!, $after: String) {
      node(id: $projectId) {
        ... on ProjectV2 {
          items(first: $first, after: $after) {
            pageInfo { hasNextPage endCursor }
            nodes {
              id
              type
              content {
                ... on Issue {
                  id
                  number
                  title
                  body
                  state
                  url
                  assignees(first: 10) { nodes { login } }
                  labels(first: 10) { nodes { name } }
                }
                ... on PullRequest {
                  id
                  number
                  title
                  body
                  state
                  url
                  assignees(first: 10) { nodes { login } }
                  labels(first: 10) { nodes { name } }
                }
                ... on DraftIssue {
                  id
                  title
                  body
                }
              }
              fieldValues(first: 20) {
                nodes {
                  ... on ProjectV2ItemFieldTextValue {
                    text
                    field { ... on ProjectV2Field { name } }
                  }
                  ... on ProjectV2ItemFieldNumberValue {
                    number
                    field { ... on ProjectV2Field { name } }
                  }
                  ... on ProjectV2ItemFieldDateValue {
                    date
                    field { ... on ProjectV2Field { name } }
                  }
                  ... on ProjectV2ItemFieldSingleSelectValue {
                    name
                    optionId
                    field { ... on ProjectV2SingleSelectField { name } }
                  }
                  ... on ProjectV2ItemFieldIterationValue {
                    title
                    iterationId
                    startDate
                    duration
                    field { ... on ProjectV2IterationField { name } }
                  }
                  ... on ProjectV2ItemFieldUserValue {
                    users(first: 10) { nodes { login } }
                    field { ... on ProjectV2Field { name } }
                  }
                  ... on ProjectV2ItemFieldLabelValue {
                    labels(first: 10) { nodes { name } }
                    field { ... on ProjectV2Field { name } }
                  }
                  ... on ProjectV2ItemFieldMilestoneValue {
                    milestone { title }
                    field { ... on ProjectV2Field { name } }
                  }
                  ... on ProjectV2ItemFieldRepositoryValue {
                    repository { nameWithOwner }
                    field { ... on ProjectV2Field { name } }
                  }
                }
              }
            }
          }
        }
      }
    }`;

		const variables: Record<string, string | number | boolean> = {
			projectId: projectNodeId,
			first: Math.min(perPage, maxItems - items.length),
		};
		if (cursor) {
			variables.after = cursor;
		}

		const data = await cli.graphql<{
			node: {
				items: {
					pageInfo: { hasNextPage: boolean; endCursor: string | null };
					nodes: Array<RawProjectItem>;
				};
			};
		}>(query, variables);

		for (const raw of data.node.items.nodes) {
			const item = mapProjectItem(raw);
			if (item) items.push(item);
		}

		if (
			!data.node.items.pageInfo.hasNextPage ||
			!data.node.items.pageInfo.endCursor
		) {
			break;
		}
		cursor = data.node.items.pageInfo.endCursor;
	}

	return items;
}

// ── Raw types from GraphQL ──────────────────────────────────────────

interface RawProjectItem {
	id: string;
	type: string;
	content: {
		id?: string;
		number?: number;
		title?: string;
		body?: string;
		state?: string;
		url?: string;
		assignees?: { nodes: Array<{ login: string }> };
		labels?: { nodes: Array<{ name: string }> };
	} | null;
	fieldValues: {
		nodes: Array<RawFieldValue>;
	};
}

interface RawFieldValue {
	field?: { name: string };
	// SingleSelect
	name?: string;
	optionId?: string;
	// Iteration
	title?: string;
	iterationId?: string;
	startDate?: string;
	duration?: number;
	// Text
	text?: string;
	// Number
	number?: number;
	// Date
	date?: string;
	// Users
	users?: { nodes: Array<{ login: string }> };
	// Labels
	labels?: { nodes: Array<{ name: string }> };
	// Milestone
	milestone?: { title: string };
	// Repository
	repository?: { nameWithOwner: string };
}

function mapProjectItem(raw: RawProjectItem): ProjectItem | null {
	if (!raw.content) return null;

	const contentType =
		raw.type === "ISSUE"
			? "issue"
			: raw.type === "PULL_REQUEST"
				? "pull_request"
				: "draft_issue";

	const content: ItemContent = {
		nodeId: raw.content.id ?? "",
		number: raw.content.number ?? null,
		title: raw.content.title ?? "",
		body: raw.content.body ?? null,
		state: raw.content.state?.toLowerCase() ?? null,
		url: raw.content.url ?? null,
		labels: raw.content.labels?.nodes.map((l) => l.name) ?? [],
		assignees: raw.content.assignees?.nodes.map((a) => a.login) ?? [],
	};

	const fieldValues = new Map<string, FieldValue>();

	for (const fv of raw.fieldValues.nodes) {
		const fieldName = fv.field?.name;
		if (!fieldName) continue;

		const value = mapFieldValue(fv);
		if (value) {
			fieldValues.set(fieldName, value);
		}
	}

	return {
		id: raw.id,
		contentType: contentType as ProjectItem["contentType"],
		content,
		fieldValues,
	};
}

function mapFieldValue(raw: RawFieldValue): FieldValue | null {
	if (raw.optionId != null && raw.name != null) {
		return { type: "single_select", optionId: raw.optionId, name: raw.name };
	}
	if (raw.iterationId != null && raw.title != null) {
		return {
			type: "iteration",
			iterationId: raw.iterationId,
			title: raw.title,
			startDate: raw.startDate ?? "",
			duration: raw.duration ?? 0,
		};
	}
	if (raw.text != null) {
		return { type: "text", text: raw.text };
	}
	if (raw.number != null && raw.optionId == null) {
		return { type: "number", number: raw.number };
	}
	if (raw.date != null) {
		return { type: "date", date: raw.date };
	}
	if (raw.users) {
		return { type: "users", logins: raw.users.nodes.map((u) => u.login) };
	}
	if (raw.labels) {
		return { type: "labels", names: raw.labels.nodes.map((l) => l.name) };
	}
	if (raw.milestone) {
		return { type: "milestone", title: raw.milestone.title };
	}
	if (raw.repository) {
		return { type: "repository", nameWithOwner: raw.repository.nameWithOwner };
	}
	return null;
}

// ── Add Item to Project ─────────────────────────────────────────────

/**
 * Add an existing issue/PR to a project by its node ID.
 * Returns the project item ID.
 *
 * @see https://cli.github.com/manual/gh_project_item-add
 */
export async function addItemToProject(
	owner: string,
	projectNumber: number,
	issueUrl: string,
): Promise<string> {
	// gh project item-add returns the item ID
	const output = await cli.gh([
		"project",
		"item-add",
		String(projectNumber),
		"--owner",
		owner,
		"--url",
		issueUrl,
		"--format",
		"json",
	]);

	const parsed = JSON.parse(output) as { id: string };
	return parsed.id;
}
