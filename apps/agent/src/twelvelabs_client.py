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
from functools import lru_cache
from typing import Any

from twelvelabs import TwelveLabs

logger = logging.getLogger(__name__)

PEGASUS_MODEL_LATEST = "pegasus1.5"

_ANALYSIS_JSON_GUIDE = """You are an expert boxing coach analyzing this video.

Respond with VALID JSON ONLY (no markdown fences), using exactly this schema:
{
  "techniques": [
    {"name": "string", "score": number, "correction": "string"}
  ],
  "drills": [
    {"name": "string", "reps": "string", "focus": "string"}
  ],
  "timestamps": [
    {"t": number, "label": "string"}
  ]
}

Rules:
- techniques: observe jab, cross, hook, guard, footwork when visible; scores 0-100 per technique present.
- Each technique needs exactly one concise correction line.
- drills: recommended drills keyed to corrections (fewer drills than techniques allowed).
- timestamps: seconds where form errors clearly occur, with brief labels.
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
        "techniques": [],
        "drills": [],
        "timestamps": [],
    }


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
    return structured


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
