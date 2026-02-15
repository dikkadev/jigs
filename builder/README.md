# Jig Builder

A skill that teaches AI coding agents how to build domain-specific, AI-scriptable jigs — typed libraries where an agent writes short, validated scripts against a stable SDK.

This is itself a skill that follows the pattern it teaches. Recursion intended.

## What This Does

You describe a domain ("home automation," "flight sim control," "CI/CD pipelines"). Your AI coding agent reads this skill, then builds a complete jig for that domain: typed library, script templates, documentation, agent instructions, and example scripts. The resulting jig is then usable by the same (or another) agent to write automation scripts against.

## Structure

```
jig-builder/
├── skill/
│   ├── SKILL.md                      # Entry point — agent reads this first
│   ├── reference/
│   │   ├── design-principles.md      # Types, validation, errors, idempotency
│   │   ├── documentation-guide.md    # Writing docs AI agents can use
│   │   └── checklist.md              # Quality gates
│   ├── templates/
│   │   ├── python/                   # PEP 723 script template, pyproject, lib skeleton
│   │   └── typescript/               # Bun script template, package.json, lib skeleton
│   └── examples/
│       ├── python-minimal/           # What a finished Python jig looks like
│       └── typescript-minimal/       # What a finished TS jig looks like
├── agents/                           # Claude Code teammate agents (optional)
│   ├── domain-researcher.md          # Explores target domain APIs and protocols
│   ├── lib-builder.md                # Implements the typed library
│   ├── doc-writer.md                 # Writes AI-readable documentation
│   └── script-tester.md              # Acid test — writes scripts from docs only
└── README.md                         # You are here
```

## Installation

Place this directory where your AI coding agent discovers skills. The paths differ per tool — pick yours below.

### Claude Code

Claude Code looks for skills in `~/.claude/skills/` (global) or `.claude/skills/` (per-project).

```bash
# Global — available in all projects
ln -s /path/to/jig-builder ~/.claude/skills/jig-builder

# Per-project — available only in this repo
mkdir -p .claude/skills
ln -s /path/to/jig-builder .claude/skills/jig-builder
```

Claude Code auto-discovers `SKILL.md` files in these directories. The skill appears as a tool the agent can load on demand.

#### Agent teammates (optional)

For complex domains, the jig-builder can use an agent team — multiple Claude Code instances working in parallel on different phases. To install the teammate agents:

```bash
# Copy agent definitions to your global agents directory
for f in /path/to/jig-builder/agents/*.md; do
  cp "$f" ~/.claude/agents/
done
```

Then enable agent teams in your Claude Code settings:

```json
{
  "env": {
    "CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS": "1"
  }
}
```

The agents are: **domain-researcher** (explores APIs/protocols), **lib-builder** (implements the library), **doc-writer** (writes documentation), and **script-tester** (acid test from docs only). See the [Agent Team Workflow](skill/SKILL.md#agent-team-workflow-optional) section in SKILL.md for details.

You can also reference the skill from your `CLAUDE.md`:
```markdown
See @.claude/skills/jig-builder/SKILL.md for building domain jigs.
```

### OpenCode

OpenCode searches multiple skill locations with Claude Code fallback support:

```bash
# Global — OpenCode native path
ln -s /path/to/jig-builder ~/.config/opencode/skills/jig-builder

# Global — Claude-compatible path (also works)
ln -s /path/to/jig-builder ~/.claude/skills/jig-builder

# Per-project — OpenCode native
mkdir -p .opencode/skills
ln -s /path/to/jig-builder .opencode/skills/jig-builder

# Per-project — Claude-compatible (also works)
mkdir -p .claude/skills
ln -s /path/to/jig-builder .claude/skills/jig-builder

# Per-project — AGENTS.md compatible
mkdir -p .agents/skills
ln -s /path/to/jig-builder .agents/skills/jig-builder
```

OpenCode discovers skills via `skills/*/SKILL.md` in any of the above directories. The agent sees available skills and can load them on demand.

You can also add it as an instruction source in `opencode.json`:
```json
{
  "instructions": [
    "skills/jig-builder/SKILL.md"
  ]
}
```

### Cursor

Cursor uses `.cursor/rules/` with `.mdc` files, not a skill system. The easiest approach is to create a rule that points at the skill:

```bash
# Symlink the skill into your project
ln -s /path/to/jig-builder .cursor/jig-builder
```

Then create `.cursor/rules/jig-builder.mdc`:
```
---
description: Building AI-scriptable domain jigs
globs: []
alwaysApply: false
---

When building a domain jig or SDK for AI-assisted scripting,
read and follow the instructions in @.cursor/jig-builder/SKILL.md
```

This makes the skill available as context when relevant, without always loading it.

### Windsurf

Windsurf reads `.windsurfrules` (project root) or global rules. Similar to Cursor — symlink the directory and reference from rules:

```bash
ln -s /path/to/jig-builder .windsurf/jig-builder
```

### Codex (OpenAI)

Codex reads `AGENTS.md` files. Symlink into the project and reference from your `AGENTS.md`:

```bash
ln -s /path/to/jig-builder agents/skills/jig-builder
```

In your `AGENTS.md`:
```markdown
## Skills
When building domain jigs, read `agents/skills/jig-builder/SKILL.md`.
```

### Any Other Agent

If your agent reads markdown files, just point it at `SKILL.md`. The skill is plain markdown with relative references to other files in the directory — no special runtime required.

## Quick Reference: All Paths

| Agent | Global Skills Path | Project Skills Path |
|---|---|---|
| **Claude Code** | `~/.claude/skills/<name>/SKILL.md` | `.claude/skills/<name>/SKILL.md` |
| **OpenCode** | `~/.config/opencode/skills/<name>/SKILL.md` | `.opencode/skills/<name>/SKILL.md` |
| **OpenCode** (compat) | `~/.claude/skills/<name>/SKILL.md` | `.agents/skills/<name>/SKILL.md` |
| **Cursor** | Cursor Settings > Rules for AI | `.cursor/rules/*.mdc` |
| **Codex** | `~/.codex/AGENTS.md` | `AGENTS.md` + referenced files |
| **Windsurf** | Global rules in settings | `.windsurfrules` + referenced files |

## Usage

Once installed, tell your agent:

> "Build me a jig for [your domain]"

The agent loads `SKILL.md` and walks through: domain contract → language choice → types → library → scripts → docs → agent instructions → acid test.

### Example Prompts

- "Build a Python jig for controlling Home Assistant via its REST API"
- "Create a TypeScript SDK for managing GitHub Actions workflows that Claude Code can script against"
- "I want to automate DCS World mission editing — build me a scriptable jig"

### With an Agent Team (Claude Code only)

For complex domains, use the agent team to parallelize the build:

> "Build me a jig for [your domain]. Use the jig-builder agent team."

The lead orchestrates: domain-researcher explores the API, lib-builder implements the library, doc-writer writes documentation, and script-tester validates the jig by writing scripts from docs alone. See SKILL.md for the full dependency graph.

## Requirements

For jigs the skill produces:

- **Python path**: [uv](https://docs.astral.sh/uv/) for project management and `uv run` for script execution
- **TypeScript path**: [Bun](https://bun.sh/) for runtime and `bun run` for script execution

The skill itself has no dependencies — it's just markdown and template files.
