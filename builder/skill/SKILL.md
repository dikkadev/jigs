---
name: jig-builder
description: Build AI-scriptable domain jigs — typed libraries where an AI coding agent writes short, validated scripts against a stable SDK. Use when a user wants to create an automation jig for a specific domain (home automation, flight sim, CI/CD, APIs, infrastructure, etc.) that an AI agent can write scripts for.
---

# Jig Builder

Build domain-specific libraries designed for AI coding agents to write small, validated scripts on behalf of a user.

The pattern: a **typed SDK** encapsulates domain complexity. An **AI agent** (Claude Code, opencode, Cursor, etc.) writes short scripts using that SDK. The **human** reviews and runs them. Scripts are disposable; the library is durable.

```
User intent (natural language)
        │
        ▼
AI coding agent reads docs + types → writes a script
        │
        ▼
Generated script (small, readable, --dry-run)
        │
        ▼
Domain library / SDK (handles connections, protocols, validation)
```

---

## When to Use This Skill

User says things like:
- "Build me a jig for controlling X"
- "I want to automate Y with AI-written scripts"
- "Create a library that Claude Code can use to manage Z"
- "Make a scriptable SDK for [domain]"

## Process Overview

### Phase 1: Define the Domain Contract

Before any code, produce these artifacts with the user:

1. **DOMAIN.md** — Plain-language description of:
   - What the domain is
   - What entities exist (devices, resources, endpoints, etc.)
   - What operations are possible on each entity
   - What constraints exist (ordering, permissions, state)
   - What the transport layer looks like (REST, WebSocket, IPC, filesystem, etc.)
   - Include real protocol examples (request/response pairs, message formats)

2. **Action taxonomy** — List every "verb" the SDK must support (aim for 20–50 max). Classify each as:
   - **read** (list, get, query, export)
   - **write** (create, update, set, configure)
   - **destructive** (delete, reset, wipe)

3. **Dream scripts** — Write 3–5 example scripts that don't work yet but show how usage should *feel*. These are the target. The library gets built to make them real.

> **Tip:** The dream scripts are the single most important artifact. They define the API surface from the user's perspective. Everything else serves them.

### Phase 2: Choose Language & Runtime

Ask the user which language they prefer, or recommend based on their domain:

| Language | Runtime | Script execution | Best for |
|---|---|---|---|
| **TypeScript** | Bun | `bun run scripts/my-script.ts` | Rich type inference, best AI comprehension of types |
| **Python** | uv | `uv run scripts/my_script.py` | Rapid prototyping, data-heavy domains, inline deps via PEP 723 |

Both are excellent choices. TypeScript's type system gives the AI more to work with. Python's inline script metadata (PEP 723) means zero-config dependency management per script.

Load the appropriate templates:
- **TypeScript**: [📦 Templates](./templates/typescript/)
- **Python**: [📦 Templates](./templates/python/)

### Phase 3: Build the Library

Build in this order — each step depends on the previous:

#### 3.1 Types First

Define all domain types, enums, and interfaces/models. This is the foundation. Every type must have docstrings/JSDoc explaining not just *what* it is but *when and why* you'd encounter it.

Read: [📋 Design Principles](./reference/design-principles.md) for type design guidance.

#### 3.2 Connection Layer

Client creation, authentication, session management. This must be robust and completely hidden from scripts. The `connect()` call should work with zero arguments in the common case.

Priority order for configuration: explicit arguments > environment variables > config file > auto-discovery.

#### 3.3 Core Operations

One group at a time. Each operation:
- Takes typed parameters
- Returns a typed result (never void — the AI needs to know what comes back)
- Has a docstring with at least one `@example` / usage example
- Raises/throws typed, specific errors

#### 3.4 Composition Helpers

Batch operations, sequencing, preview/plan. These make scripts expressive:

```
# Python
plan = batch.set("light_1", brightness=20).set("tv", input="hdmi2").preview()
print(plan)        # shows what would change
plan.execute()     # does it

// TypeScript
const plan = batch.set("light_1", { brightness: 20 }).set("tv", { input: "hdmi2" }).preview();
console.log(plan);
await plan.execute();
```

#### 3.5 Validation & Safety

