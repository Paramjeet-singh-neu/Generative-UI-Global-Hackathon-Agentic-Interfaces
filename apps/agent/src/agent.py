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

import copy
import json
import os
import time
from typing import Annotated, Any, Dict, List

from langchain_core.callbacks import dispatch_custom_event
from langchain_core.messages import ToolMessage
from langchain_core.tools import InjectedToolCallId, tool
from langgraph.config import get_config
from langgraph.prebuilt import InjectedState
from langgraph.types import Command

from .coachme_score_history import merge_coaching_score_history

_COACHING_CACHE_PATH = os.path.join(os.path.dirname(__file__), "coaching_cache.json")


def _coachme_use_cache() -> bool:
    return os.getenv("COACHME_USE_CACHE", "").strip().lower() in ("1", "true", "yes")


def _emit_coaching_analyzing() -> None:
    """Push intermediate AG-UI state so the frontend can show `coaching_status === analyzing`."""

    try:
        cfg = get_config()
    except RuntimeError:
        return
    try:
        dispatch_custom_event(
            "copilotkit_manually_emit_intermediate_state",
            {"coaching_status": "analyzing", "coaching_data": None},
            config=cfg,
        )
        time.sleep(0.04)
    except RuntimeError:
        # No parent run / callback context (e.g. unit tests) — safe to skip.
        pass


def _load_coaching_payload(video_id: str) -> Dict[str, Any]:
    """Live Pegasus analysis, or a JSON cache when COACHME_USE_CACHE=1."""

    if _coachme_use_cache() and os.path.isfile(_COACHING_CACHE_PATH):
        with open(_COACHING_CACHE_PATH, encoding="utf-8") as f:
            return copy.deepcopy(json.load(f))
    from .twelvelabs_client import analyze_clip

    return analyze_clip(video_id.strip())


@tool
def analyze_boxing_clip(
    video_id: str,
    state: Annotated[Dict[str, Any], InjectedState] = None,
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
    st: Dict[str, Any] = state if isinstance(state, dict) else {}
    try:
        _emit_coaching_analyzing()
        data = _load_coaching_payload(vid)

        skipped_raw = st.get("skipped_drills") or []
        skipped: List[str] = [
            str(x) for x in skipped_raw if isinstance(x, str) and x.strip()
        ]
        drills_raw = data.get("drills") or []
        if isinstance(drills_raw, list):
            data["drills"] = [
                d
                for d in drills_raw
                if isinstance(d, dict)
                and str(d.get("name") or "").strip() not in skipped
            ]
        else:
            data["drills"] = []

        n_t = len(data.get("techniques") or [])
        n_d = len(data.get("drills") or [])
        score = data.get("overall_score", "?")
        summary = (
            f"Analysis complete for video_id={vid!r}. "
            f"Overall score: {score}/100. "
            f"{n_t} technique(s), {n_d} drill(s) after skipping {len(skipped)} session drill(s). "
            "Canvas updated — brief the athlete, then call highlightTechnique for the weakest technique."
        )
        prev_raw = st.get("clips_analyzed")
        try:
            prev_n = int(prev_raw) if prev_raw is not None else 0
        except (TypeError, ValueError):
            prev_n = 0
        clips_count = prev_n + 1
        score_hist = merge_coaching_score_history(
            st.get("coaching_score_history"),
            data.get("overall_score"),
        )
        return Command(
            update={
                "coaching_data": data,
                "coaching_status": "complete",
                "clips_analyzed": clips_count,
                "coaching_score_history": score_hist,
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
