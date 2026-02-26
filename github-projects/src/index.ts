/**
 * # github-projects
 *
 * A TypeScript library for managing GitHub Issues and Projects V2.
 * Designed for AI coding agents to write short, validated scripts.
 *
 * ## Quick Start
 *
 * ```ts
 * import { connect } from "./src/index.js";
 *
 * const gh = await connect(); // detects owner/repo from cwd
 * const project = await gh.getProject(3);
 * console.log(project.title, [...project.fields.keys()]);
 * ```
 *
 * ## Documentation
 *
 * - `docs/GUIDE.md` — Mental model and usage patterns
 * - `docs/API.md` — Complete API reference
 * - `docs/EXAMPLES.md` — Curated script examples
 * - `docs/CONCEPTS.md` — GitHub Projects V2 domain concepts
 */

// ── Client ─────────────────────────────────────────────────────────
export { connect, GitHubProjectsClient, ProjectWithActions } from "./client.js";

// ── Types ──────────────────────────────────────────────────────────
export type {
	// Domain entities
	GitHubIssue,
	Project,
	ProjectItem,
	ItemContent,
	ProjectField,
	SingleSelectField,
	SingleSelectOption,
	IterationField,
	Iteration,
	TextField,
	NumberField,
	DateField,
	BuiltInField,
	FieldValue,
	// Options & Inputs
	ConnectOptions,
	CreateProjectInput,
	ProjectFieldCreateInput,
	ProjectVisibility,
	CreateIssueInput,
	ProjectFieldsInput,
	DraftInput,
	FindItemsCriteria,
	// Results
	CreateProjectResult,
	ProjectFieldCreateResult,
	CreateTicketResult,
	BulkUpdateResult,
	PreviewRow,
	ResolvedIssue,
} from "./types.js";

// ── Builders ───────────────────────────────────────────────────────
export { DraftTicket, DraftBatch } from "./builders/draft.js";
export { BulkUpdatePlan } from "./builders/bulk.js";
export type { IssueRef } from "./builders/resolve.js";

// ── Errors ─────────────────────────────────────────────────────────
export {
	GitHubProjectsError,
	AuthError,
	NotFoundError,
	ValidationError,
	GhCliError,
	MissingScopeError,
} from "./errors.js";
