"""Fixture exercising _grail_session.SessionDict (commit 3a8f2e9).

SessionDict is a dict-like proxy over a per-session dict held in SessionTemps.
Each function clears its own named store first so the result is independent of
how many times the suite has run within this Gem session.
"""

from _grail_session import SessionDict


def roundtrip_ok():
    d = SessionDict("grail_test.roundtrip")
    d.clear()
    d["a"] = 1
    d["b"] = 2
    return (
        d["a"] == 1
        and d["b"] == 2
        and len(d) == 2
        and ("a" in d)
        and ("z" not in d)
        and d.get("a") == 1
        and d.get("z", 99) == 99
    )


def pop_delete_ok():
    d = SessionDict("grail_test.popdel")
    d.clear()
    d["x"] = 10
    d["y"] = 20
    popped = d.pop("x", None)
    missing = d.pop("nope", None)
    del d["y"]
    return popped == 10 and missing is None and len(d) == 0


def keys_values_items_ok():
    d = SessionDict("grail_test.kvi")
    d.clear()
    d["k1"] = "v1"
    d["k2"] = "v2"
    # Membership + length rather than ordered-list equality: iteration order is
    # unspecified and Grail's sorted() yields an Array (not a list), so
    # `sorted(...) == [...]` would be a cross-type comparison.
    keys = list(d.keys())
    values = list(d.values())
    items = list(d.items())
    iters = list(iter(d))
    return (
        len(keys) == 2
        and "k1" in keys
        and "k2" in keys
        and len(values) == 2
        and "v1" in values
        and "v2" in values
        and len(items) == 2
        and ("k1", "v1") in items
        and ("k2", "v2") in items
        and len(iters) == 2
        and "k1" in iters
        and "k2" in iters
    )


def shares_backing():
    # Two SessionDict views with the same name resolve to the one per-session
    # store, so a write through one is visible through the other.
    a = SessionDict("grail_test.shared")
    b = SessionDict("grail_test.shared")
    a.clear()
    a["only"] = "set-via-a"
    return b["only"]
