/**
 * Bulk update builder — set fields on multiple project items with preview.
 *
 * The two-step flow: `project.setFields(items, {...})` → `.preview()` → `.execute()`
 *
 * @internal
 */

import type {
  BulkUpdateResult,
  FindItemsCriteria,
  PreviewRow,
  Project,
  ProjectItem,
} from "../types.js";
import { resolveFields, fieldValueDisplay } from "../operations/fields.js";
import { setFieldValue } from "../operations/fields.js";
import { listProjectItems } from "../operations/projects.js";

// ── Bulk Update Plan ────────────────────────────────────────────────

/** A planned bulk field update ready to preview and execute. */
export class BulkUpdatePlan {
  private rows: PreviewRow[] = [];
  private resolvedFieldInputs: Array<{
    fieldId: string;
    fieldName: string;
    mutationValue: Record<string, string | number>;
    displayValue: string;
  }> = [];

  constructor(
    private readonly project: Project,
    private readonly items: ProjectItem[],
    private readonly fieldValues: Record<string, string | number>,
  ) {
    // Resolve field values upfront (validates field names and option names)
    this.resolvedFieldInputs = resolveFields(project, fieldValues);

    // Build preview rows
    for (const item of items) {
      const changes: Record<string, { from: string | null; to: string }> = {};

      for (const rf of this.resolvedFieldInputs) {
        const currentValue = item.fieldValues.get(rf.fieldName);
        const currentDisplay = fieldValueDisplay(currentValue);
        changes[rf.fieldName] = {
          from: currentDisplay,
          to: rf.displayValue,
        };
      }

      this.rows.push({
        number: item.content.number,
        title: item.content.title,
        itemId: item.id,
        changes,
      });
    }
  }

  /**
   * Generate a human-readable preview table of the planned changes.
   */
  preview(): string {
    if (this.rows.length === 0) {
      return "No items to update.";
    }

    const fieldNames = this.resolvedFieldInputs.map((f) => f.fieldName);

    const lines: string[] = [];

    // Summary line
    const fieldSummary = fieldNames
      .map((name) => {
        const rf = this.resolvedFieldInputs.find((f) => f.fieldName === name);
        return `${name}: "${rf?.displayValue}"`;
      })
      .join(", ");
    lines.push(`Bulk update: ${this.rows.length} items → ${fieldSummary}`);
    lines.push("");

    // Table header
    const columns = ["#", "Title"];
    for (const name of fieldNames) {
      columns.push(`Current ${name}`, `New ${name}`);
    }

    // Calculate column widths
    const widths = columns.map((c) => c.length);

    const tableRows: string[][] = [];
    for (const row of this.rows) {
      const cells: string[] = [
        row.number ? `#${row.number}` : "draft",
        row.title.length > 50 ? `${row.title.slice(0, 47)}...` : row.title,
      ];
      for (const name of fieldNames) {
        const change = row.changes[name];
        cells.push(change?.from ?? "—", change?.to ?? "—");
      }

      // Update widths
      for (let i = 0; i < cells.length; i++) {
        widths[i] = Math.max(widths[i] ?? 0, cells[i]!.length);
      }
      tableRows.push(cells);
    }

    // Render table
    const pad = (s: string, w: number) => s.padEnd(w);
    const sep = widths.map((w) => "─".repeat(w! + 2)).join("┼");

    lines.push(
      `┌${widths.map((w) => "─".repeat(w! + 2)).join("┬")}┐`,
    );
    lines.push(
      `│ ${columns.map((c, i) => pad(c, widths[i]!)).join(" │ ")} │`,
    );
    lines.push(`├${sep}┤`);

    for (const cells of tableRows) {
      lines.push(
        `│ ${cells.map((c, i) => pad(c, widths[i]!)).join(" │ ")} │`,
      );
    }

    lines.push(
      `└${widths.map((w) => "─".repeat(w! + 2)).join("┴")}┘`,
    );

    return lines.join("\n");
  }

  /**
   * Execute all planned field updates.
   */
  async execute(): Promise<BulkUpdateResult[]> {
    const results: BulkUpdateResult[] = [];

    for (const row of this.rows) {
      const fieldsUpdated: Record<string, { from: string | null; to: string }> = {};

      for (const rf of this.resolvedFieldInputs) {
        const field = this.project.fields.get(rf.fieldName);
        if (!field) continue;

        await setFieldValue(
          this.project.id,
          row.itemId,
          field,
          this.fieldValues[rf.fieldName]!,
        );

        fieldsUpdated[rf.fieldName] = row.changes[rf.fieldName]!;
      }

      results.push({
        itemId: row.itemId,
        issueNumber: row.number,
        title: row.title,
        fieldsUpdated,
      });
    }

    return results;
  }
}

// ── Find Items ──────────────────────────────────────────────────────

/**
 * Find project items matching field value criteria.
 *
 * Criteria values are matched by name (case-insensitive).
 * Supports `@current` and `@next` for iteration fields.
 */
export async function findItems(
  project: Project,
  criteria: FindItemsCriteria,
): Promise<ProjectItem[]> {
  // Resolve magic values in criteria
  const resolvedCriteria = new Map<string, string>();
  for (const [fieldName, value] of Object.entries(criteria)) {
    const field = project.fields.get(fieldName);
    if (!field) continue;

    if (field.type === "iteration" && (value === "@current" || value === "@next")) {
      // Resolve to actual iteration title
      const resolved = resolveFields(project, { [fieldName]: value });
      const iterField = project.fields.get(fieldName);
      if (iterField?.type === "iteration" && resolved[0]) {
        const iter = iterField.iterations.find(
          (i) => i.id === (resolved[0]!.mutationValue.iterationId as string),
        );
        if (iter) {
          resolvedCriteria.set(fieldName, iter.title.toLowerCase());
          continue;
        }
      }
    }

    resolvedCriteria.set(fieldName, value.toLowerCase());
  }

  // Fetch all items
  const items = await listProjectItems(project.id);

  // Filter by criteria
  return items.filter((item) => {
    for (const [fieldName, expectedValue] of resolvedCriteria) {
      const fv = item.fieldValues.get(fieldName);
      if (!fv) return false;

      const display = fieldValueDisplay(fv);
      if (!display || display.toLowerCase() !== expectedValue) {
        return false;
      }
    }
    return true;
  });
}
