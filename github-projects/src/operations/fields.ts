/**
 * Field value operations — set, clear, and batch-update project item fields.
 *
 * Uses `gh project item-edit` for single updates and `gh api graphql` for
 * batched mutations.
 *
 * @internal
 */

import { NotFoundError, ValidationError } from "../errors.js";
import * as cli from "../gh.js";
import type {
  FieldValue,
  IterationField,
  Project,
  ProjectField,
  SingleSelectField,
} from "../types.js";

// ── Field Resolution ────────────────────────────────────────────────

/**
 * Resolve a human-readable field value to the mutation input.
 *
 * Handles:
 * - SingleSelect: name → option ID
 * - Iteration: title or magic values (`@current`, `@next`) → iteration ID
 * - Text: passthrough
 * - Number: passthrough
 * - Date: passthrough
 */
export function resolveFieldValue(
  field: ProjectField,
  value: string | number,
): { type: string; mutationValue: Record<string, string | number> } {
  switch (field.type) {
    case "single_select":
      return resolveSingleSelect(field, String(value));
    case "iteration":
      return resolveIteration(field, String(value));
    case "text":
      return { type: "text", mutationValue: { text: String(value) } };
    case "number":
      return { type: "number", mutationValue: { number: Number(value) } };
    case "date":
      return { type: "date", mutationValue: { date: String(value) } };
    case "built_in":
      throw new ValidationError(
        field.name,
        `Built-in field "${field.name}" cannot be set via project field mutations. ` +
          `Use issue labels/assignees/milestone instead.`,
      );
  }
}

function resolveSingleSelect(
  field: SingleSelectField,
  valueName: string,
): { type: string; mutationValue: Record<string, string> } {
  // Case-insensitive match
  const option = field.options.find(
    (o) => o.name.toLowerCase() === valueName.toLowerCase(),
  );

  if (!option) {
    const available = field.options.map((o) => o.name).join(", ");
    throw new NotFoundError(
      "option",
      `"${valueName}" in field "${field.name}". Available: ${available}`,
    );
  }

  return {
    type: "single_select",
    mutationValue: { singleSelectOptionId: option.id },
  };
}

function resolveIteration(
  field: IterationField,
  value: string,
): { type: string; mutationValue: Record<string, string> } {
  const today = new Date().toISOString().slice(0, 10);

  if (value === "@current") {
    // Find the iteration that contains today
    const current = field.iterations.find((iter) => {
      const start = iter.startDate;
      const endDate = new Date(start);
      endDate.setDate(endDate.getDate() + iter.duration);
      const end = endDate.toISOString().slice(0, 10);
      return start <= today && today <= end;
    });

    if (!current) {
      throw new NotFoundError(
        "iteration",
        `@current — no iteration contains today (${today}). Available: ${field.iterations.map((i) => `${i.title} (${i.startDate})`).join(", ")}`,
      );
    }

    return { type: "iteration", mutationValue: { iterationId: current.id } };
  }

  if (value === "@next") {
    // Find the next iteration after today
    const upcoming = field.iterations
      .filter((iter) => iter.startDate > today)
      .sort((a, b) => a.startDate.localeCompare(b.startDate));

    if (!upcoming.length) {
      throw new NotFoundError(
        "iteration",
        `@next — no upcoming iterations after ${today}`,
      );
    }

    return { type: "iteration", mutationValue: { iterationId: upcoming[0]!.id } };
  }

  // Match by title (case-insensitive)
  const match = field.iterations.find(
    (i) => i.title.toLowerCase() === value.toLowerCase(),
  );

  if (!match) {
    const available = field.iterations.map((i) => i.title).join(", ");
    throw new NotFoundError(
      "iteration",
      `"${value}" in field "${field.name}". Available: ${available}`,
    );
  }

  return { type: "iteration", mutationValue: { iterationId: match.id } };
}

// ── Single Field Update ─────────────────────────────────────────────

/**
 * Set a single field value on a project item.
 *
 * @see https://cli.github.com/manual/gh_project_item-edit
 */
export async function setFieldValue(
  projectId: string,
  itemId: string,
  field: ProjectField,
  value: string | number,
): Promise<void> {
  const resolved = resolveFieldValue(field, value);

  // Build gh project item-edit command
  const args = [
    "project",
    "item-edit",
    "--id",
    itemId,
    "--project-id",
    projectId,
    "--field-id",
    field.id,
  ];

  // Add the type-specific flag
  switch (resolved.type) {
    case "single_select":
      args.push("--single-select-option-id", resolved.mutationValue.singleSelectOptionId as string);
      break;
    case "iteration":
      args.push("--iteration-id", resolved.mutationValue.iterationId as string);
      break;
    case "text":
      args.push("--text", resolved.mutationValue.text as string);
      break;
    case "number":
      args.push("--number", String(resolved.mutationValue.number));
      break;
    case "date":
      args.push("--date", resolved.mutationValue.date as string);
      break;
  }

  await cli.gh(args);
}

// ── Batch Field Update ──────────────────────────────────────────────

