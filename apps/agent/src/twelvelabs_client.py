"""TwelveLabs Marengo search + Pegasus video analysis — CoachMe+ backend.

Uses the official `twelvelabs` SDK (sync APIs). Requires:
  - TWELVELABS_API_KEY
  - TWELVELABS_INDEX_ID (for Marengo search only)

Pegasus `analyze()` returns JSON-shaped text when requested; we parse safely
into a structured dict for the LangGraph tools layer.
"""

from __future__ import annotations

import json
import logging
import os
import re
import uuid
from functools import lru_cache
from typing import Any

from twelvelabs import TwelveLabs

logger = logging.getLogger(__name__)

PEGASUS_MODEL_LATEST = "pegasus1.5"

_SEVERITY_ALLOWED = frozenset({"high", "medium", "low"})

_ANALYSIS_JSON_GUIDE = """You are an expert boxing coach analyzing this video.

Respond with VALID JSON ONLY (no markdown fences), using exactly this schema:
{
  "clip_name": "string (short snake_case label for this clip, e.g. boxing_jab_drill)",
  "overall_score": number,
  "techniques": [
    {"name": "string", "score": number, "correction": "string"}
  ],
  "drills": [
    {"name": "string", "reps": number, "focus": "string"}
  ],
  "timestamps": [
    {"time": number, "label": "string", "severity": "high" | "medium" | "low"}
  ]
}

Rules:
- overall_score: single 0-100 summary of form quality for this clip (holistic, not only the mean of technique scores).
- techniques: observe jab, cross, hook, guard, footwork when visible; scores 0-100 per technique present.
- Each technique needs exactly one concise correction line.
- drills: recommended drills keyed to corrections; reps must be a positive integer (number, not a string).
- timestamps: use "time" as seconds into the clip (float allowed); label briefly describes the issue; severity reflects impact (high = major breakdown, medium = noticeable, low = minor).
"""


@lru_cache(maxsize=1)
def _client() -> TwelveLabs:
    key = os.getenv("TWELVELABS_API_KEY", "").strip()
    if not key:
        raise RuntimeError(
            "TWELVELABS_API_KEY is unset. Paste your key in apps/agent/.env.",
        )
    return TwelveLabs(api_key=key)


def _json_from_analyze_payload(raw: str | None) -> dict[str, Any]:
    """Parse Pegasus analyze `data`; tolerate markdown fences."""

    if not raw or not str(raw).strip():
        raise ValueError("Empty analyze response — check video_id and TwelveLabs indexing.")

    txt = raw.strip()

    fenced = re.search(r"```(?:json)?\s*(\{[\s\S]*\})\s*```", txt, re.IGNORECASE)
    candidate = fenced.group(1) if fenced else txt

    decoder = json.JSONDecoder()
    try:
        parsed, _ = decoder.raw_decode(candidate.strip())
        if isinstance(parsed, dict):
            return parsed
    except json.JSONDecodeError:
        brace = txt.find("{")
        if brace != -1:
            try:
                parsed2, _ = decoder.raw_decode(txt[brace:])
                if isinstance(parsed2, dict):
                    return parsed2
            except json.JSONDecodeError:
                pass

    logger.warning("[twelvelabs] Falling back to raw text wrapping (JSON parse failed).")
    return {
        "raw_text": txt,
        "clip_name": "",
        "overall_score": 0,
        "techniques": [],
        "drills": [],
        "timestamps": [],
    }


def _clamp_int_score(value: Any, *, default: int = 0) -> int:
    try:
        n = int(round(float(value)))
    except (TypeError, ValueError):
        return default
    return max(0, min(100, n))


def _parse_reps(value: Any) -> int:
    if value is None:
        return 0
    if isinstance(value, bool):
        return int(value)
    if isinstance(value, int):
        return max(0, value)
    if isinstance(value, float):
        return max(0, int(round(value)))
    s = str(value).strip()
    m = re.search(r"-?\d+", s)
    if not m:
        return 0
    return max(0, int(m.group(0)))


def _normalize_timestamp(entry: Any) -> dict[str, Any] | None:
    if not isinstance(entry, dict):
        return None
    raw_time = entry.get("time")
    if raw_time is None and "t" in entry:
        raw_time = entry.get("t")
    try:
        t = float(raw_time)
    except (TypeError, ValueError):
        return None
    label = entry.get("label")
    if not isinstance(label, str) or not label.strip():
        label = "Form note"
    sev = entry.get("severity", "medium")
    if not isinstance(sev, str) or sev.lower() not in _SEVERITY_ALLOWED:
        sev = "medium"
    else:
        sev = sev.lower()
    return {"time": round(t, 2), "label": label.strip(), "severity": sev}


def _normalize_drill(entry: Any) -> dict[str, Any] | None:
    if not isinstance(entry, dict):
        return None
    name = entry.get("name")
    if not isinstance(name, str) or not name.strip():
        return None
    focus = entry.get("focus")
    if not isinstance(focus, str):
        focus = str(focus) if focus is not None else ""
    reps = _parse_reps(entry.get("reps"))
    if reps <= 0:
        reps = 10
    return {"name": name.strip(), "reps": reps, "focus": focus.strip() or "Technique"}


