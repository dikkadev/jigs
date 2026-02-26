#!/usr/bin/env bun
/**
 * Script: Bootstrap a GitHub project and seed issues
 * Created: 2026-02-26
 *
 * Creates a new project board, links the current repository, creates custom
 * fields (if missing), then creates starter issues and assigns project field
 * values in one flow.
 *
 * Usage:
 *   bun run scripts/examples/bootstrap-project.ts
 *   bun run scripts/examples/bootstrap-project.ts --project-only
 *   bun run scripts/examples/bootstrap-project.ts --dry-run
 */

import { parseArgs } from "node:util";
import type { ProjectFieldCreateInput } from "../../src/index.js";
import { connect } from "../../src/index.js";

const { values: args } = parseArgs({
	options: {
		"dry-run": { type: "boolean", default: false },
		"project-only": { type: "boolean", default: false },
		help: { type: "boolean", default: false },
	},
});

if (args.help) {
	console.log(`
Usage: bun run scripts/examples/bootstrap-project.ts [options]

Create a GitHub project board, add custom fields, then create and assign issues.

Options:
  --dry-run       Print the full execution plan without making changes
  --project-only  Create/configure the project, skip creating issues
  --help          Show this help message
`);
	process.exit(0);
}

const PROJECT_TITLE = "Platform Backlog";
const PROJECT_DESCRIPTION =
	"Kanban board for platform work. Created by github-projects jig.";

const PROJECT_FIELDS: ProjectFieldCreateInput[] = [
	{
		name: "Priority",
		dataType: "SINGLE_SELECT",
		options: ["P0", "P1", "P2", "P3"],
	},
	{
		name: "Size",
		dataType: "SINGLE_SELECT",
		options: ["XS", "S", "M", "L", "XL"],
	},
];

const REQUESTED_VIEWS = ["Backlog", "Board", "Current Iteration"];

interface StarterIssue {
	title: string;
	body?: string;
	labels?: string[];
	fields: Record<string, string | number>;
}

const STARTER_ISSUES: StarterIssue[] = [
	{
		title: "Set up API request logging baseline",
		labels: ["enhancement", "observability"],
		fields: { Status: "Todo", Priority: "P1", Size: "S" },
	},
	{
		title: "Add rate limiting to /api/search",
		labels: ["enhancement", "api"],
		fields: { Status: "Todo", Priority: "P1", Size: "M" },
	},
	{
		title: "Document incident runbook for API outages",
		labels: ["documentation"],
		fields: { Status: "Todo", Priority: "P2", Size: "S" },
	},
];

function printDryRunPlan(): void {
	console.log("DRY RUN PLAN");
	console.log("============");
	console.log(`Project title: ${PROJECT_TITLE}`);
	console.log(`Project description: ${PROJECT_DESCRIPTION}`);
	console.log("Link repository: yes");
	console.log("Fields:");
	for (const field of PROJECT_FIELDS) {
		if (field.dataType === "SINGLE_SELECT") {
			console.log(
				`  - ${field.name} (${field.dataType}): ${field.options.join(", ")}`,
			);
			continue;
		}
		console.log(`  - ${field.name} (${field.dataType})`);
	}
	console.log("Requested views/tabs:");
	for (const viewName of REQUESTED_VIEWS) {
		console.log(`  - ${viewName}`);
	}

	if (args["project-only"]) {
		console.log("\nIssue creation: skipped (--project-only)");
		return;
	}

	console.log("\nIssues to create and add:");
	for (const issue of STARTER_ISSUES) {
		const labels = issue.labels?.join(", ") ?? "(none)";
		const fields = Object.entries(issue.fields)
			.map(([name, value]) => `${name}=${value}`)
			.join(", ");
		console.log(`  - ${issue.title}`);
		console.log(`    labels: ${labels}`);
		console.log(`    project fields: ${fields}`);
	}
}

async function main() {
	if (args["dry-run"]) {
		printDryRunPlan();
		return;
	}

	const gh = await connect();

	const created = await gh.createProject({
		title: PROJECT_TITLE,
		description: PROJECT_DESCRIPTION,
		linkRepository: true,
		fields: PROJECT_FIELDS,
		views: REQUESTED_VIEWS,
	});

	console.log(
		`Created project #${created.project.number}: ${created.project.title}`,
	);
	console.log(created.project.url);

	if (created.fields.length > 0) {
		console.log("\nField setup:");
		for (const result of created.fields) {
			if (result.created) {
				console.log(`  + created: ${result.name}`);
			} else {
				console.log(
					`  - skipped: ${result.name} (${result.reason ?? "unknown"})`,
				);
			}
		}
	}

	if (created.viewsSkipped.length > 0) {
		console.log("\nView/tab setup:");
		for (const skipped of created.viewsSkipped) {
			console.log(`  - ${skipped}`);
		}
	}

	if (args["project-only"]) {
		console.log("\nProject bootstrap complete (--project-only).");
		return;
	}

	const batch = gh.draftBatch(
		STARTER_ISSUES.map((issue) => ({
			title: issue.title,
			body: issue.body,
			labels: issue.labels,
			project: {
				number: created.project.number,
				fields: issue.fields,
			},
		})),
	);

	console.log("\nIssue creation preview:");
	console.log(await batch.preview());

	const results = await batch.create();
	console.log(`\nCreated ${results.length} issues:`);
	for (const result of results) {
		console.log(`  - #${result.issue.number}: ${result.issue.url}`);
	}
}

main().catch((err) => {
	console.error("Script failed:", err.message);
	process.exit(1);
});
