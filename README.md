# jigs

A collection of AI-scriptable domain jigs and the tooling to build them.

A **jig** is a typed library where an AI coding agent writes short, validated scripts against a stable SDK. The human describes intent, the agent writes a script, the human reviews and runs it. Scripts are disposable; the library is durable.

```
User intent (natural language)
        |
        v
AI coding agent reads docs + types --> writes a script
        |
        v
Generated script (small, readable, --dry-run)
        |
        v
Domain library / SDK (handles connections, protocols, validation)
```

## Jigs

| Jig | Description | Language(s) |
|-----|-------------|-------------|
| [builder](builder/) | A meta-jig: teaches AI agents how to build new jigs for any domain | Generates Python or TypeScript |

More jigs will be added over time. Each lives in its own top-level directory with a self-contained README.

## What Makes a Good Jig

- **Typed SDK** that encapsulates domain complexity (connections, auth, protocols, retries)
- **Scripts that read like pseudocode** -- 10-30 lines, intent-level, no boilerplate
- **Dry-run by default** -- every script supports `--dry-run` / `--preview` before making real changes
- **Docs the AI can read** -- GUIDE.md, API.md, EXAMPLES.md, in-code docstrings with `@example` tags
- **Agent instructions** -- CLAUDE.md / AGENTS.md so any AI coding agent knows the conventions

See the [builder's design principles](builder/skill/reference/design-principles.md) for the full philosophy.

## Building a New Jig

The [builder](builder/) is itself a skill that AI coding agents can load. Install it, then tell your agent:

> "Build me a jig for [your domain]"

It walks through: domain contract, language choice, types, library, scripts, docs, agent instructions, and an acid test. See the [builder README](builder/README.md) for installation instructions across Claude Code, OpenCode, Cursor, Windsurf, and Codex.

## Repository Structure

```
jigs/
├── builder/          # Meta-jig: skill + agents for building new jigs
│   ├── skill/        # SKILL.md, templates, reference docs, examples
│   ├── agents/       # Claude Code teammate agents for parallel builds
│   └── README.md
├── <future-jig>/     # Each jig gets its own top-level directory
└── README.md         # You are here
```

## License

TBD
