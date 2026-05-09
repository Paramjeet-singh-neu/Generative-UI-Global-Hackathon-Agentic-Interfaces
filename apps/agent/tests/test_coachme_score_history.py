from src.coachme_score_history import merge_coaching_score_history


def test_merge_first_score():
    assert merge_coaching_score_history([], 72) == [72]
    assert merge_coaching_score_history(None, 72) == [72]


def test_merge_second_score_keeps_pair():
    assert merge_coaching_score_history([70], 82) == [70, 82]


def test_merge_third_score_rolls_window():
    assert merge_coaching_score_history([70, 82], 90) == [82, 90]


def test_merge_coerces_numeric_strings():
    assert merge_coaching_score_history(["70"], "85") == [70, 85]


def test_invalid_new_score_preserves_tail():
    assert merge_coaching_score_history([60, 70], "nope") == [60, 70]
