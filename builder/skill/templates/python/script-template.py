# /// script
# requires-python = ">=3.12"
# dependencies = [
#     "my-jig",
# ]
# [tool.uv]
# sources = [
#     { path = ".." },
# ]
# ///
"""
Script: [DESCRIPTION]
Created: [DATE]

Usage:
    uv run scripts/this_script.py                # Run normally
    uv run scripts/this_script.py --dry-run      # Preview only
    uv run scripts/this_script.py --help          # Show help
"""
from __future__ import annotations

import argparse
import sys


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="[DESCRIPTION]")
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Preview changes without applying them",
    )
    # Add script-specific arguments here
    return parser.parse_args()


async def main() -> None:
    args = parse_args()

    # Import here so --help works without dependencies
    from my_jig import connect

    client = await connect()

    # ── Script logic here ──────────────────────────────────

    if args.dry_run:
        print("DRY RUN — no changes applied.")
        # print("Plan:", plan)
        return

    # ── Execute ────────────────────────────────────────────


if __name__ == "__main__":
    import asyncio

    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        sys.exit(130)
    except Exception as err:
        print(f"Script failed: {err}", file=sys.stderr)
        sys.exit(1)
