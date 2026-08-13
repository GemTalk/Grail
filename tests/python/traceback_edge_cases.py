"""Fixtures for three small traceback.py conformance gaps.

Driven by PythonTests>>TracebackTestCase.  Each check answers True when the
behaviour matches CPython, so a failure names the specific rule.

Three unrelated rules, grouped because each is a few lines and none deserves its
own file:

1. ``print_exception(42)'' is a TypeError -- ``Exception expected for value, int
   found'' -- not a render of ``int: 42''.  Grail rendered it, then failed later
   writing to a file it had not been given.  Only the ONE-argument form is
   checked: the legacy three-argument form fails under CPython too, but with
   whatever the value happens to raise, and tightening it would break callers
   that pass a type and a message.

2. ``FrameSummary._lines'' is the slot CPython 3.14 keeps a frame's source text
   in, and it stays None while ``lookup_line=False''.  Grail called it ``_line'',
   so code reading the documented name found nothing.  The ``line'' property
   fills it on first use either way.

3. A SyntaxError's location fields are a plain writable tuple, so any of them can
   be any object -- ``SyntaxError('error', 'abcd')'' gives lineno='b', offset='c',
   text='d' (gh-128894).  Rendering must not raise; Grail called int() on the
   offset and died with ValueError.

The rules for that third one were MEASURED against CPython rather than guessed,
because the interesting case is counter-intuitive:

    text not a str           -> no source block at all
    offset None              -> source line, no caret
    offset an int            -> source line + caret
    offset present, not int  -> no source block at all

An unusable offset suppresses the source LINE too, not just the caret.  ``lineno''
needs no check at all -- it is only ever printed, so ``line b'' is what CPython
shows.

Run this file under CPython (``python3 tests/python/traceback_edge_cases.py'') to
see what it produces -- that is where the expectations come from.
"""

import io
import traceback


# ------------------------------------------------------- 1. a non-exception
def print_exception_of_a_non_exception_is_a_typeerror():
    try:
        traceback.print_exception(42)
    except TypeError as e:
        return 'Exception expected for value, int found' in str(e)
    return False


def format_exception_of_a_non_exception_is_a_typeerror():
    """The same guard, reached through the other entry point."""
    try:
        traceback.format_exception(42)
    except TypeError as e:
        return 'Exception expected for value, int found' in str(e)
    return False


def the_type_name_in_the_message_is_the_value_s():
    try:
        traceback.format_exception('a string')
    except TypeError as e:
        return 'Exception expected for value, str found' in str(e)
    return False


def none_is_still_legal():
    """``print_exception(None)'' renders ``NoneType: None'' -- the guard must not
    swallow the one non-exception CPython does accept."""
    sio = io.StringIO()
    traceback.print_exception(None, file=sio)
    return sio.getvalue() == 'NoneType: None\n'


def a_real_exception_still_prints():
    sio = io.StringIO()
    traceback.print_exception(ValueError('v'), file=sio)
    return sio.getvalue() == 'ValueError: v\n'


# --------------------------------------------------------- 2. lazy source text
def a_frame_summary_starts_with_no_cached_lines():
    """``lookup_line=False'' means "do not touch linecache yet"."""
    f = traceback.FrameSummary('f', 1, 'dummy', lookup_line=False)
    return f._lines is None


def the_line_property_fills_the_cache_on_first_use():
    f = traceback.FrameSummary(__file__, 1, 'dummy', lookup_line=False)
    first = f.line
    return (isinstance(first, str) and first != ''
            and f._lines is not None
            and f.line == first)


def a_supplied_line_is_kept_as_given():
    """A caller-supplied line is stored raw and stripped on the way out, so the
    property's answer is stripped while the cache is not."""
    f = traceback.FrameSummary('f', 1, 'dummy', line='    indented  ')
    return f.line == 'indented' and f._lines == '    indented  '


def lookup_line_true_resolves_immediately():
    f = traceback.FrameSummary(__file__, 1, 'dummy')
    return f._lines is not None


# ------------------------------------------- 3. malformed SyntaxError locations
def _only(exc):
    return traceback.format_exception_only(exc)


def a_string_location_tuple_does_not_raise():
    """The gh-128894 case: every field comes out a single character."""
    return _only(SyntaxError('error', 'abcd')) == [
        '  File "a", line b\n', 'SyntaxError: error\n']


def an_all_none_location_renders_the_message_alone():
    return _only(SyntaxError('error', [None] * 4)) == ['SyntaxError: error\n']


def an_int_text_field_suppresses_the_source_block():
    """text=4 is not a str, so there is no source line to show."""
    return _only(SyntaxError('error', (1, 2, 3, 4))) == [
        '  File "1", line 2\n', 'SyntaxError: error\n']


def a_six_field_location_behaves_the_same():
    """The end_lineno / end_offset form takes the same path."""
    return (_only(SyntaxError('error', 'abcdef'))
            == ['  File "a", line b\n', 'SyntaxError: error\n']
            and _only(SyntaxError('error', [None] * 6))
            == ['SyntaxError: error\n'])


def a_non_int_offset_suppresses_the_source_line_too():
    """The counter-intuitive one, and the reason these rules were measured: the
    text is a perfectly good str, and CPython still shows no source line."""
    return _only(SyntaxError('error', ('f.py', 1, 'x', 'source'))) == [
        '  File "f.py", line 1\n', 'SyntaxError: error\n']


def a_none_offset_shows_the_source_line_without_a_caret():
    return _only(SyntaxError('error', ('f.py', 1, None, 'source'))) == [
        '  File "f.py", line 1\n', '    source\n', 'SyntaxError: error\n']


def a_non_int_lineno_is_printed_as_is():
    """lineno is only ever interpolated, so it needs no type check -- and the
    source block still renders when text and offset are usable."""
    err = _only(SyntaxError('error', ('f.py', 'n', 3, 'source')))
    return err[0] == '  File "f.py", line n\n' and err[1] == '    source\n'


def a_wellformed_syntax_error_is_unaffected():
    """The guards must not cost the ordinary case its source line."""
    err = _only(SyntaxError('bad syntax', ('x.py', 23, 1, 'the source')))
    return (err[0] == '  File "x.py", line 23\n'
            and err[1] == '    the source\n'
            and err[-1] == 'SyntaxError: bad syntax\n')


if __name__ == '__main__':
    checks = [
        print_exception_of_a_non_exception_is_a_typeerror,
        format_exception_of_a_non_exception_is_a_typeerror,
        the_type_name_in_the_message_is_the_value_s,
        none_is_still_legal,
        a_real_exception_still_prints,
        a_frame_summary_starts_with_no_cached_lines,
        the_line_property_fills_the_cache_on_first_use,
        a_supplied_line_is_kept_as_given,
        lookup_line_true_resolves_immediately,
        a_string_location_tuple_does_not_raise,
        an_all_none_location_renders_the_message_alone,
        an_int_text_field_suppresses_the_source_block,
        a_six_field_location_behaves_the_same,
        a_non_int_offset_suppresses_the_source_line_too,
        a_none_offset_shows_the_source_line_without_a_caret,
        a_non_int_lineno_is_printed_as_is,
        a_wellformed_syntax_error_is_unaffected,
    ]
    for fn in checks:
        print('%-4s %s' % ('OK' if fn() is True else 'FAIL', fn.__name__))