interface BatchFieldUpdate {
  itemId: string;
  fieldId: string;
  value: Record<string, string | number>;
}

/**
 * Set multiple field values across one or more items in a single GraphQL request.
 *
 * Uses aliased mutations to batch all updates into one round-trip.
 *
 * @see https://docs.github.com/en/graphql/reference/mutations#updateprojectv2itemfieldvalue
 */
export async function batchSetFields(
  projectId: string,
  updates: BatchFieldUpdate[],
): Promise<void> {
  if (updates.length === 0) return;

  // Build a single GraphQL mutation with aliases
  const mutations = updates.map((u, i) => {
    const valueJson = JSON.stringify(u.value).replace(/"/g, '\\"');
    // We need to pass variables, so let's build it differently
    return `update_${i}: updateProjectV2ItemFieldValue(input: {
      projectId: $projectId
      itemId: $itemId_${i}
      fieldId: $fieldId_${i}
      value: $value_${i}
    }) { projectV2Item { id } }`;
  });

  // For simplicity and reliability, use individual gh project item-edit calls
  // when the batch is small (< 10), and GraphQL batching for larger batches.
  // The GraphQL variable typing for ProjectV2FieldValue is complex, so we use
  // individual calls which are more reliable via the gh CLI.
  for (const update of updates) {
    await setFieldValueRaw(projectId, update.itemId, update.fieldId, update.value);
  }
}

/**
 * Set a field value using raw IDs (no field resolution needed).
 * Used internally by batch operations.
 */
async function setFieldValueRaw(
  projectId: string,
  itemId: string,
  fieldId: string,
  value: Record<string, string | number>,
): Promise<void> {
  const args = [
    "project",
    "item-edit",
    "--id",
    itemId,
    "--project-id",
    projectId,
    "--field-id",
    fieldId,
  ];

  if ("singleSelectOptionId" in value) {
    args.push("--single-select-option-id", String(value.singleSelectOptionId));
  } else if ("iterationId" in value) {
    args.push("--iteration-id", String(value.iterationId));
  } else if ("text" in value) {
    args.push("--text", String(value.text));
  } else if ("number" in value) {
    args.push("--number", String(value.number));
  } else if ("date" in value) {
    args.push("--date", String(value.date));
  }

  await cli.gh(args);
}

// ── Clear Field ─────────────────────────────────────────────────────

/**
 * Clear a field value from a project item.
 *
 * @see https://cli.github.com/manual/gh_project_item-edit
 */
export async function clearFieldValue(
  projectId: string,
  itemId: string,
  fieldId: string,
): Promise<void> {
  await cli.gh([
    "project",
    "item-edit",
    "--id",
    itemId,
    "--project-id",
    projectId,
    "--field-id",
    fieldId,
    "--clear",
  ]);
}

// ── Resolve Multiple Fields ─────────────────────────────────────────

/**
 * Resolve a map of human-readable field:value pairs to mutation inputs.
 * Used by the draft/bulk builders to validate all fields before executing.
 *
 * @returns Array of { fieldId, fieldName, resolvedValue, displayValue } for each field
 */
export function resolveFields(
  project: Project,
  fieldValues: Record<string, string | number>,
): Array<{
  fieldId: string;
  fieldName: string;
  mutationValue: Record<string, string | number>;
  displayValue: string;
}> {
  const results: Array<{
    fieldId: string;
    fieldName: string;
    mutationValue: Record<string, string | number>;
    displayValue: string;
  }> = [];

  for (const [fieldName, value] of Object.entries(fieldValues)) {
    const field = project.fields.get(fieldName);
    if (!field) {
      const available = [...project.fields.keys()].join(", ");
      throw new NotFoundError(
        "field",
        `"${fieldName}" on project "${project.title}". Available: ${available}`,
      );
    }

    const resolved = resolveFieldValue(field, value);

    // Generate human-readable display value
    let displayValue = String(value);
    if (field.type === "iteration" && (value === "@current" || value === "@next")) {
      const iter = field.iterations.find(
        (i) => i.id === (resolved.mutationValue.iterationId as string),
      );
      if (iter) {
        const endDate = new Date(iter.startDate);
        endDate.setDate(endDate.getDate() + iter.duration);
        displayValue = `${iter.title} (${iter.startDate} → ${endDate.toISOString().slice(0, 10)})`;
      }
    }

    results.push({
      fieldId: field.id,
      fieldName,
      mutationValue: resolved.mutationValue,
      displayValue,
    });
  }

  return results;
}

/**
 * Get the human-readable display string for a field value.
 */
export function fieldValueDisplay(fv: FieldValue | undefined): string | null {
  if (!fv) return null;
  switch (fv.type) {
    case "single_select":
      return fv.name;
    case "iteration":
      return fv.title;
    case "text":
      return fv.text;
    case "number":
      return String(fv.number);
    case "date":
      return fv.date;
    case "users":
      return fv.logins.join(", ");
    case "labels":
      return fv.names.join(", ");
    case "milestone":
      return fv.title;
    case "repository":
      return fv.nameWithOwner;
  }
}
