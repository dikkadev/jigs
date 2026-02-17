#!/usr/bin/env bun
/**
 * Script: Show project #8 items with field data
 * Usage: bun run scripts/show-project.ts
 */

import { connect } from "../src/index.js";

async function main() {
  const gh = await connect({ owner: "DE-AMS-AD-TECUNIVERS", repo: "profil-checker" });
  const project = await gh.getProject(8);

  console.log(`━━━ Project #${project.number}: ${project.title} ━━━`);
  if (project.description) console.log(`    ${project.description}`);
  console.log();

  // Collect non-built-in field names
  const fieldNames: string[] = [];
  for (const [name, field] of project.fields) {
    if (field.type === "built_in") continue;
    fieldNames.push(name);
  }

  const items = await project.listItems();

  if (items.length === 0) {
    console.log("  (no items)");
    return;
  }

  // Build table rows
  const rows: string[][] = [];
  for (const item of items) {
    const num = item.content.number ? `#${item.content.number}` : "draft";
    const title = item.content.title.length > 55
      ? `${item.content.title.slice(0, 52)}...`
      : item.content.title;

    const fieldCells: string[] = [];
    for (const fname of fieldNames) {
      const fv = item.fieldValues.get(fname);
      if (!fv) { fieldCells.push("—"); continue; }
      switch (fv.type) {
        case "single_select": fieldCells.push(fv.name); break;
        case "iteration": fieldCells.push(fv.title); break;
        case "text": fieldCells.push(fv.text.slice(0, 20)); break;
        case "number": fieldCells.push(String(fv.number)); break;
        case "date": fieldCells.push(fv.date); break;
        default: fieldCells.push("…");
      }
    }

    rows.push([num, title, ...fieldCells]);
  }

  // Calculate column widths
  const headers = ["#", "Title", ...fieldNames];
  const widths = headers.map((h, i) => {
    const maxData = rows.reduce((max, row) => Math.max(max, (row[i] ?? "").length), 0);
    return Math.max(h.length, maxData);
  });

  // Render table
  const pad = (s: string, w: number) => s.padEnd(w);
  const line = (char: string, corners: [string, string, string]) =>
    `${corners[0]}${widths.map(w => char.repeat(w + 2)).join(corners[1])}${corners[2]}`;

  console.log(line("─", ["┌", "┬", "┐"]));
  console.log(`│ ${headers.map((h, i) => pad(h, widths[i]!)).join(" │ ")} │`);
  console.log(line("─", ["├", "┼", "┤"]));
  for (const row of rows) {
    console.log(`│ ${row.map((c, i) => pad(c, widths[i]!)).join(" │ ")} │`);
  }
  console.log(line("─", ["└", "┴", "┘"]));
  console.log(`  ${items.length} items`);
}

main().catch((err) => {
  console.error("Script failed:", err.message);
  process.exit(1);
});
