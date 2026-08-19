"""PEP 553: breakpoint() and sys.breakpointhook.

``breakpoint()`` does exactly one thing -- forward to whatever
``sys.breakpointhook`` currently is.  That indirection IS the feature: it lets
a program, a test, or the $PYTHONBREAKPOINT environment variable redirect every
breakpoint() in a codebase without touching a call site.  So the hook is read
on EACH call rather than captured once, and the tests below assign to it
between calls to prove that.

The default hook is driven entirely by $PYTHONBREAKPOINT:

    unset or empty   pdb.set_trace()
    "0"              do nothing, return None
    anything else    a dotted name to import and call; a bare name means
                     builtins, and an unimportable one is a RuntimeWarning
                     rather than an error -- a mistyped variable must not take
                     the program down at its first breakpoint.

Grail had the NAME in builtins' table and a sys.breakpointhook that returned
None, so breakpoint() raised NameError and none of this worked.  pdb is new
too: set_trace() pauses into GemStone's own debugger, which is the thing that
actually stops execution for a human to look at here.

Every expectation below was checked against CPython 3.14.
"""

import os
import sys

RESULTS = {}
CALLS = []


def check(name, fn, expected):
    try:
        RESULTS[name] = (fn() == expected)
    except BaseException as exc:
        RESULTS[name] = 'raised %s: %s' % (type(exc).__name__, exc)


def _record(*args, **kwargs):
    CALLS.append((args, dict(kwargs)))
    return 'recorded'


def _with_hook(hook, call):
    """Install hook, run call, restore.  Answers whatever call returned."""
    saved = sys.breakpointhook
    del CALLS[:]
    try:
        sys.breakpointhook = hook
        return call()
    finally:
        sys.breakpointhook = saved


def _with_env(value, call):
    """Run call with $PYTHONBREAKPOINT set (or removed, for None)."""
    saved = os.environ.get('PYTHONBREAKPOINT')
    saved_hook = sys.breakpointhook
    try:
        sys.breakpointhook = sys.__breakpointhook__
        if value is None:
            os.environ.pop('PYTHONBREAKPOINT', None)
        else:
            os.environ['PYTHONBREAKPOINT'] = value
        return call()
    finally:
        sys.breakpointhook = saved_hook
        if saved is None:
            os.environ.pop('PYTHONBREAKPOINT', None)
        else:
            os.environ['PYTHONBREAKPOINT'] = saved


# ------------------------------------------------- forwarding to the hook

check('calls_the_hook',
      lambda: _with_hook(_record, lambda: (breakpoint(), CALLS)[1]),
      [((), {})])
check('forwards_positional_and_keyword_arguments',
      lambda: _with_hook(_record,
                         lambda: (breakpoint(1, 2, three=3), CALLS)[1]),
      [((1, 2), {'three': 3})])
check('returns_what_the_hook_returns',
      lambda: _with_hook(_record, lambda: breakpoint()), 'recorded')

# The hook is read on every call, not captured once.
def _swap_midway():
    saved = sys.breakpointhook
    try:
        seen = []
        sys.breakpointhook = lambda *a, **k: seen.append('first')
        breakpoint()
        sys.breakpointhook = lambda *a, **k: seen.append('second')
        breakpoint()
        return seen
    finally:
        sys.breakpointhook = saved


check('hook_is_read_on_each_call', _swap_midway, ['first', 'second'])

# A hook that cannot take the arguments raises, rather than being called wrong.
def _passthru_error():
    def picky():
        return 'never'
    try:
        _with_hook(picky, lambda: breakpoint(1, 2, three=3))
    except TypeError:
        return 'TypeError'
    return '<no raise>'


check('argument_mismatch_raises_typeerror', _passthru_error, 'TypeError')


# ------------------------------------------- sys.__breakpointhook__

check('dunder_hook_exists', lambda: callable(sys.__breakpointhook__), True)
# Assigning the original back restores default behaviour.
check('hook_can_be_reset',
      lambda: _with_hook(_record,
                         lambda: (setattr(sys, 'breakpointhook',
                                          sys.__breakpointhook__),
                                  sys.breakpointhook is sys.__breakpointhook__)[1]),
      True)


# ------------------------------------------------ $PYTHONBREAKPOINT

# "0" disables it entirely: no import, no call, answer None.
check('envvar_zero_is_a_noop', lambda: _with_env('0', lambda: breakpoint()),
      None)

# A dotted name is imported and called with breakpoint()'s own arguments.
check('envvar_names_a_builtin',
      lambda: _with_env('int', lambda: breakpoint('7')), 7)
check('envvar_names_a_dotted_path',
      lambda: _with_env('collections.OrderedDict',
                        lambda: type(breakpoint()).__name__),
      'OrderedDict')

# An unimportable name warns and answers None -- it must not raise.
def _unimportable():
    import warnings
    with warnings.catch_warnings(record=True) as w:
        warnings.simplefilter('always')
        result = _with_env('grail.no.such.hook', lambda: breakpoint())
        return (result, len(w) >= 1,
                any(issubclass(rec.category, RuntimeWarning) for rec in w))


check('unimportable_envvar_warns_and_returns_none', _unimportable,
      (None, True, True))


# ------------------------------------------------------------- pdb

def _pdb_has_set_trace():
    import pdb
    return callable(pdb.set_trace)


check('pdb_provides_set_trace', _pdb_has_set_trace, True)

# The default hook resolves to pdb.set_trace when the variable is unset, which
# is observable without stopping anything by replacing that function.
def _default_goes_to_pdb():
    import pdb
    saved = pdb.set_trace
    seen = []
    try:
        pdb.set_trace = lambda *a, **k: seen.append('pdb')
        _with_env(None, lambda: breakpoint())
        return seen
    finally:
        pdb.set_trace = saved


check('default_hook_calls_pdb_set_trace', _default_goes_to_pdb, ['pdb'])


def _empty_env_probe():
    """PYTHONBREAKPOINT='' behaves exactly as if it were unset."""
    import pdb
    saved = pdb.set_trace
    seen = []
    try:
        pdb.set_trace = lambda *a, **k: seen.append('pdb')
        _with_env('', lambda: breakpoint())
        return seen
    finally:
        pdb.set_trace = saved


check('empty_envvar_is_the_same_as_unset', _empty_env_probe, ['pdb'])


if __name__ == '__main__':
    for _name in sorted(RESULTS):
        _v = RESULTS[_name]
        print('%-4s %s' % ('OK' if _v is True else 'FAIL', _name),
              '' if _v is True else _v)
