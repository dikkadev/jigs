# Readiness Checklist

Run through this before declaring the jig ready for AI-assisted scripting.

---

## Library Quality

- [ ] Every public type, function, and method has docstrings with description and at least one example
- [ ] Types are precise — no `any` (TS) or untyped `dict` (Python) in the public API
- [ ] Enums/literals used where a string has known valid values
- [ ] Functions return typed results (not void/None for state-changing operations)
- [ ] Errors are typed and specific (not bare `Error("something went wrong")`)
- [ ] Errors include relevant context (the ID that wasn't found, the URL that failed)
- [ ] `connect()` / initialization works with zero configuration in the default case
- [ ] No side effects on import (no connections, no logging, no config reading)
- [ ] Write operations document their idempotency behavior

## Documentation Quality

- [ ] `DOMAIN.md` exists describing the domain in plain language
- [ ] `docs/GUIDE.md` exists explaining the mental model in narrative form
- [ ] `docs/API.md` exists covering all public exports with signatures and descriptions
- [ ] `docs/EXAMPLES.md` exists with 5+ real-world script examples
- [ ] `docs/CONCEPTS.md` exists for domain concepts not obvious from the API
- [ ] Agent instructions (`CLAUDE.md` and/or `AGENTS.md`) exist and are accurate

## Script Infrastructure

- [ ] A `_template` script exists with --dry-run, --help, and error handling
- [ ] Template uses PEP 723 inline metadata (Python) or proper imports (TypeScript)
- [ ] Script utilities exist for common needs (confirmation, progress, tables)
- [ ] Scripts can be run directly: `uv run scripts/foo.py` or `bun run scripts/foo.ts`
- [ ] At least 3 example scripts exist and are tested:
  - [ ] One read-only (list/query/export)
  - [ ] One single write operation
  - [ ] One batch/multi-step operation

## Safety

- [ ] Destructive operations require explicit opt-in (flag or confirmation)
- [ ] Dry-run mode shows exactly what would change without changing anything
- [ ] The library validates inputs before sending them to the underlying system
- [ ] Scripts fail fast and clearly on misconfiguration
- [ ] No secrets hardcoded anywhere — config via env vars or explicit parameters

## The Acid Test

- [ ] Open the project in an AI coding agent (Claude Code, opencode, etc.)
- [ ] Ask it to write a script for a task not covered by existing examples
- [ ] The agent succeeds without extra guidance beyond reading the docs
- [ ] If it fails, the gap is in documentation — fix and re-test
