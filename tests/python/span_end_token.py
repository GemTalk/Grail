"""Fixtures for where a traceback frame's span ENDS.

Driven by PythonTests>>SpanEndTokenTestCase.  Each check answers True when the
behaviour matches CPython, so a failure names the specific rule.

WHAT WAS WRONG.  A node's extent is set from its first and last TOKENS, and the
last token contributed its START position where the span needed its END.  So
every span whose last token was more than one character long was truncated to
that token's first character:

    return bad + other
           ~~~~~~^          <- CPython underlines the whole of ``bad + other''

``foo(x)'' and ``a[i]'' were right, because ``)'' and ``]'' are one character
long -- and calls and subscripts are very nearly all of what the caret tests
exercise, which is why this survived.  Anything ending in a name, a number, a
string or a keyword literal was short: ``a + b'', ``x or y'', ``n // d''.

Tokens carry their own end now.  Not derivable from the token's value: a string
token's value is its DECODED content, so quotes and escapes are already gone by
then, and ``f'ab{1}cd''' is shorter as a value than as source.

Run this file under CPython (``python3 tests/python/span_end_token.py'') to see
what it produces.  Every check here answers identically under CPython and Grail.
"""

import linecache
import traceback


class _Bad:
    def __add__(self, other):
        raise ValueError('x')

    def __getitem__(self, key):
        raise ValueError('x')


_bad = _Bad()
_other = 12345


def _span(fn):
    """The source the CALLING frame's columns select, or None.

    Frame [-2], not [-1]: the innermost frame is the dunder that raised, and the
    span under test is the operator expression in the frame that invoked it."""
    try:
        fn()
    except ValueError as e:
        fs = traceback.extract_tb(e.__traceback__)[-2]
        if fs.colno is None or fs.end_lineno != fs.lineno:
            return None
        raw = linecache.getline(fs.filename, fs.lineno).rstrip('\n')
        return raw[fs.colno:fs.end_colno]
    return None


def _ends_in_name():
    return _bad + _other


def _ends_in_number():
    return _bad + 98765


def _ends_in_string():
    return _bad + 'abcdef'


def _ends_in_fstring():
    return _bad + f'ab{1}cd'


def _ends_in_keyword_literal():
    return _bad + True


def _ends_in_bracket():
    return _bad[_other]


def _ends_in_paren():
    return _bad + (_other)


def a_span_ending_in_a_name_reaches_its_last_character():
    """The case that gave this fixture its name: the span stopped at ``_o''."""
    return _span(_ends_in_name) == '_bad + _other'


def a_span_ending_in_a_number_reaches_its_last_character():
    return _span(_ends_in_number) == '_bad + 98765'


def a_span_ending_in_a_string_reaches_its_closing_quote():
    """A string token's END cannot be computed from its value, which is already
    decoded -- the quotes are not in it."""
    return _span(_ends_in_string) == "_bad + 'abcdef'"


def a_span_ending_in_an_fstring_reaches_its_closing_quote():
    """Shorter as a value than as source, so this fails any length arithmetic
    done on the decoded text."""
    return _span(_ends_in_fstring) == "_bad + f'ab{1}cd'"


def a_span_ending_in_a_keyword_literal_reaches_its_last_character():
    return _span(_ends_in_keyword_literal) == '_bad + True'


def a_span_ending_in_a_bracket_is_unchanged():
    """The shape that was always right, kept as the control: a one-character
    end token makes the old rule and the new one agree, so a fixture made only
    of calls and subscripts would pass either way."""
    return (_span(_ends_in_bracket) == '_bad[_other]'
            and _span(_ends_in_paren) == '_bad + (_other)')


CHECKS = [
    a_span_ending_in_a_name_reaches_its_last_character,
    a_span_ending_in_a_number_reaches_its_last_character,
    a_span_ending_in_a_string_reaches_its_closing_quote,
    a_span_ending_in_an_fstring_reaches_its_closing_quote,
    a_span_ending_in_a_keyword_literal_reaches_its_last_character,
    a_span_ending_in_a_bracket_is_unchanged,
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
