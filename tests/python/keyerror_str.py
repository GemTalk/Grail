"""Fixtures for KeyError's message, which quotes itself.

Driven by PythonTests>>KeyErrorStrTestCase.  Each check answers True when the
behaviour matches CPython, so a failure names the specific rule.

THE RULE: ``str(KeyError(k))'' is ``repr(k)'', not ``str(k)''.  KeyError is the
one built-in exception whose message shows its argument's repr, and it is
deliberate -- a missing key is usually a string, so ``KeyError: missing'' reads as
prose where ``KeyError: 'missing''' shows the value actually looked up.  Grail
inherited BaseException's plain str, so every KeyError message was unquoted and
every traceback ending in one differed from CPython's.

The rule is uniform for a single argument rather than special-cased for strings:
``KeyError(1)'' is ``1'', ``KeyError(None)'' is ``None'', ``KeyError(('t', 1))''
is ``('t', 1)''.  With no arguments or with several, CPython falls back to
BaseException's behaviour -- empty, or the repr of the args tuple.

Found while writing tests/python/handler_raise.py, which had to switch its raised
exception from KeyError to RuntimeError to avoid asserting this bug by accident.

Run this file under CPython (``python3 tests/python/keyerror_str.py'') to see what
it produces -- that is where the expectations come from.
"""

import traceback


def a_string_key_is_quoted():
    """The case that matters, and the one that reads differently."""
    return str(KeyError('missing')) == "'missing'"


def the_quoting_distinguishes_an_empty_key_from_no_key():
    """``KeyError('')'' has a message and ``KeyError()'' does not; unquoted they
    were indistinguishable."""
    return str(KeyError('')) == "''" and str(KeyError()) == ''


def an_int_key_uses_repr_too():
    """Not str-specific -- repr(1) and str(1) agree, which is why this reads the
    same and still has to go through repr."""
    return str(KeyError(1)) == '1'


def a_none_key_uses_repr():
    return str(KeyError(None)) == 'None'


def a_tuple_key_uses_repr():
    """A compound key is common in real code (``cache[(host, port)]'')."""
    return str(KeyError(('t', 1))) == "('t', 1)"


def a_newline_in_the_key_is_escaped_by_repr():
    """repr escapes, str does not -- so a key containing a newline no longer
    breaks the message across lines."""
    return str(KeyError('a\nb')) == "'a\\nb'"


def several_args_fall_back_to_the_args_tuple():
    """CPython only applies the repr rule to exactly ONE argument."""
    return str(KeyError('a', 'b')) == "('a', 'b')"


def repr_of_the_exception_is_unchanged():
    """__repr__ is the constructor form and has its own rule; this change must
    not disturb it."""
    return repr(KeyError('x')) == "KeyError('x')"


def args_are_unchanged():
    return KeyError('x').args == ('x',)


def a_real_dict_miss_reports_the_quoted_key():
    """Where nearly every KeyError in practice comes from."""
    try:
        {}['missing']
    except KeyError as e:
        return str(e) == "'missing'"
    return False


def a_traceback_line_shows_the_quoted_key():
    """traceback.py renders an exception through str(), so the change reaches
    every traceback ending in a KeyError."""
    try:
        {}['missing']
    except KeyError as e:
        return traceback.format_exception_only(e) == ["KeyError: 'missing'\n"]
    return False


def a_subclass_inherits_the_rule():
    """CPython's rule is on KeyError, so a subclass gets it -- which matters
    because stdlib code subclasses it."""
    class MyKeyError(KeyError):
        pass

    return str(MyKeyError('x')) == "'x'"


def other_exceptions_are_untouched():
    """The repr rule is KeyError's alone.  A LookupError or an IndexError with the
    same argument keeps the plain str, and so does KeyError's own base."""
    return (str(LookupError('x')) == 'x'
            and str(IndexError('x')) == 'x'
            and str(ValueError('x')) == 'x')


if __name__ == '__main__':
    checks = [
        a_string_key_is_quoted,
        the_quoting_distinguishes_an_empty_key_from_no_key,
        an_int_key_uses_repr_too,
        a_none_key_uses_repr,
        a_tuple_key_uses_repr,
        a_newline_in_the_key_is_escaped_by_repr,
        several_args_fall_back_to_the_args_tuple,
        repr_of_the_exception_is_unchanged,
        args_are_unchanged,
        a_real_dict_miss_reports_the_quoted_key,
        a_traceback_line_shows_the_quoted_key,
        a_subclass_inherits_the_rule,
        other_exceptions_are_untouched,
    ]
    for fn in checks:
        print('%-4s %s' % ('OK' if fn() is True else 'FAIL', fn.__name__))
