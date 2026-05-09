#!/usr/bin/env python3
"""Boxing Coach MCP — newline JSON-RPC over stdio. stdlib only."""

from __future__ import annotations

import json
import sys
import uuid

CLIP_ANALYSES = {
    "jab": {
        "clip_name": "Jab technique drill",
        "overall_score": 65,
        "techniques": [
            {
                "name": "Jab",
                "score": 72,
                "correction": "Elbow dropping on extension — keep elbow tucked behind fist",
            },
            {
                "name": "Guard",
                "score": 58,
                "correction": "Guard dropping after combination — lead hand falls to chest level",
            },
            {
                "name": "Stance",
                "score": 71,
                "correction": "Feet narrowing during combinations — maintain shoulder-width base",
            },
            {
                "name": "Footwork",
                "score": 60,
                "correction": "Flat-footed during jab — stay on balls of feet",
            },
        ],
        "timestamps": [
            {"time": 4.2, "label": "Elbow drop on jab", "severity": "high"},
            {"time": 8.5, "label": "Stance narrowed", "severity": "medium"},
            {"time": 11.8, "label": "Guard dropped after hook", "severity": "high"},
            {"time": 15.3, "label": "Good jab extension", "severity": "low"},
            {"time": 19.7, "label": "Flat-footed retreat", "severity": "medium"},
        ],
        "drills": [
            {"name": "Wall jab drill", "reps": 20, "focus": "Elbow alignment"},
            {"name": "Guard reset drill", "reps": 15, "focus": "Return guard after combo"},
            {"name": "Stance width ladder", "reps": 10, "focus": "Maintain base during movement"},
        ],
    },
    "guard": {
        "clip_name": "Guard and defense drill",
        "overall_score": 55,
        "techniques": [
            {
                "name": "High Guard",
                "score": 48,
                "correction": "Lead hand dropping below chin — temple must be covered",
            },
            {"name": "Parry", "score": 62, "correction": "Parry timing late — redirect earlier"},
            {"name": "Slip", "score": 58, "correction": "Slipping too wide — losing counter position"},
            {"name": "Return", "score": 52, "correction": "Not returning to guard after defense"},
        ],
        "timestamps": [
            {"time": 2.1, "label": "Guard dropped to chest", "severity": "high"},
            {"time": 6.4, "label": "Late parry", "severity": "high"},
            {"time": 9.8, "label": "Over-slip to right", "severity": "medium"},
            {"time": 14.2, "label": "Good guard reset", "severity": "low"},
            {"time": 18.5, "label": "Hands down after slip", "severity": "high"},
        ],
        "drills": [
            {"name": "High-Guard Shadowboxing", "reps": 50, "focus": "Guard height"},
            {"name": "Mirror parry drill", "reps": 20, "focus": "Parry timing"},
            {"name": "Slip-rope drill", "reps": 30, "focus": "Head movement control"},
        ],
    },
    "combo": {
        "clip_name": "Combination work review",
        "overall_score": 70,
        "techniques": [
            {
                "name": "1-2 Combo",
                "score": 78,
                "correction": "Rear hand telegraphing — minimize wind-up",
            },
            {"name": "Hook", "score": 65, "correction": "Hook arcing too wide — tighter elbow angle"},
            {"name": "Guard Between", "score": 62, "correction": "Hands drop between punches — reset guard"},
            {"name": "Weight Transfer", "score": 75, "correction": "Good crosses, hooks need more hip drive"},
        ],
        "timestamps": [
            {"time": 3.0, "label": "Telegraphed cross", "severity": "medium"},
            {"time": 7.5, "label": "Wide hook", "severity": "high"},
            {"time": 10.2, "label": "Clean 1-2", "severity": "low"},
            {"time": 14.8, "label": "Guard dropped mid-combo", "severity": "high"},
            {"time": 20.1, "label": "Good weight transfer", "severity": "low"},
        ],
        "drills": [
            {"name": "Heavy bag 1-2 drill", "reps": 30, "focus": "Minimize telegraph"},
            {"name": "Short hook on wall pad", "reps": 20, "focus": "Tight hook angle"},
            {"name": "Combo-guard-combo drill", "reps": 15, "focus": "Reset guard between combos"},
        ],
    },
}

