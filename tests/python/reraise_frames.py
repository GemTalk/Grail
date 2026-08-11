"""Fixtures for re-raise traceback splicing (§9.9 item 5).

Driven by PythonTests>>TracebackTestCase.  Each check answers True when the
behaviour matches CPython, so a failure names the specific rule.

A bare ``raise'' re-raises the SAME exception object, which already carries a
traceback.  CPython then adds a frame for every function the exception unwinds
through on its way out -- each at the line where it ENTERED that function, not
at the ``raise'' -- and each function appears exactly once.  Grail used to stop
at the first traceback it saw, so everything above the re-raise was lost.

Line numbers here are load-bearing: the expectations name them explicitly.  Run
this file under CPython (``python3 tests/python/reraise_frames.py'') to print the
chains it actually produces -- that is where the literals below come from, and
re-running it is how to re-derive them after an edit.  Deliberately NO trailing
comments on the raising / calling lines.
"""

import traceback


def _chain(exc):
    return [(f.name, f.lineno) for f in traceback.extract_tb(exc.__traceback__)]


def leaf():
    raise ValueError('boom')


def mid():
    try:
        leaf()
    except ValueError:
        raise


def passthrough():
    return mid()


def inner_reraise():
    try:
        leaf()
    except ValueError:
        raise


def outer_reraise():
    try:
        inner_reraise()
    except ValueError:
        raise


def catch_bare_reraise():
    try:
        mid()
    except ValueError as e:
        return e
    return None


def catch_through_passthrough():
    try:
        passthrough()
    except ValueError as e:
        return e
    return None


def catch_nested_reraises():
    try:
        outer_reraise()
    except ValueError as e:
        return e
    return None


EXPECTED_BARE = [('catch_bare_reraise', 57), ('mid', 32), ('leaf', 27)]
EXPECTED_PASSTHROUGH = [('catch_through_passthrough', 65), ('passthrough', 38),
                        ('mid', 32), ('leaf', 27)]
EXPECTED_NESTED = [('catch_nested_reraises', 73), ('outer_reraise', 50),
                   ('inner_reraise', 43), ('leaf', 27)]


def a_bare_reraise_keeps_the_deeper_frames_and_adds_the_catcher():
    """The whole point: the frames recorded before the re-raise survive, and the
    function that finally catches it is added on top."""
    return _chain(catch_bare_reraise()) == EXPECTED_BARE


def the_reraising_frame_is_reported_at_the_original_call():
    """``mid'' appears at the ``leaf()'' call, NOT at its ``raise'' -- CPython
    records where the exception entered the frame, and a bare re-raise does not
    move that."""
    chain = _chain(catch_bare_reraise())
    return ('mid', 32) in chain and ('mid', 34) not in chain


def each_function_appears_once():
    """A bare re-raise must not duplicate the re-raising frame."""
    names = [name for name, _ in _chain(catch_bare_reraise())]
    return len(names) == len(set(names))


def a_passed_through_function_gets_a_frame_too():
    """CPython adds a frame for EVERY function unwound through, including one
    with no try/except of its own.  Prepending only the catch-site frame would
    drop ``passthrough'' entirely."""
    return _chain(catch_through_passthrough()) == EXPECTED_PASSTHROUGH


def nested_reraises_each_add_their_frame():
    """Two bare re-raises in a row, each at its own level."""
    return _chain(catch_nested_reraises()) == EXPECTED_NESTED


def the_reraised_exception_is_the_same_object():
    """A bare ``raise'' must not substitute a new exception -- the identity is
    what makes the traceback cumulative in the first place."""
    exc = catch_bare_reraise()
    return isinstance(exc, ValueError) and str(exc) == 'boom'


def a_reraised_traceback_renders_every_frame():
    """End to end: the rendered text names all four frames, deepest last."""
    text = ''.join(traceback.format_exception(catch_through_passthrough()))
    return (text.count(', in ') == 4
            and text.index('catch_through_passthrough') < text.index('passthrough')
            and text.index('passthrough') < text.index('in mid')
            and text.index('in mid') < text.index('in leaf')
            and text.rstrip().endswith('ValueError: boom'))


if __name__ == '__main__':
    for label, fn, expected in (
            ('bare', catch_bare_reraise, EXPECTED_BARE),
            ('passthrough', catch_through_passthrough, EXPECTED_PASSTHROUGH),
            ('nested', catch_nested_reraises, EXPECTED_NESTED)):
        actual = _chain(fn())
        print('%-12s %s %s' % (label, 'OK ' if actual == expected else 'DIFF',
                               actual))
