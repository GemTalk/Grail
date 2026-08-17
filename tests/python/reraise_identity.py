# Re-raising an exception must propagate THE SAME OBJECT, and must start a
# FRESH handler search from the raise point.  Grail could do either, not both.
#
# GemStone LIFTS a handler onto the signalling frame rather than UNWINDING to
# it, so a signalled exception is not inert data -- it is the live anchor
# joining a still-running signal point to its handler (the frames the VM appends
# as indexed slots; _basicSize is 5 inside the handler and 0 once it returns,
# that return being the deferred unwind).  One object cannot anchor two live
# signals, which is the UncontinuableError 6011 that ``raise e'' inside an
# ``except'' walks into.
#
# Python is the opposite: raise UNWINDS, so by the time an except body runs the
# original propagation is over and the exception is ordinary data that may be
# raised again freely -- and CPython requires the re-raised object to BE the
# caught one, because ``is'' comparisons are built on it (contextlib's
# _GeneratorContextManager.__exit__ is literally ``if exc is not value: raise'').
#
# Grail had three options and all three were wrong:
#   * signal -> 6011 while the handler is live
#   * pass   -> keeps identity, but CONTINUES THE ORIGINAL SEARCH, resuming
#               outside the active on:do: -- so a handler established INSIDE the
#               except body was skipped and the exception left the function
#   * copy   -> loses the identity Python's ``is'' depends on
#
# The fix stops asking one object to be both: the Python exception is never
# re-signalled.  A fresh throwaway CARRIER of its own class is signalled
# instead, referencing it, and handlers unwrap.

import traceback
from contextlib import contextmanager

r = {}


@contextmanager
def cm():
    try:
        yield
    finally:
        pass


# --- identity survives a re-raise ---------------------------------------------

try:
    raise ValueError('a')
except ValueError as _e:
    try:
        raise _e
    except ValueError as _e2:
        r['explicit_reraise'] = repr([type(_e2).__name__, _e2 is _e])

try:
    raise ValueError('b')
except ValueError as _e:
    try:
        raise
    except ValueError as _e2:
        r['bare_reraise'] = repr([type(_e2).__name__, _e2 is _e])

# The payload is ordinary data, so it survives any number of round trips.
_obj = ValueError('many')
for _i in range(3):
    try:
        try:
            raise _obj
        except ValueError:
            raise
    except ValueError as _e2:
        _obj = _e2
r['reraised_repeatedly'] = repr(_obj is not None and str(_obj) == 'many')


# --- a fresh handler search, which #pass did not give -------------------------
# The exception must be caught by the handler established INSIDE the except
# body.  With #pass it was not: the search resumed outside the active handler,
# and this left the function as an uncatchable error.

try:
    raise RuntimeError('c')
except RuntimeError as _outer:
    try:
        with cm():
            raise _outer
    except BaseException as _e:
        r['reraise_inside_with'] = repr([type(_e).__name__, _e is _outer])


# --- the payload's data is what everything sees --------------------------------

try:
    raise ValueError('payload text')
except ValueError as _e:
    try:
        raise _e
    except ValueError as _e2:
        r['args_survive'] = repr([str(_e2), _e2.args])

# A context manager's __exit__ receives Python's exception, not the carrier.
# Handing it the carrier gave managers an exception with NO args, which is how
# unittest's assertRaisesRegex began reporting "'...' does not match ''".
class _Watcher:
    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc_value, tb):
        r['exit_sees_payload'] = repr(
            [exc_type.__name__, str(exc_value), exc_value.args])
        return True


try:
    raise ValueError('seen by exit')
except ValueError as _e:
    with _Watcher():
        raise _e


# --- the traceback records one frame per function, where it was ENTERED --------
# A carrier is a fresh signal from the raise point, so the frame walk had to keep
# reading the PAYLOAD's captured stack -- otherwise the re-raising function was
# recorded a second time at its ``raise'' line as well as at the call the
# exception originally entered on.

def _leaf():
    raise ValueError('deep')            # line 126


def _mid():
    try:
        _leaf()                         # line 131
    except ValueError:
        raise                           # line 133


def _catch():
    try:
        _mid()                          # line 138
    except ValueError as e:
        return e
    return None


r['reraise_frame_chain'] = repr(
    [(f.name, f.lineno) for f in traceback.extract_tb(_catch().__traceback__)])


EXPECTED = {
    'args_survive': "['payload text', ('payload text',)]",
    'bare_reraise': "['ValueError', True]",
    'exit_sees_payload': "['ValueError', 'seen by exit', ('seen by exit',)]",
    'explicit_reraise': "['ValueError', True]",
    'reraise_frame_chain': "[('_catch', 138), ('_mid', 131), ('_leaf', 126)]",
    'reraise_inside_with': "['RuntimeError', True]",
    'reraised_repeatedly': 'True',
}


if __name__ == '__main__':
    for k in sorted(EXPECTED):
        actual = r[k]
        print('%-24s %s %s' % (k, 'OK ' if actual == EXPECTED[k] else 'DIFF', actual))