DRILL_LIBRARY = [
    {
        "name": "Wall jab drill",
        "reps": 20,
        "focus": "Elbow alignment",
        "difficulty": "beginner",
        "description": "Stand arm's length from wall. Throw jabs keeping elbow tucked.",
        "targets": ["jab", "elbow"],
    },
    {
        "name": "Guard reset drill",
        "reps": 15,
        "focus": "Return guard after combo",
        "difficulty": "intermediate",
        "description": "3-punch combo then touch gloves to temples.",
        "targets": ["guard", "combo"],
    },
    {
        "name": "High-Guard Shadowboxing",
        "reps": 50,
        "focus": "Guard height",
        "difficulty": "intermediate",
        "description": "Shadowbox with lead hand glued to temple.",
        "targets": ["guard", "shadowboxing"],
    },
    {
        "name": "Mirror parry drill",
        "reps": 20,
        "focus": "Parry timing",
        "difficulty": "intermediate",
        "description": "Partner throws slow jabs. Redirect with minimal movement.",
        "targets": ["parry", "defense"],
    },
    {
        "name": "Slip-rope drill",
        "reps": 30,
        "focus": "Head movement",
        "difficulty": "advanced",
        "description": "Rope at shoulder height. Slip under alternating sides.",
        "targets": ["head_movement", "slip"],
    },
    {
        "name": "Stance width ladder",
        "reps": 10,
        "focus": "Maintain base",
        "difficulty": "beginner",
        "description": "Agility ladder in boxing stance. Keep shoulder-width.",
        "targets": ["stance", "footwork"],
    },
    {
        "name": "Heavy bag 1-2 drill",
        "reps": 30,
        "focus": "Minimize telegraph",
        "difficulty": "intermediate",
        "description": "1-2 combos. Cross straight from chin, no wind-up.",
        "targets": ["cross", "combo"],
    },
    {
        "name": "Short hook on wall pad",
        "reps": 20,
        "focus": "Tight hook angle",
        "difficulty": "intermediate",
        "description": "Pad flat on wall forces tight 90-degree elbow.",
        "targets": ["hook"],
    },
    {
        "name": "Double-end bag rhythm",
        "reps": 3,
        "focus": "Timing",
        "difficulty": "advanced",
        "description": "3-min rounds. Single shots. Let bag return.",
        "targets": ["timing", "accuracy", "jab"],
    },
    {
        "name": "Combo-guard-combo drill",
        "reps": 15,
        "focus": "Guard reset between combos",
        "difficulty": "intermediate",
        "description": "Combo, full guard 1 sec, next combo.",
        "targets": ["guard", "combo"],
    },
]

TOOLS = [
    {
        "name": "analyze_boxing_clip_mcp",
        "description": "Analyze boxing footage. Returns scores, corrections, drills.",
        "inputSchema": {
            "type": "object",
            "properties": {"clip_description": {"type": "string"}},
            "required": ["clip_description"],
        },
    },
    {
        "name": "lookup_boxing_drills",
        "description": "Search drill library by technique/difficulty.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "technique": {"type": "string"},
                "difficulty": {"type": "string", "enum": ["beginner", "intermediate", "advanced"]},
            },
        },
    },
    {
        "name": "get_drill_details",
        "description": "Full details of a drill by name.",
        "inputSchema": {
            "type": "object",
            "properties": {"name": {"type": "string"}},
            "required": ["name"],
        },
    },
]


def pick(desc: str) -> dict:
    d = desc.lower()
    if any(w in d for w in ["guard", "defense", "block", "parry", "slip"]):
        key = "guard"
    elif any(w in d for w in ["combo", "combination", "hook", "cross", "1-2"]):
        key = "combo"
    else:
        key = "jab"
    r = json.loads(json.dumps(CLIP_ANALYSES[key]))
    r["session_id"] = str(uuid.uuid4())
    return r


def handle(req: dict):
    m, p, rid = req.get("method"), req.get("params", {}), req.get("id")
    if m == "initialize":
        return {
            "jsonrpc": "2.0",
            "id": rid,
            "result": {
                "protocolVersion": "2024-11-05",
                "capabilities": {"tools": {}},
                "serverInfo": {"name": "boxing-coach-mcp", "version": "1.0.0"},
            },
        }
    if m == "tools/list":
        return {"jsonrpc": "2.0", "id": rid, "result": {"tools": TOOLS}}
    if m == "tools/call":
        n, a = p.get("name"), p.get("arguments") or {}
        if n == "analyze_boxing_clip_mcp":
            t = json.dumps(pick(str(a.get("clip_description", ""))))
        elif n == "lookup_boxing_drills":
            res = list(DRILL_LIBRARY)
            if a.get("technique"):
                tc = a["technique"].lower()
                res = [
                    d
                    for d in res
                    if any(tc in tg for tg in d["targets"])
                    or tc in d["name"].lower()
                    or tc in d["focus"].lower()
                ]
            if a.get("difficulty"):
                res = [d for d in res if d["difficulty"] == a["difficulty"]]
            t = json.dumps(res)
        elif n == "get_drill_details":
            dr = next(
                (d for d in DRILL_LIBRARY if d["name"].lower() == str(a.get("name", "")).lower()),
                None,
            )
            t = json.dumps(dr) if dr else json.dumps({"ok": False, "error": f'not found: {a.get("name")}'})
        else:
            return {
                "jsonrpc": "2.0",
                "id": rid,
                "error": {"code": -32601, "message": f"Unknown tool: {n}"},
            }
        return {"jsonrpc": "2.0", "id": rid, "result": {"content": [{"type": "text", "text": t}]}}
    if m and str(m).startswith("notifications/"):
        return None
    return {"jsonrpc": "2.0", "id": rid, "error": {"code": -32601, "message": f"Unknown: {m}"}}


if __name__ == "__main__":
    for line in sys.stdin:
        if not line.strip():
            continue
        try:
            r = handle(json.loads(line))
            if r:
                sys.stdout.write(json.dumps(r) + "\n")
                sys.stdout.flush()
        except (json.JSONDecodeError, TypeError, KeyError):
            pass
