"""`sys.excepthook` must be READABLE before anyone assigns to it.

CPython starts every hook equal to its `__`-prefixed twin -- on a fresh
interpreter `sys.excepthook is sys.__excepthook__` is True -- and programs read
it in order to CHAIN, which is the documented way to install a handler:

    previous = sys.excepthook
    sys.excepthook = lambda *arguments: my_handler(previous, *arguments)

Grail seeded only the dunder twins, while `excepthook` and `displayhook` kept
accessor methods reading a key nobody had put. The read raised a raw Smalltalk
LookupError -- NOT an AttributeError -- so it was invisible to
`except AttributeError` and uncatchable from Python. The chaining read above
took the whole program down.

ASSIGNMENT WAS NEVER BROKEN, which is worth stating because it is the obvious
suspicion: `sys.excepthook = handler` stores a dynamic instance variable that
the read then finds, so the two round-trip correctly. Only the read BEFORE any
assignment had nothing to find. `breakpointhook` was already seeded for a
neighbouring reason, which is why it alone survived.
"""

import sys

RESULTS = {}


def check(name, got, want):
    """Report only STRINGS on failure -- never a repr of a live callable.

    An earlier draft formatted the offending value with %r, and a hook is a
    callable, so the failure path itself blew up inside repr before it could
    say what was wrong. A diagnostic must not be able to fail harder than the
    thing it is diagnosing.
    """
    RESULTS[name] = (got == want) or ('got: ' + str(got)[:120])


REPORT = []


HOOKS = ('excepthook', 'displayhook', 'breakpointhook', 'unraisablehook')


# ------------------------------- every hook is readable, and callable

def _all_readable():
    out = {}
    for name in HOOKS:
        try:
            out[name] = callable(getattr(sys, name))
        except BaseException as exc:
            out[name] = 'RAISED %s' % type(exc).__name__
    return {k: v for k, v in out.items() if v is not True}


check('every_hook_is_readable', _all_readable(), {})


def _all_dunders_readable():
    out = {}
    for name in HOOKS:
        dunder = '__%s__' % name
        try:
            out[dunder] = callable(getattr(sys, dunder))
        except BaseException as exc:
            out[dunder] = 'RAISED %s' % type(exc).__name__
    return {k: v for k, v in out.items() if v is not True}


check('every_dunder_twin_is_readable', _all_dunders_readable(), {})


# ------------------- the chaining idiom, which is why this matters

def _chaining_idiom_works():
    """Read the current hook, wrap it, restore. What real code does."""
    previous = sys.excepthook
    seen = []

    def chained(*arguments):
        seen.append('called')
        return previous(*arguments)

    sys.excepthook = chained
    try:
        restored = sys.excepthook is chained
    finally:
        sys.excepthook = previous
    return (callable(previous), restored, sys.excepthook is previous)


check('the_chaining_idiom_works', _chaining_idiom_works(), (True, True, True))


# ---------------------------- assignment round-trips (was never broken)

def _round_trips():
    out = {}
    for name in HOOKS:
        original = getattr(sys, name)

        def replacement(*arguments):
            return None

        setattr(sys, name, replacement)
        try:
            out[name] = getattr(sys, name) is replacement
        finally:
            setattr(sys, name, original)
    return {k: v for k, v in out.items() if v is not True}


check('assignment_round_trips', _round_trips(), {})


# ------------------ restoring from the dunder twin is the documented reset

def _dunder_restores():
    original = sys.excepthook

    def replacement(*arguments):
        return None

    sys.excepthook = replacement
    try:
        sys.excepthook = sys.__excepthook__
        return callable(sys.excepthook)
    finally:
        sys.excepthook = original


check('the_dunder_twin_can_restore_the_hook', _dunder_restores(), True)


for _name in sorted(RESULTS):
    _value = RESULTS[_name]
    REPORT.append(('PASS  ' if _value is True else 'FAIL  ') + _name
                  + ('' if _value is True else ' -> ' + str(_value)[:100]))
SUMMARY = '\n'.join(REPORT)
