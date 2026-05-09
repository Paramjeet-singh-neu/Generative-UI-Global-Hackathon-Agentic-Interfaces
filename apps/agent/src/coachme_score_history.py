"""Rolling overall-score history for CoachMe+ deterministic progress UI.

Updated on each successful `analyze_boxing_clip`; the canvas can show a
before/after strip without relying on the model to call `showComparison`.
"""

from __future__ import annotations

from typing import Any, List


def merge_coaching_score_history(previous: Any, overall_score: Any) -> List[float]:
    """Append the new overall score and keep at most the last two values (chronological).

    ``previous`` is the prior ``coaching_score_history`` from agent state (list or missing).
    Invalid ``overall_score`` values leave prior history unchanged (or empty).
    """

    try:
        new_val = float(overall_score)
    except (TypeError, ValueError):
        return _coerce_tail(previous, max_len=2)

    nums: List[float] = []
    if isinstance(previous, list):
        for x in previous:
            try:
                nums.append(float(x))
            except (TypeError, ValueError):
                continue
    nums.append(new_val)
    return nums[-2:]


def _coerce_tail(previous: Any, *, max_len: int) -> List[float]:
    if not isinstance(previous, list) or max_len <= 0:
        return []
    out: List[float] = []
    for x in previous[-max_len:]:
        try:
            out.append(float(x))
        except (TypeError, ValueError):
            continue
    return out
