"""CoachMe+ agent surface — boxing / technique analysis (TwelveLabs + MCP).

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
import subprocess
import sys
import time
from typing import Annotated, Any, Dict, List

_MCP_SERVER_SCRIPT = os.path.join(
    os.path.dirname(__file__), "..", "mcp_server", "boxing_coach_server.py"
)


def _call_boxing_mcp(
    tool_name: str,
    arguments: Dict[str, Any],
    *,
    timeout_s: float = 15.0,
) -> Any:
    """Invoke boxing_coach_server.py over stdio (initialize + tools/call)."""

    init = json.dumps(
        {"jsonrpc": "2.0", "id": 0, "method": "initialize", "params": {}}
    )
    call = json.dumps(
        {
            "jsonrpc": "2.0",
            "id": 1,
            "method": "tools/call",
            "params": {"name": tool_name, "arguments": arguments},
        }
    )
    proc = subprocess.run(
        [sys.executable, _MCP_SERVER_SCRIPT],
        input=init + "\n" + call + "\n",
        capture_output=True,
        text=True,
        timeout=timeout_s,
        check=False,
    )
    if proc.returncode != 0:
        raise RuntimeError(
            f"MCP subprocess failed ({proc.returncode}): "
            f"{proc.stderr.strip() or proc.stdout.strip()}"
        )
    lines = [ln.strip() for ln in proc.stdout.strip().split("\n") if ln.strip()]
    last_text: str | None = None
    for ln in lines:
        try:
            obj = json.loads(ln)
        except json.JSONDecodeError:
            continue
        if obj.get("error"):
            raise RuntimeError(str(obj["error"]))
        res = obj.get("result")
        if isinstance(res, dict):
            content = res.get("content")
            if isinstance(content, list):
                for block in content:
                    if isinstance(block, dict) and block.get("type") == "text":
                        t = block.get("text")
                        if isinstance(t, str):
                            last_text = t
    if last_text is None:
        raise RuntimeError(f"no MCP tool payload in stdout: {proc.stdout!r}")
    try:
        return json.loads(last_text)
    except json.JSONDecodeError:
        return last_text

from langchain_core.callbacks import dispatch_custom_event
from langchain_core.messages import HumanMessage, ToolMessage
from langchain_core.tools import InjectedToolCallId, tool
from langgraph.config import get_config
from langgraph.prebuilt import InjectedState
from langgraph.types import Command

_COACHING_CACHE_PATH = os.path.join(os.path.dirname(__file__), "coaching_cache.json")


def _coachme_use_cache() -> bool:
    return os.getenv("COACHME_USE_CACHE", "").strip().lower() in ("1", "true", "yes")


def coachme_use_mcp() -> bool:
    """When true, analysis + similarity prefer the bundled boxing MCP server.

    Defaults to **on** so CoachMe+ runs without TwelveLabs; set COACHME_USE_MCP=0
    to force Pegasus when TWELVELABS_API_KEY is configured.
    """

    return os.getenv("COACHME_USE_MCP", "1").strip().lower() in ("1", "true", "yes")


def _resolve_clip_description(video_id: str, state: Dict[str, Any]) -> str:
    """Map analyze_boxing_clip(video_id=…) into MCP clip_description / Pegasus context."""

    vid = (video_id or "").strip()
    low = vid.lower()
    if low in {"", "mcp", "demo", "local", "video", "clip", "analyze"}:
        vid = ""
    if vid:
        return vid

    for msg in reversed(state.get("messages") or []):
        if isinstance(msg, HumanMessage):
            c = msg.content
            if isinstance(c, str) and c.strip():
                return c.strip()
        if isinstance(msg, dict) and msg.get("role") == "user":
            c = msg.get("content", "")
            if isinstance(c, str) and c.strip():
                return c.strip()
    return "boxing technique analysis"


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


def _load_coaching_payload(video_id: str, state: Dict[str, Any]) -> Dict[str, Any]:
    """JSON cache, TwelveLabs Pegasus, or MCP analyze_boxing_clip_mcp."""

    if _coachme_use_cache() and os.path.isfile(_COACHING_CACHE_PATH):
        with open(_COACHING_CACHE_PATH, encoding="utf-8") as f:
            return copy.deepcopy(json.load(f))

    hint = _resolve_clip_description(video_id, state)
    tl_key = os.getenv("TWELVELABS_API_KEY", "").strip()
    try_twelve = bool(tl_key) and not coachme_use_mcp()
    vid = (video_id or "").strip()

    if try_twelve:
        try:
            from .twelvelabs_client import analyze_clip

            return analyze_clip(vid)
        except Exception as exc:  # noqa: BLE001
            print(f"[coachme] TwelveLabs analyze failed ({exc}); using boxing MCP.", flush=True)

    data = _call_boxing_mcp("analyze_boxing_clip_mcp", {"clip_description": hint})
    if not isinstance(data, dict):
        raise RuntimeError(f"MCP analyze returned non-object: {type(data).__name__}")
    if "overall_score" not in data:
        raise RuntimeError(f"MCP analyze missing overall_score: {data!r}")
    return data


@tool
def analyze_boxing_clip(
    video_id: str,
    state: Annotated[Dict[str, Any], InjectedState] = None,
    tool_call_id: Annotated[str, InjectedToolCallId] = "",
) -> Command:
    """Analyze boxing footage and fill `coaching_data` (same shape as `mock_coaching_data.json`).

    **TwelveLabs mode** (`COACHME_USE_MCP` unset / 0): pass the indexed **video_id**.
    **MCP demo mode** (`COACHME_USE_MCP=1`): pass a short clip label (e.g. ``jab drill``,
    ``guard work``) or use placeholders like ``mcp`` / ``demo`` to infer text from the
    latest user message.

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
        data = _load_coaching_payload(vid, st)

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
        return Command(
            update={
                "coaching_data": data,
                "coaching_status": "complete",
                "clips_analyzed": clips_count,
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
                            "If using TwelveLabs: check TWELVELABS_* and video_id. "
                            "If using MCP: set COACHME_USE_MCP=1 and retry."
                        ),
                        tool_call_id=tool_call_id,
                    )
                ],
            }
        )


