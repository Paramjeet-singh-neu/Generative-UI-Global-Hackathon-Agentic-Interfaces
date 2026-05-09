import json

from src.twelvelabs_client import _json_from_analyze_payload


def test_parse_raw_json_object():
    raw = json.dumps(
        {
            "clip_name": "jab_drill",
            "overall_score": 77,
            "techniques": [],
            "drills": [],
            "timestamps": [],
        }
    )
    out = _json_from_analyze_payload(raw)
    assert out["overall_score"] == 77
    assert out["clip_name"] == "jab_drill"


def test_parse_markdown_fenced_json():
    inner = '{"clip_name":"x","overall_score":80,"techniques":[],"drills":[],"timestamps":[]}'
    raw = f"Here is JSON:\n```json\n{inner}\n```"
    out = _json_from_analyze_payload(raw)
    assert out["overall_score"] == 80


def test_empty_payload_raises():
    try:
        _json_from_analyze_payload("")
    except ValueError as e:
        assert "Empty" in str(e)
    else:
        raise AssertionError("expected ValueError")
