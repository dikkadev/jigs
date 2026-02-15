# Python Example: REST API Wrapper Jig

This shows what a completed jig looks like for a hypothetical
JSON REST API (e.g., a task management system).

## Dream Scripts (what usage looks like)

### List all tasks
```python
# /// script
# requires-python = ">=3.12"
# dependencies = ["task-jig"]
# ///
"""List all open tasks, grouped by assignee."""

import asyncio
from task_jig import connect

async def main():
    client = await connect()
    tasks = await client.tasks.list(status="open")

    by_assignee: dict[str, list] = {}
    for t in tasks:
        by_assignee.setdefault(t.assignee, []).append(t)

    for assignee, items in sorted(by_assignee.items()):
        print(f"\n{assignee} ({len(items)} tasks):")
        for t in items:
            print(f"  [{t.priority.value}] {t.title}")

asyncio.run(main())
```

### Bulk reassign with dry-run
```python
# /// script
# requires-python = ">=3.12"
# dependencies = ["task-jig"]
# ///
"""Reassign all tasks from one person to another."""

import argparse
import asyncio
from task_jig import connect

def parse_args():
    p = argparse.ArgumentParser()
    p.add_argument("--from", dest="from_user", required=True)
    p.add_argument("--to", dest="to_user", required=True)
    p.add_argument("--dry-run", action="store_true")
    return p.parse_args()

async def main():
    args = parse_args()
    client = await connect()

    tasks = await client.tasks.list(assignee=args.from_user)
    print(f"Found {len(tasks)} tasks assigned to {args.from_user}")

    plan = client.batch()
    for t in tasks:
        plan.update_task(t.id, assignee=args.to_user)

    preview = await plan.preview()
    for change in preview.changes:
        print(f"  {change.task_id}: {change.field} {change.old} → {change.new}")

    if args.dry_run:
        print("\nDRY RUN — no changes applied.")
        return

    result = await plan.execute()
    print(f"\nReassigned {result.succeeded} tasks ({result.failed} failed)")

asyncio.run(main())
```

## Corresponding Library Structure

```
task-jig/
├── src/task_jig/
│   ├── __init__.py          # Exports: connect, Client, Task, TaskStatus, etc.
│   ├── client.py            # connect(), Client class
│   ├── types.py             # Task, TaskStatus, Priority, CreateTaskInput, etc.
│   ├── errors.py            # TaskNotFoundError, PermissionError, etc.
│   └── operations/
│       ├── tasks.py         # TaskOperations (list, get, create, update, delete)
│       └── batch.py         # BatchBuilder with .preview() and .execute()
├── scripts/
│   ├── _template.py
│   └── examples/
│       ├── list_tasks.py
│       └── bulk_reassign.py
├── docs/
│   ├── GUIDE.md
│   ├── API.md
│   ├── EXAMPLES.md
│   └── CONCEPTS.md
├── CLAUDE.md
├── DOMAIN.md
├── pyproject.toml
└── uv.lock
```

## Key Observations

1. **Scripts are ~30 lines** — all complexity is in the library
2. **PEP 723 metadata** — `uv run script.py` handles deps automatically
3. **Batch operations** have `.preview()` before `.execute()`
4. **--dry-run is standard** — every write script supports it
5. **Types drive discoverability** — `t.priority.value`, `t.assignee` are typed