Every jig must support:
- **Schema validation** on inputs (before anything hits the underlying system)
- **Dry-run / preview mode** (compute what would happen, return a plan, don't execute)

Add for destructive operations:
- **Confirmation prompts** (interactive "are you sure?" before proceeding)

Read: [📋 Design Principles — Validation](./reference/design-principles.md#validation-strategy) for detailed options.

### Phase 4: Create the Script Infrastructure

#### 4.1 Script Template

Copy and adapt from the templates directory. Every script must support:
- `--dry-run` / `--preview` — show what would happen without doing it
- `--help` — explain what the script does
- Proper error handling with clear failure messages

Templates:
- [🐍 Python script template](./templates/python/script-template.py)
- [⚡ TypeScript script template](./templates/typescript/script-template.ts)

#### 4.2 Script Utilities

Small helpers scripts commonly need: confirmation prompts, table formatting, progress display. Keep these in a shared location (`scripts/_utils.py` or `scripts/_utils.ts`).

### Phase 5: Write the Documentation

Documentation quality directly determines how useful the jig is for AI agents. The AI reads your docs to understand what's available — if it can't find it, it can't use it.

Read: [📖 Documentation Guide](./reference/documentation-guide.md) for detailed guidance.

Produce these files:
1. **In-code docs** — Every public function/method has docstrings with `@example` tags
2. **GUIDE.md** — Narrative explanation of the mental model and common patterns
3. **API.md** — Generated or hand-written reference of all public exports
4. **EXAMPLES.md** — 5+ curated script examples covering common use cases
5. **CONCEPTS.md** — Domain concepts not obvious from the API (state machines, timing, event flows)

### Phase 6: Write the Agent Instructions

Create agent instruction files so that AI coding agents know how to work with the jig:

**CLAUDE.md** (for Claude Code):
```markdown
# Project: [Name]

## What This Is
A [language] library for [domain]. Scripts in `scripts/` use the library.

## When Writing Scripts
- Start from `scripts/_template.[ext]`
- Always include --dry-run support
- Import from the library, never access internals
- Read `docs/GUIDE.md` for usage patterns
- Read `docs/API.md` for available functions and types
- Check `scripts/examples/` for reference implementations

## When Modifying the Library
- All public functions must have docstrings with examples
- Run [build/typecheck command] after changes
- Keep the public API surface minimal
```

**AGENTS.md** (for other agents — opencode, Cursor, etc.):
Same content, agent-agnostic filename.

### Phase 7: Test the Loop

The acid test: open the project in an AI coding agent and ask it to write a script for a new task. If it succeeds without extra guidance, the jig is ready. If it struggles, the gap is almost always in documentation.

---

## Directory Structure

The final jig should look like this:

### TypeScript (Bun)
```
my-jig/
├── src/                        # The library
│   ├── index.ts                # Public API surface (re-exports)
│   ├── client.ts               # Connection / session management
│   ├── types.ts                # All domain types
│   ├── operations/             # Grouped domain operations
│   └── errors.ts               # Typed error classes
├── scripts/                    # AI writes scripts here
│   ├── _template.ts            # Script template
│   ├── _utils.ts               # Shared script utilities
│   └── examples/               # Reference scripts
├── docs/
│   ├── GUIDE.md
│   ├── API.md
│   ├── EXAMPLES.md
│   └── CONCEPTS.md
├── CLAUDE.md                   # Agent instructions
├── AGENTS.md                   # Agent instructions (generic)
├── DOMAIN.md                   # Domain description
├── package.json
├── tsconfig.json
└── bunfig.toml                 # (optional) Bun config
```

### Python (uv)
```
my-jig/
├── src/my_jig/                 # The library
│   ├── __init__.py             # Public API surface
│   ├── client.py               # Connection / session management
│   ├── types.py                # All domain types (dataclasses/Pydantic)
│   ├── operations/             # Grouped domain operations
│   └── errors.py               # Typed error classes
├── scripts/                    # AI writes scripts here
│   ├── _template.py            # Script template (PEP 723)
│   ├── _utils.py               # Shared script utilities
│   └── examples/               # Reference scripts
├── docs/
│   ├── GUIDE.md
│   ├── API.md
│   ├── EXAMPLES.md
│   └── CONCEPTS.md
├── CLAUDE.md
├── AGENTS.md
├── DOMAIN.md
├── pyproject.toml
└── uv.lock
```

---

## Anti-Patterns to Watch For

- **Business logic in scripts** — If a script has complex conditionals or transformations, that logic belongs in the library
- **Too-granular API** — If every script needs 15 imports and 30 lines of setup, the surface is too low-level
- **Undocumented magic** — If `connect()` reads from 3 config sources silently, document it explicitly
- **Mutable global state** — Scripts should create their own client instances
- **Skipping dry-run** — Implement it first, not later. It's the primary safety mechanism.
- **`any` / untyped returns** — The AI needs types to understand what comes back. Never `void`, never `any`.

---

## Quality Checklist

Run through [✅ Readiness Checklist](./reference/checklist.md) before declaring the jig ready.

---

## Agent Team Workflow (Optional)

For complex domains, the jig-building process can be parallelized using an agent team. This requires Claude Code with agent teams enabled (`CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1` in settings.json).

The jig-builder ships with four teammate agent definitions in [`agents/`](../agents/). Install them to `~/.claude/agents/` to make them available globally.

### The Team

| Agent | Role | Phases | Model |
|---|---|---|---|
| **You (lead)** | Orchestrate the build, work with the user on dream scripts, assign tasks | 1-2 | — |
| **domain-researcher** | Explore the target domain — APIs, protocols, existing code | 1 | Sonnet |
| **lib-builder** | Implement types, client, operations, validation, script infrastructure | 3-4 | Inherit |
| **doc-writer** | Write GUIDE.md, API.md, EXAMPLES.md, CONCEPTS.md, agent instructions | 5-6 | Sonnet |
| **script-tester** | Write scripts from docs only — the acid test | 7 | Sonnet |

### Dependency Graph

```
Phase 1: Domain Contract
├── Lead works with user on dream scripts
└── domain-researcher explores APIs/protocols in parallel
        │
        ▼
Phase 2: Language choice (lead, quick)
        │
        ├─────────────────────────────┐
        ▼                             ▼
Phase 3-4: Build Library         Phase 5a: Start docs
(lib-builder)                    (doc-writer: GUIDE.md, CONCEPTS.md
        │                         from DOMAIN.md alone)
        │                             │
        ▼                             ▼
lib-builder signals              Phase 5b: API.md, EXAMPLES.md
types/ops complete ──────────►   Phase 6: CLAUDE.md, AGENTS.md
                                      │
                                      ▼
                                 Phase 7: Acid test
                                 (script-tester writes scripts
                                  from docs only)
```

### When to Use the Team

Use the team when:
- The domain has 30+ operations or multiple subsystems
- The domain requires significant research (unfamiliar APIs, sparse docs)
- You want the acid test to be genuinely adversarial (the script-tester never sees source)

Use a single session when:
- The domain is small and well-understood
- The user wants to iterate interactively on each phase
- Token budget is a concern (teams use ~15x more tokens)

### Starting the Team

Tell the lead agent:
```
Build me a jig for [domain]. Use the jig-builder agent team.
```

Or be explicit about structure:
```
Build me a jig for [domain]. Create a team with domain-researcher,
lib-builder, doc-writer, and script-tester teammates.
```

The lead runs Phase 1 with the user (dream scripts are collaborative), then delegates Phases 3-7 to teammates with task dependencies.

### Key Design Decisions

- **The script-tester cannot read library source.** Its `disallowedTools` and system prompt enforce this. If it can write working scripts from docs alone, the jig passes. If it can't, the doc-writer fixes the docs — not the tester.
- **The doc-writer starts early.** GUIDE.md and CONCEPTS.md can be written from DOMAIN.md alone, before any library code exists. This parallelizes work that's traditionally sequential.
- **Each agent has persistent memory.** Across jig-building sessions, agents remember patterns — the lib-builder learns type design preferences, the doc-writer learns documentation structures that work well.
- **The lead stays in delegate mode.** The lead focuses on orchestration: decomposing work, managing task dependencies, synthesizing results. It doesn't write code.

---

## Reference Files

- [📋 Design Principles](./reference/design-principles.md) — Core design guidance, validation strategies, error handling
- [📖 Documentation Guide](./reference/documentation-guide.md) — How to write docs that AI agents can actually use
- [✅ Readiness Checklist](./reference/checklist.md) — Quality gates before the jig is "done"
- [🐍 Python Templates](./templates/python/) — Script template, pyproject.toml, lib skeleton
- [⚡ TypeScript Templates](./templates/typescript/) — Script template, package.json, lib skeleton
- [🐍 Python Example](./examples/python-minimal/) — Minimal working jig (Python)
- [⚡ TypeScript Example](./examples/typescript-minimal/) — Minimal working jig (TypeScript)
- [🤝 Agent Team Definitions](../agents/) — Teammate agents for parallel jig-building (Claude Code)
