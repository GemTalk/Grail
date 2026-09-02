"""Fixtures for the PEP 657 span of a ``raise'' and an ``assert'' frame.

Driven by PythonTests>>RaiseSpanTestCase.  Each check answers True when the
behaviour matches CPython, so a failure names the specific rule.

WHAT WAS MISSING.  Codegen records a frame's columns by storing a span before
each statement, but only for the three statement shapes whose VALUE is the
failing operation -- return, assignment, bare expression.  Everything else kept
the line-only store, on the rule that a wrong span is worse than none.  So every
``raise'' and every ``assert'' frame reported colno None and drew no caret line
at all, where CPython underlines them.

THE TWO GO OPPOSITE WAYS, which is why neither could be folded into the existing
rule:

  * a ``raise'' is blamed on the WHOLE STATEMENT, keyword included, out to the
    end of a ``from'' clause -- the statement IS the operation;
  * an ``assert'' is blamed on its TEST alone, so ``assert x > 0, 'msg''' draws
    carets under ``x > 0'' and under nothing else.

Run this file under CPython (``python3 tests/python/raise_spans.py'') to see what
it produces.  Every check here answers identically under CPython and Grail.
"""

import linecache
import traceback


def _span(fs):
    """The source the frame's columns select, or None when it has none."""
    if fs.colno is None or fs.end_lineno != fs.lineno:
        return None
    raw = linecache.getline(fs.filename, fs.lineno).rstrip('\n')
    return raw[fs.colno:fs.end_colno]


def _innermost(fn):
    try:
        fn()
    except BaseException as e:
        return traceback.extract_tb(e.__traceback__)[-1]
    return None


def _rendered(fn):
    try:
        fn()
    except BaseException as e:
        return [ln for ln in
                ''.join(traceback.format_exception(e)).splitlines()]
    return []


def _plain():
    raise ValueError('boom')


def _from_clause():
    try:
        1 / 0
    except ZeroDivisionError as e:
        raise ValueError('outer') from e


def _bare_reraise():
    try:
        raise KeyError('k')
    except KeyError:
        raise


def _multi_line():
    raise ValueError(
        'a', 'b'
    )


def _asserts():
    x = 0
    assert x > 0, 'must be positive'


def a_raise_spans_the_whole_statement():
    """Keyword included -- the statement IS the operation, so the span is not
    the exception expression inside it."""
    return _span(_innermost(_plain)) == "raise ValueError('boom')"


def a_from_clause_is_part_of_the_span():
    """``raise X from e'' runs to the end of the from clause."""
    return _span(_innermost(_from_clause)) == \
        "raise ValueError('outer') from e"


def a_bare_reraise_reports_the_original_raise():
    """A bare ``raise'' re-raises with the original traceback, so the innermost
    frame is the raise that first ran, not the re-raise."""
    return _span(_innermost(_bare_reraise)) == "raise KeyError('k')"


def a_multi_line_raise_draws_no_caret_row():
    """A span covering every character of its lines is drawn without carets --
    the same rule any whole-line span follows."""
    lines = _rendered(_multi_line)
    return (lines[-4:] == ['    raise ValueError(',
                           "        'a', 'b'",
                           '    )',
                           "ValueError: ('a', 'b')"])


def an_assert_spans_only_its_test():
    """The other direction from a raise: the message and the ``assert'' keyword
    are outside the span."""
    return _span(_innermost(_asserts)) == 'x > 0'


CHECKS = [
    a_raise_spans_the_whole_statement,
    a_from_clause_is_part_of_the_span,
    a_bare_reraise_reports_the_original_raise,
    a_multi_line_raise_draws_no_caret_row,
    an_assert_spans_only_its_test,
]

RESULTS = {}
for _fn in CHECKS:
    try:
        RESULTS[_fn.__name__] = _fn() is True
    except Exception as _exc:
        RESULTS[_fn.__name__] = type(_exc).__name__ + ': ' + str(_exc)


if __name__ == '__main__':
    for _fn in CHECKS:
        _got = RESULTS[_fn.__name__]
        print('%-4s %s' % ('OK' if _got is True else 'FAIL', _fn.__name__))
