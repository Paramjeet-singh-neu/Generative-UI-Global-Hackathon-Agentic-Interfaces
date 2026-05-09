#!/usr/bin/env python3
"""List TwelveLabs indexes (prints id + name).

Uses the official SDK (`indexes.list`). Part 3.3 sanity check — once
`TWELVELABS_API_KEY` is set in `apps/agent/.env`, run from repo root:

  npm run verify:twelvelabs

Or:

  uv run --project apps/agent python scripts/verify_twelvelabs_indexes.py
"""

from __future__ import annotations

import os
import sys
from pathlib import Path

_REPO_ROOT = Path(__file__).resolve().parents[1]


def _load_env() -> None:
    from dotenv import load_dotenv

    load_dotenv(_REPO_ROOT / "apps" / "agent" / ".env")
    load_dotenv(_REPO_ROOT / ".env")


def main() -> int:
    _load_env()

    api_key = (os.getenv("TWELVELABS_API_KEY") or "").strip()
    if not api_key or api_key == "your_twelvelabs_key_here":
        print(
            "Set TWELVELABS_API_KEY in apps/agent/.env (replace the placeholder).\n",
            "Create keys: https://api.twelvelabs.io → Dashboard → API Keys",
            file=sys.stderr,
            sep="",
        )
        return 1

    try:
        from twelvelabs import TwelveLabs
    except ImportError:
        print(
            "Missing SDK. Run:\n"
            "  npm run verify:twelvelabs\n"
            "or:\n"
            "  uv run --project apps/agent python scripts/verify_twelvelabs_indexes.py",
            file=sys.stderr,
        )
        return 1

    client = TwelveLabs(api_key=api_key)
    response = client.indexes.list(page_limit=50, sort_option="desc")
    n = 0
    for item in response:
        name = getattr(item, "name", "") or getattr(item, "index_name", "")
        idx_id = getattr(item, "id", None) or getattr(item, "index_id", "")
        print(idx_id, name)
        n += 1

    if n == 0:
        print(
            "(no indexes on first page — create one in the TwelveLabs dashboard "
            "or index your boxing footage, then rerun)",
            file=sys.stderr,
        )
    else:
        print(
            "\nCopy the Marengo-backed index **id** you need into TWELVELABS_INDEX_ID "
            "in apps/agent/.env when your app expects it.",
            file=sys.stderr,
        )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