@tool(response_format="content")
def search_similar_techniques(technique_query: str) -> str:
    """Visual similarity (TwelveLabs Marengo) **or** MCP drill library matches.

    Use short queries like ``leading jab``, ``guard height``. With ``COACHME_USE_MCP=1``
    (or no TwelveLabs key), results come from the local MCP drill catalog instead of Marengo.
    """
    q = technique_query.strip()
    try:
        if coachme_use_mcp() or not os.getenv("TWELVELABS_API_KEY", "").strip():
            args: Dict[str, Any] = {}
            if q:
                args["technique"] = q
            rows = _call_boxing_mcp("lookup_boxing_drills", args)
            return json.dumps(
                {"ok": True, "source": "boxing_mcp", "query": q, "matches": rows},
                indent=2,
            )
        from .twelvelabs_client import get_similar_techniques

        rows = get_similar_techniques(q)
        return json.dumps({"ok": True, "query": q, "matches": rows}, indent=2)
    except Exception as exc:  # noqa: BLE001
        return json.dumps({"ok": False, "query": q, "error": str(exc)})


@tool(response_format="content")
def lookup_coaching_drills(
    technique: str = "",
    difficulty: str = "",
) -> str:
    """Filter the MCP boxing drill library by technique and/or difficulty."""

    try:
        args: Dict[str, Any] = {}
        t = technique.strip()
        d = difficulty.strip().lower()
        if t:
            args["technique"] = t
        if d in ("beginner", "intermediate", "advanced"):
            args["difficulty"] = d
        rows = _call_boxing_mcp("lookup_boxing_drills", args)
        return json.dumps({"ok": True, "drills": rows}, indent=2)
    except Exception as exc:  # noqa: BLE001
        return json.dumps({"ok": False, "error": str(exc)})


@tool(response_format="content")
def get_coaching_drill_details(name: str) -> str:
    """Full drill record from the MCP library (description, difficulty, targets)."""

    try:
        raw = _call_boxing_mcp("get_drill_details", {"name": name.strip()})
        if isinstance(raw, dict):
            return json.dumps(raw, indent=2)
        return raw if isinstance(raw, str) else json.dumps(raw, indent=2)
    except Exception as exc:  # noqa: BLE001
        return json.dumps({"ok": False, "error": str(exc)})


def load_coaching_tools() -> List[Any]:
    """Tools wired into `build_graph(..., tools=...)` when running CoachMe+ mode."""

    tools: List[Any] = [
        analyze_boxing_clip,
        search_similar_techniques,
        lookup_coaching_drills,
        get_coaching_drill_details,
    ]
    mode = "mcp" if coachme_use_mcp() else "twelvelabs"
    print(
        "[coachme] Backend tools loaded: analyze_boxing_clip, search_similar_techniques, "
        "lookup_coaching_drills, get_coaching_drill_details "
        f"(mode={mode}, TWELVELABS_INDEX_ID="
        f"{'set' if os.getenv('TWELVELABS_INDEX_ID', '').strip() else 'missing'})",
        flush=True,
    )
    return tools
