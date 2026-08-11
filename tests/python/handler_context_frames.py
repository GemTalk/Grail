"""Fixtures for an exception raised INSIDE an except handler (§9.10 item 7).

Driven by PythonTests>>TracebackTestCase.  Each check answers True when the
behaviour matches CPython, so a failure names the specific rule.

Python's model: an exception raised while handling another one gets its OWN
traceback.  The handled exception's frames are NOT part of it -- they are reachable
only through ``__context__'' (or ``__cause__'' with ``raise ... from'').  Grail read
them off the live Smalltalk stack, which still holds them because a handler runs
ON TOP of the frames that signalled rather than after unwinding them, so a wrapping
raise reported the frames of the exception it was wrapping.

Line numbers here are load-bearing: the expectations name them explicitly.  Run
this file under CPython (``python3 tests/python/handler_context_frames.py'') to
print the chains it actually produces -- that is where the literals below come
from, and re-running it is how to re-derive them after an edit.  Deliberately NO
trailing comments on the raising / calling lines.
"""

import traceback


def _chain(exc):
    return [(f.name, f.lineno) for f in traceback.extract_tb(exc.__traceback__)]


def leaf():
    raise ValueError('boom')


def helper():
    raise KeyError('from helper')


def wrap_bare():
    try:
        leaf()
    except ValueError:
        raise KeyError('wrapped')


def wrap_from():
    try:
        leaf()
    except ValueError as e:
        raise KeyError('wrapped') from e


def wrap_via_helper():
    try:
        leaf()
    except ValueError:
        helper()


def catch(fn):
    try:
        fn()
    except KeyError as e:
        return e
    return None


EXPECTED_BARE = [('catch', 58), ('wrap_bare', 39)]
EXPECTED_FROM = [('catch', 58), ('wrap_from', 46)]
EXPECTED_VIA_HELPER = [('catch', 58), ('wrap_via_helper', 53), ('helper', 32)]


def the_wrapping_raise_reports_only_its_own_frames():
    """The handled exception's frames must not appear: CPython gives
    ``catch, wrap_bare'' -- no ``leaf''."""
    return _chain(catch(wrap_bare)) == EXPECTED_BARE


def the_handler_frame_is_at_the_raise_not_at_the_try():
    """The handler's own frame is located at the ``raise'' inside the except
    block, not at the call in the try body that produced the original
    exception."""
    chain = _chain(catch(wrap_bare))
    return ('wrap_bare', 39) in chain and ('wrap_bare', 37) not in chain


def no_frame_from_the_handled_exception_leaks_in():
    """Stated as its own rule because it is the part that was wrong: ``leaf'' is
    on the Smalltalk stack below the handler, and must still be excluded."""
    return 'leaf' not in [name for name, _ in _chain(catch(wrap_bare))]


def raise_from_behaves_the_same():
    """``raise X from e'' is the same shape -- an explicit cause changes
    __cause__, not the traceback."""
    return _chain(catch(wrap_from)) == EXPECTED_FROM


def a_function_called_from_the_handler_gets_its_own_frame():
    """The handler may call out, and that call's frames DO belong to the new
    exception -- so this is not simply "stop at the handler"."""
    return _chain(catch(wrap_via_helper)) == EXPECTED_VIA_HELPER


def the_handled_exceptions_own_traceback_survives():
    """Dropping those frames from the NEW traceback must not damage the OLD
    exception: the one being handled still names its own, including ``leaf''.

    This is deliberately checked by holding the original directly rather than
    through ``__context__'': implicit chaining is not implemented yet (Grail
    answers None for it, measured -- it belongs to §9.6's chaining work), and
    asserting it here would fail for a reason unrelated to frame identification."""
    saved = {}
    try:
        try:
            leaf()
        except ValueError as original:
            saved['original'] = original
            raise KeyError('wrapped')
    except KeyError:
        pass
    names = [name for name, _ in _chain(saved['original'])]
    return (isinstance(saved['original'], ValueError)
            and str(saved['original']) == 'boom'
            and names[-1] == 'leaf')


def raise_from_sets_cause():
    """And ``from e'' additionally sets __cause__ to that same exception."""
    exc = catch(wrap_from)
    return isinstance(exc.__cause__, ValueError) and str(exc.__cause__) == 'boom'


def the_rendered_traceback_names_only_the_new_frames():
    """End to end.  Note the ORDER: CPython renders the CONTEXT exception first
    and the new one last, so the section after the ``During handling'' marker is
    the new exception's -- and that is the section that must not name ``leaf''.
    (Whether Grail emits the marker at all is §9.6's chaining work, so this only
    inspects the last section, which is the whole text when there is no marker.)"""
    text = ''.join(traceback.format_exception(catch(wrap_bare)))
    new_section = text.split('During handling of the above exception')[-1]
    return ('in wrap_bare' in new_section
            and 'in leaf' not in new_section
            and 'KeyError' in text)


if __name__ == '__main__':
    for label, fn, expected in (
            ('bare', wrap_bare, EXPECTED_BARE),
            ('from', wrap_from, EXPECTED_FROM),
            ('via_helper', wrap_via_helper, EXPECTED_VIA_HELPER)):
        actual = _chain(catch(fn))
        print('%-12s %s %s' % (label, 'OK ' if actual == expected else 'DIFF',
                               actual))
