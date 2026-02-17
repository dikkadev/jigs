/**
 * Draft builder — creates a plan for issue creation with project field assignments.
 *
 * The two-step flow: `gh.draft({...})` → `.preview()` → `.create()`
 *
 * @internal
 */

import type { CreateTicketResult, DraftInput, Project } from "../types.js";
import { resolveFields } from "../operations/fields.js";
import * as issueOps from "../operations/issues.js";
import * as projectOps from "../operations/projects.js";
import { setFieldValue } from "../operations/fields.js";

/** A planned ticket ready to preview and create. */
export class DraftTicket {
  private resolvedProject: Project | null = null;
  private resolvedFields: Array<{
    fieldId: string;
    fieldName: string;
    mutationValue: Record<string, string | number>;
    displayValue: string;
  }> = [];

  constructor(
    private readonly owner: string,
    private readonly repo: string,
    private readonly input: DraftInput,
  ) {}

  /**
   * Resolve all references (project, field options, iterations) and return
   * a human-readable preview string.
   *
   * This validates everything upfront — if field names or values are wrong,
   * this will throw before any API calls are made.
   */
  async preview(): Promise<string> {
    // Resolve project and fields if specified
    if (this.input.project) {
      this.resolvedProject = await projectOps.getProject(
        this.owner,
        this.input.project.number,
      );
      this.resolvedFields = resolveFields(
        this.resolvedProject,
        this.input.project.fields,
      );
    }

    const lines: string[] = [];
    lines.push(`Issue: "${this.input.title}"`);

    if (this.input.labels?.length) {
      lines.push(`Labels: ${this.input.labels.join(", ")}`);
    }
    if (this.input.assignees?.length) {
      lines.push(`Assignees: ${this.input.assignees.join(", ")}`);
    }
    if (this.input.milestone) {
      lines.push(`Milestone: ${this.input.milestone}`);
    }
    if (this.input.body) {
      const bodyPreview =
        this.input.body.length > 120
          ? `${this.input.body.slice(0, 120)}...`
          : this.input.body;
      lines.push(`Body: ${bodyPreview}`);
    }

    if (this.resolvedProject && this.resolvedFields.length > 0) {
      lines.push(
        `Project #${this.resolvedProject.number} "${this.resolvedProject.title}":`,
      );
      for (const rf of this.resolvedFields) {
        lines.push(`  ${rf.fieldName}: ${rf.displayValue}`);
      }
    }

    return lines.join("\n");
  }

  /**
   * Create the issue, add to project, and set field values.
   *
   * Call `.preview()` first to validate and see what will happen.
   */
  async create(): Promise<CreateTicketResult> {
    // Ensure we've resolved everything
    if (this.input.project && !this.resolvedProject) {
      await this.preview();
    }

    // 1. Create the issue
    const issue = await issueOps.createIssue(this.owner, this.repo, {
      title: this.input.title,
      body: this.input.body,
      labels: this.input.labels,
      assignees: this.input.assignees,
      milestone: this.input.milestone,
    });

    const result: CreateTicketResult = { issue };

    // 2. Add to project and set fields
    if (this.resolvedProject && this.input.project) {
      const itemId = await projectOps.addItemToProject(
        this.owner,
        this.input.project.number,
        issue.url,
      );

      result.projectItem = { id: itemId };
      result.fieldsSet = {};

      // 3. Set each field value
      for (const rf of this.resolvedFields) {
        const field = this.resolvedProject.fields.get(rf.fieldName);
        if (field) {
          await setFieldValue(this.resolvedProject.id, itemId, field, this.input.project.fields[rf.fieldName]!);
          result.fieldsSet[rf.fieldName] = rf.displayValue;
        }
      }
    }

    return result;
  }
}

// ── Batch Draft ─────────────────────────────────────────────────────

/** A batch of planned tickets ready to preview and create. */
export class DraftBatch {
  private drafts: DraftTicket[];

  constructor(
    owner: string,
    repo: string,
    inputs: DraftInput[],
  ) {
    this.drafts = inputs.map((input) => new DraftTicket(owner, repo, input));
  }

  /** Preview all tickets in the batch. */
  async preview(): Promise<string> {
    const lines: string[] = [];
    lines.push(`Batch create: ${this.drafts.length} issues in this repo`);
    lines.push("");

    // Build a table
    const rows: Array<{
      idx: number;
      title: string;
      labels: string;
      fields: Record<string, string>;
    }> = [];

    for (let i = 0; i < this.drafts.length; i++) {
      const draft = this.drafts[i]!;
      const previewText = await draft.preview();
      // Parse the preview to extract info
      const fieldLines: Record<string, string> = {};
      for (const line of previewText.split("\n")) {
        const fieldMatch = line.match(/^\s{2}(\w+):\s+(.+)$/);
        if (fieldMatch?.[1] && fieldMatch?.[2]) {
          fieldLines[fieldMatch[1]] = fieldMatch[2];
        }
      }

      rows.push({
        idx: i + 1,
        title: (draft as unknown as { input: DraftInput }).input.title,
        labels: (draft as unknown as { input: DraftInput }).input.labels?.join(", ") ?? "",
        fields: fieldLines,
      });
    }

    // Collect all field names across all rows
    const allFieldNames = new Set<string>();
    for (const row of rows) {
      for (const name of Object.keys(row.fields)) {
        allFieldNames.add(name);
      }
    }

    // Simple table output
    const header = ["#", "Title", ...allFieldNames];
    lines.push(header.join(" | "));
    lines.push(header.map((h) => "-".repeat(h.length)).join("-+-"));

    for (const row of rows) {
      const title =
        row.title.length > 50 ? `${row.title.slice(0, 47)}...` : row.title;
      const fieldValues = [...allFieldNames].map(
        (name) => row.fields[name] ?? "",
      );
      lines.push([String(row.idx), title, ...fieldValues].join(" | "));
    }

    return lines.join("\n");
  }

  /** Create all tickets in the batch. */
  async create(): Promise<CreateTicketResult[]> {
    const results: CreateTicketResult[] = [];
    for (const draft of this.drafts) {
      results.push(await draft.create());
    }
    return results;
  }
}
