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
from typing import Annotated, Any, List

from langchain_core.messages import ToolMessage
from langchain_core.tools import InjectedToolCallId, tool
from langgraph.types import Command


@tool
def analyze_boxing_clip(
    video_id: str,
    tool_call_id: Annotated[str, InjectedToolCallId] = "",
) -> Command:
    """Analyze an indexed TwelveLabs clip (Pegasus): coaching payload aligned with `mock_coaching_data.json`.

    Replaces the old "Import leads from Notion" action with **Analyze clip**.
    Requires a TwelveLabs `video_id` for media already uploaded to your index.

    Writes `coaching_data` + `coaching_status` on agent state (same pattern as
    `fetch_notion_leads`) so CopilotKit v2 `useAgent` / STATE_SNAPSHOT updates
    the CoachMe+ canvas without a frontend tool parsing this tool's output.

    On success: `coaching_status` is ``complete``. On failure: ``error`` and
    `coaching_data` is cleared.
    """
    vid = video_id.strip()
    try:
        from .twelvelabs_client import analyze_clip

        data = analyze_clip(vid)
        n_t = len(data.get("techniques") or [])
        n_d = len(data.get("drills") or [])
        score = data.get("overall_score", "?")
        summary = (
            f"Analysis complete for video_id={vid!r}. "
            f"Overall score: {score}/100. "
            f"{n_t} technique(s), {n_d} drill(s). "
            "The coaching canvas is updated — summarize for the athlete."
        )
        return Command(
            update={
                "coaching_data": data,
                "coaching_status": "complete",
                "messages": [ToolMessage(content=summary, tool_call_id=tool_call_id)],
            }
        )
    except Exception as exc:  # noqa: BLE001 — surface TwelveLabs/network errors to the model
        err = str(exc)
        return Command(
            update={
                "coaching_data": None,
                "coaching_status": "error",
                "messages": [
                    ToolMessage(
                        content=(
                            f"analyze_boxing_clip failed for video_id={vid!r}: {err}. "
                            "Check TWELVELABS_API_KEY, indexing, and video_id."
                        ),
                        tool_call_id=tool_call_id,
                    )
                ],
            }
        )


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
