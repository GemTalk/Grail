"""Fixtures for __cause__ / __context__ chaining and its rendering.

Driven by PythonTests>>TracebackTestCase.  Each check answers True when the
behaviour matches CPython, so a failure names the specific rule.

Implicit chaining is the half that was missing: an exception raised while
another is being HANDLED records that one as __context__, which is what renders

    During handling of the above exception, another exception occurred:

Grail had __cause__ (``raise X from Y'') and __suppress_context__ but never set
__context__, and format_exception rendered only the outermost exception either
way.

Run this file under CPython (``python3 tests/python/exception_chaining.py'') to
print what it actually produces -- that is where the expectations come from.
"""

import traceback

CAUSE_LINE = 'The above exception was the direct cause of the following exception'
CONTEXT_LINE = 'During handling of the above exception, another exception occurred'


def _render(exc):
    return ''.join(traceback.format_exception(exc))


def _sections(exc):
    return _render(exc).count('Traceback (most recent call last)')


def implicit_context():
    try:
        try:
            1 / 0
        except ZeroDivisionError:
            raise ValueError('secondary')
    except ValueError as e:
        return e


def explicit_cause():
    try:
        try:
            1 / 0
        except ZeroDivisionError as inner:
            raise ValueError('wrapped') from inner
    except ValueError as e:
        return e


def suppressed():
    try:
        try:
            1 / 0
        except ZeroDivisionError:
            raise ValueError('clean') from None
    except ValueError as e:
        return e


def bare_class_raise():
    try:
        try:
            1 / 0
        except ZeroDivisionError:
            raise KeyError
    except KeyError as e:
        return e


def recursive_cause():
    try:
        try:
            try:
                1 / 0
            except ZeroDivisionError as e:
                z = e
                raise KeyError from e
        except KeyError as e:
            raise z from e
    except ZeroDivisionError as e:
        return e


def reraise_same_exception():
    try:
        try:
            1 / 0
        except ZeroDivisionError as e:
            raise e
    except ZeroDivisionError as e:
        return e


def a_raise_inside_a_handler_records_the_context():
    """The rule implicit chaining is about."""
    e = implicit_context()
    return (type(e.__context__).__name__ == 'ZeroDivisionError'
            and e.__cause__ is None
            and e.__suppress_context__ is False)


def an_implicit_context_renders_the_during_handling_line():
    """Two tracebacks, joined by CPython's context connector."""
    text = _render(implicit_context())
    return (_sections(implicit_context()) == 2
            and CONTEXT_LINE in text
            and CAUSE_LINE not in text
            and text.index('ZeroDivisionError') < text.index(CONTEXT_LINE))


def an_explicit_cause_sets_both_and_suppresses():
    """``raise X from Y'' records the cause AND the context, and sets the
    suppression flag -- so only the cause renders."""
    e = explicit_cause()
    text = _render(e)
    return (type(e.__cause__).__name__ == 'ZeroDivisionError'
            and type(e.__context__).__name__ == 'ZeroDivisionError'
            and e.__suppress_context__ is True
            and CAUSE_LINE in text and CONTEXT_LINE not in text)


def raise_from_none_suppresses_the_context_but_keeps_it():
    """``from None'' records no cause, keeps __context__ set, and renders one
    traceback only."""
    e = suppressed()
    return (e.__cause__ is None
            and type(e.__context__).__name__ == 'ZeroDivisionError'
            and e.__suppress_context__ is True
            and _sections(e) == 1)


def a_bare_class_raise_chains_too():
    """``raise KeyError'' -- a class, not a call -- must chain exactly as
    ``raise KeyError()'' does."""
    e = bare_class_raise()
    return (type(e.__context__).__name__ == 'ZeroDivisionError'
            and _sections(e) == 2
            and CONTEXT_LINE in _render(e))


def a_cyclic_chain_terminates_and_renders_once():
    """Two exceptions that cause each other.  CPython breaks the cycle when it
    chains (clearing the offending link's context) and renders two tracebacks
    with ONE connector -- not an endless walk, and not a stray connector ahead
    of the first block."""
    e = recursive_cause()
    text = _render(e)
    return (type(e.__cause__).__name__ == 'KeyError'
            and type(e.__context__).__name__ == 'KeyError'
            and _sections(e) == 2
            and text.count(CAUSE_LINE) == 1
            and not text.startswith('\n' + CAUSE_LINE))


def reraising_the_handled_exception_does_not_self_chain():
    """``except E as e: raise e'' must not make the exception its own context."""
    e = reraise_same_exception()
    return (e.__context__ is None or e.__context__ is not e) and _sections(e) == 1


def chain_false_renders_only_the_outermost():
    """The ``chain'' parameter still turns it all off."""
    e = implicit_context()
    text = ''.join(traceback.format_exception(e, chain=False))
    return (text.count('Traceback (most recent call last)') == 1
            and CONTEXT_LINE not in text
            and text.rstrip().endswith('ValueError: secondary'))


def tracebackexception_captures_the_chain():
    """TracebackException captures the chain at construction, so rendering can
    be deferred -- and its format() walks the captured links, not live ones."""
    te = traceback.TracebackException.from_exception(implicit_context())
    text = ''.join(te.format())
    return (te.__context__ is not None
            and te.__cause__ is None
            and CONTEXT_LINE in text
            and text.count('Traceback (most recent call last)') == 2)


if __name__ == '__main__':
    checks = [
        a_raise_inside_a_handler_records_the_context,
        an_implicit_context_renders_the_during_handling_line,
        an_explicit_cause_sets_both_and_suppresses,
        raise_from_none_suppresses_the_context_but_keeps_it,
        a_bare_class_raise_chains_too,
        a_cyclic_chain_terminates_and_renders_once,
        reraising_the_handled_exception_does_not_self_chain,
        chain_false_renders_only_the_outermost,
        tracebackexception_captures_the_chain,
    ]
    for fn in checks:
        print('%-4s %s' % ('OK' if fn() is True else 'FAIL', fn.__name__))
