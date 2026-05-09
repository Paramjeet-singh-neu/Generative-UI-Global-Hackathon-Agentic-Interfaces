"""CoachMe+ agent surface — boxing / technique analysis (TwelveLabs).

Part 5 mapping (CRM → CoachMe):
  - Notion MCP / import leads  →  TwelveLabs `analyze_clip` + Marengo search tools
  - Lead cards                  →  FormScoreCard (frontend — add in apps/frontend)
  - Follow-up notes             →  DrillCard
  - Pipeline chart              →  CorrectionMarker overlays

The starter compiles a LangGraph deep agent in `runtime.build_graph`. It does
not expose a hand-written `StateGraph` node; **backend tools registered here
replace the Notion tool pack** when `COACHME_SKIP_NOTION=1` in `apps/agent/.env`.

For manual CopilotKit intermediate state from a *custom* LangGraph node,
use `copilotkit.langgraph.copilotkit_emit_state` / `copilotkit_customize_config`
(see CopilotKit docs) — the default deep-agent path uses tools + structured
returns instead.
"""

from __future__ import annotations

import json
import os
from typing import Any, List

from langchain_core.tools import tool


@tool(response_format="content")
def analyze_boxing_clip(video_id: str) -> str:
    """Analyze an indexed TwelveLabs clip (Pegasus): technique scores, corrections, drills, timestamps.

    Replaces the old "Import leads from Notion" action with **Analyze clip**.
    Requires a TwelveLabs `video_id` for media already uploaded to your index.

    Returns JSON describing techniques[], drills[], timestamps[] plus any parse notes.
    """
    try:
        from .twelvelabs_client import analyze_clip

        data = analyze_clip(video_id.strip())
        return json.dumps({"ok": True, "video_id": video_id.strip(), "coaching_data": data}, indent=2)
    except Exception as exc:  # noqa: BLE001 — surface TwelveLabs/network errors to the model
        return json.dumps({"ok": False, "video_id": video_id.strip(), "error": str(exc)})


@tool(response_format="content")
def search_similar_techniques(technique_query: str) -> str:
    """Marengo visual similarity search over TWELVELABS_INDEX_ID (reference footage).

    Use short queries like '"leading jab"', '"guard height"', `"pivot rear foot"` — not full sentences unless needed.

    Returns JSON with matched clips (video_id, start/end, rank, thumbnails).
    """
    try:
        from .twelvelabs_client import get_similar_techniques

        rows = get_similar_techniques(technique_query)
        return json.dumps({"ok": True, "query": technique_query.strip(), "matches": rows}, indent=2)
    except Exception as exc:  # noqa: BLE001
        return json.dumps({"ok": False, "query": technique_query.strip(), "error": str(exc)})


def load_coaching_tools() -> List[Any]:
    """Tools wired into `build_graph(..., tools=...)` when running CoachMe+ mode."""

    tools: List[Any] = [analyze_boxing_clip, search_similar_techniques]
    print(
        "[coachme] Backend tools loaded: analyze_boxing_clip, search_similar_techniques "
        f"(TWELVELABS_INDEX_ID={'set' if os.getenv('TWELVELABS_INDEX_ID', '').strip() else 'missing'})",
        flush=True,
    )
    return tools
