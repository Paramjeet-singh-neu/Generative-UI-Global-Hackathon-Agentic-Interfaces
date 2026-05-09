#!/usr/bin/env python3
"""Upload the bundled demo boxing clip to TwelveLabs and print its video_id.

Uses `demo video/Dup_good_jab.mp4` by default. Requires in apps/agent/.env:

  TWELVELABS_API_KEY=...
  TWELVELABS_INDEX_ID=...   # Marengo/Pegasus-capable index

Run from repo root:

  npm run coachme:upload-demo

Then in CoachMe+ (/coach), ask the coach to run analyze_boxing_clip with the printed video_id.
"""

from __future__ import annotations

import argparse
import os
import sys
from pathlib import Path

_REPO_ROOT = Path(__file__).resolve().parents[1]
_DEFAULT_VIDEO = _REPO_ROOT / "demo video" / "Dup_good_jab.mp4"


def _load_env() -> None:
    from dotenv import load_dotenv

    load_dotenv(_REPO_ROOT / "apps" / "agent" / ".env")
    load_dotenv(_REPO_ROOT / ".env")


def main() -> int:
    _load_env()

    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "video_path",
        type=Path,
        nargs="?",
        default=_DEFAULT_VIDEO,
        help=f"path to mp4 (default: {_DEFAULT_VIDEO})",
    )
    args = parser.parse_args()
    video_path: Path = args.video_path.expanduser().resolve()

    if not video_path.is_file():
        print(f"Video not found: {video_path}", file=sys.stderr)
        return 1

    api_key = (os.getenv("TWELVELABS_API_KEY") or "").strip()
    index_id = (os.getenv("TWELVELABS_INDEX_ID") or "").strip()
    if not api_key:
        print("Set TWELVELABS_API_KEY in apps/agent/.env", file=sys.stderr)
        return 1
    if not index_id:
        print(
            "Set TWELVELABS_INDEX_ID in apps/agent/.env (run: npm run verify:twelvelabs)",
            file=sys.stderr,
        )
        return 1

    from twelvelabs import TwelveLabs

    client = TwelveLabs(api_key=api_key)
    raw = video_path.read_bytes()
    print(f"Uploading {video_path.name} ({len(raw) / 1e6:.2f} MB) to index {index_id}…")

    task = client.tasks.create(
        index_id=index_id,
        video_file=(video_path.name, raw),
    )
    task_id = task.id
    if not task_id:
        print("No task id returned from TwelveLabs.", file=sys.stderr)
        return 1

    print(f"Task id: {task_id} (waiting for indexing…)")

    done = client.tasks.wait_for_done(task_id=task_id, sleep_interval=4.0)
    if (done.status or "").lower() == "failed":
        print(f"Indexing failed: status={done.status!r}", file=sys.stderr)
        return 1

    vid = (done.video_id or "").strip()
    if not vid:
        print("No video_id on completed task.", file=sys.stderr)
        return 1

    print()
    print("─" * 56)
    print(f"  VIDEO_ID={vid}")
    print("─" * 56)
    print()
    print("Next: open http://localhost:3010/coach and ask e.g.")
    print(f'  "Run analyze_boxing_clip with video_id {vid}"')
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