def _normalize_technique(entry: Any) -> dict[str, Any] | None:
    if not isinstance(entry, dict):
        return None
    name = entry.get("name")
    if not isinstance(name, str) or not name.strip():
        return None
    correction = entry.get("correction")
    if not isinstance(correction, str):
        correction = str(correction) if correction is not None else ""
    score = _clamp_int_score(entry.get("score"), default=50)
    return {
        "name": name.strip(),
        "score": score,
        "correction": correction.strip() or "Keep working this area.",
    }


def _normalize_coaching_dict(data: dict[str, Any], video_id: str) -> dict[str, Any]:
    """Match frontend / mock_coaching_data.json contract."""

    techniques_raw = data.get("techniques")
    if not isinstance(techniques_raw, list):
        techniques_raw = []
    techniques = []
    for item in techniques_raw:
        row = _normalize_technique(item)
        if row:
            techniques.append(row)

    drills_raw = data.get("drills")
    if not isinstance(drills_raw, list):
        drills_raw = []
    drills: list[dict[str, Any]] = []
    for item in drills_raw:
        row = _normalize_drill(item)
        if row:
            drills.append(row)

    ts_raw = data.get("timestamps")
    if not isinstance(ts_raw, list):
        ts_raw = []
    timestamps: list[dict[str, Any]] = []
    for item in ts_raw:
        row = _normalize_timestamp(item)
        if row:
            timestamps.append(row)

    overall = data.get("overall_score")
    try:
        overall_score = int(round(float(overall)))
        overall_score = max(0, min(100, overall_score))
    except (TypeError, ValueError):
        if techniques:
            overall_score = int(
                round(sum(t["score"] for t in techniques) / len(techniques))
            )
        else:
            overall_score = 0

    clip = data.get("clip_name")
    if isinstance(clip, str) and clip.strip():
        clip_name = re.sub(r"\s+", "_", clip.strip().lower())
        clip_name = re.sub(r"[^a-z0-9_]+", "", clip_name).strip("_") or "boxing_clip"
    else:
        clip_name = f"clip_{video_id[:10]}" if video_id else "boxing_clip"

    out: dict[str, Any] = {
        "session_id": str(uuid.uuid4()),
        "clip_name": clip_name,
        "overall_score": overall_score,
        "techniques": techniques,
        "timestamps": timestamps,
        "drills": drills,
    }
    if "raw_text" in data:
        out["raw_text"] = data["raw_text"]
    return out


def _video_duration_seconds(video_id: str) -> float | None:
    """Best-effort duration from index metadata (needs TWELVELABS_INDEX_ID)."""

    index_id = os.getenv("TWELVELABS_INDEX_ID", "").strip()
    vid = video_id.strip()
    if not index_id or not vid:
        return None
    try:
        meta = _client().indexes.videos.retrieve(index_id=index_id, video_id=vid)
    except Exception:
        logger.debug("[twelvelabs] Could not retrieve video metadata for duration.", exc_info=True)
        return None
    sm = getattr(meta, "system_metadata", None)
    if sm is None:
        return None
    dur = getattr(sm, "duration", None)
    try:
        d = float(dur)
    except (TypeError, ValueError):
        return None
    if d <= 0:
        return None
    return d


def analyze_clip(video_id: str) -> dict[str, Any]:
    """Run Pegasus prompt-based coaching analysis for an indexed TwelveLabs video."""

    vid = video_id.strip()
    if not vid:
        raise ValueError("video_id is required.")

    resp = _client().analyze(
        video_id=vid,
        prompt=_ANALYSIS_JSON_GUIDE,
        model_name=PEGASUS_MODEL_LATEST,
        temperature=0.2,
    )
    structured = _json_from_analyze_payload(resp.data)
    structured.setdefault("techniques", [])
    structured.setdefault("drills", [])
    structured.setdefault("timestamps", [])
    out = _normalize_coaching_dict(structured, vid)
    dur = _video_duration_seconds(vid)
    if dur is not None:
        out["video_duration"] = round(min(3600.0, max(1.0, dur)), 2)
    return out


def get_similar_techniques(technique_query: str) -> list[dict[str, Any]]:
    """Marengo visual similarity search scoped to TWELVELABS_INDEX_ID."""

    index_id = os.getenv("TWELVELABS_INDEX_ID", "").strip()
    if not index_id:
        raise RuntimeError(
            "TWELVELABS_INDEX_ID is unset. Paste your Marengo-backed index id in apps/agent/.env.",
        )

    q = technique_query.strip()
    if not q:
        raise ValueError("technique_query is required.")

    pager = _client().search.query(
        index_id=index_id,
        query_text=q,
        search_options=["visual"],
        page_limit=15,
    )

    out: list[dict[str, Any]] = []
    for item in pager:
        out.append(
            {
                "id": item.id,
                "video_id": item.video_id,
                "start": item.start,
                "end": item.end,
                "rank": item.rank,
                "thumbnail_url": item.thumbnail_url,
                "transcription": item.transcription,
            }
        )
    return out
