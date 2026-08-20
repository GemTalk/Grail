"""How a warning is RENDERED and WHERE it is written.

Two functions, deliberately separate: formatwarning turns a warning into text,
showwarning writes that text somewhere.  Splitting them is what lets a caller
replace either half -- redirect the output without touching the format, or
change the format and still write to the usual place.

The rendering is TWO lines, not one:

    <file>:<lineno>: <Category>: <message>
      <the source line>

The second line is not decoration.  A warning is reported against a frame
somewhere up the stack, and the source line is how you see what the code
there actually said without going to look.  It comes from linecache when the
caller does not supply it.

The writing has an order: the ``file'' argument, else sys.stderr.  CPython
gives up when sys.stderr is None -- that happens under pythonw.exe -- and the
warning is simply lost.

One subtlety with a bug number attached (bpo-35178): showwarning passes the
line to a REPLACED formatwarning as a fifth POSITIONAL argument, so an
override written with five plain parameters works.  An implementation that
passes it as a keyword breaks every such override.

Every expectation below was checked against CPython 3.14.
"""

import io
import sys
import warnings

RESULTS = {}

MARKER = 'the source line this fixture reads back'


def _marker_line():
    """Find the line number of the MARKER assignment, by reading this file.

    Hardcoding it would make the fixture pass or fail on where the line
    happens to sit, which is not what is under test -- the point is that
    formatwarning reads the RIGHT line out of a real file.
    """
    with open(__file__, encoding='utf-8') as fp:
        lines = fp.read().split('\n')
    for index in range(len(lines)):
        if lines[index].startswith('MARKER = '):
            return index + 1
    return 0


MARKER_LINE = _marker_line()


def check(name, fn, expected):
    try:
        RESULTS[name] = (fn() == expected)
    except BaseException as exc:
        RESULTS[name] = 'raised %s: %s' % (type(exc).__name__, exc)


def fmt(*args, **kwargs):
    return warnings.formatwarning(*args, **kwargs)


HEADER = 'f.py:5: UserWarning: msg\n'


# ------------------------------------------------- the rendering

# A file linecache cannot read has no second line -- and no blank one either.
check('no_source_line_means_one_line',
      lambda: fmt('msg', UserWarning, 'f.py', 5), HEADER)
check('the_text_ends_with_a_newline',
      lambda: fmt('msg', UserWarning, 'f.py', 5).endswith('\n'), True)
# The header names file, line, CATEGORY (by __name__, not repr) and message.
check('the_header_names_the_category',
      lambda: 'UserWarning' in fmt('msg', UserWarning, 'f.py', 5), True)
check('the_header_is_not_a_repr',
      lambda: '<class' in fmt('msg', UserWarning, 'f.py', 5), False)

# An explicit line is used as given, stripped and indented by two spaces.
check('an_explicit_line_is_indented',
      lambda: fmt('msg', UserWarning, 'f.py', 5, 'x = 1'),
      HEADER + '  x = 1\n')
check('an_explicit_line_is_stripped',
      lambda: fmt('msg', UserWarning, 'f.py', 5, '   x = 1  \n'),
      HEADER + '  x = 1\n')
# The line can also be passed by keyword.
check('the_line_can_be_a_keyword',
      lambda: fmt('msg', UserWarning, 'f.py', 5, line='x = 1'),
      HEADER + '  x = 1\n')
# An EMPTY line is falsy, so it means "no line" rather than a blank one.
check('an_empty_line_is_omitted',
      lambda: fmt('msg', UserWarning, 'f.py', 5, ''), HEADER)

# With no line given, it is read from the file by linecache -- this file.
check('the_source_line_is_read_from_the_file',
      lambda: MARKER in fmt('msg', UserWarning, __file__, MARKER_LINE), True)
check('the_read_line_is_indented_too',
      lambda: fmt('msg', UserWarning, __file__, MARKER_LINE).split('\n')[1]
              .startswith('  '), True)
# ...and reading a line past the end of the file is not an error.
check('a_line_past_the_end_is_not_an_error',
      lambda: fmt('msg', UserWarning, __file__, 100000),
      '%s:100000: UserWarning: msg\n' % __file__)


# ------------------------------------------------- where it is written

def _writes_to_the_file_argument():
    stream = io.StringIO()
    warnings.showwarning('msg', UserWarning, 'f.py', 5, stream)
    return stream.getvalue()


check('showwarning_writes_to_its_file', _writes_to_the_file_argument, HEADER)


def _matches_formatwarning():
    stream = io.StringIO()
    warnings.showwarning('msg', UserWarning, 'f.py', 5, stream, 'x = 1')
    return stream.getvalue() == fmt('msg', UserWarning, 'f.py', 5, 'x = 1')


check('showwarning_writes_what_formatwarning_returns', _matches_formatwarning,
      True)


def _file_by_keyword():
    stream = io.StringIO()
    warnings.showwarning('msg', UserWarning, 'f.py', 5, file=stream)
    return stream.getvalue()


check('the_file_can_be_a_keyword', _file_by_keyword, HEADER)


def _falls_back_to_stderr():
    stream = io.StringIO()
    saved = sys.stderr
    sys.stderr = stream
    try:
        warnings.showwarning('msg', UserWarning, 'f.py', 5)
    finally:
        sys.stderr = saved
    return stream.getvalue()


check('no_file_means_stderr', _falls_back_to_stderr, HEADER)


def _stderr_is_none():
    """With nowhere to write, showwarning returns rather than raising.

    CPython loses the warning here.  Grail's sys.stderr is None by DEFAULT,
    so losing it would mean losing every warning Grail ever displays, and it
    falls back to the Transcript instead.  Neither writes anywhere this can
    observe, so what both implementations owe is the same: return None,
    quietly.
    """
    saved = sys.stderr
    sys.stderr = None
    try:
        return warnings.showwarning('msg', UserWarning, 'f.py', 5)
    finally:
        sys.stderr = saved


check('nowhere_to_write_is_not_an_error', _stderr_is_none, None)


# ------------------------------------------------- a replaced formatwarning

def _override_gets_the_line_positionally():
    # bpo-35178.  Five plain parameters, no keyword -- an override written
    # this way is the common shape and must keep working.
    def myformatwarning(message, category, filename, lineno, text):
        return 'm=%s:l=%s:t=%s' % (message, lineno, text)

    stream = io.StringIO()
    saved = warnings.formatwarning
    warnings.formatwarning = myformatwarning
    try:
        warnings.showwarning('msg', UserWarning, 'f.py', 5, stream, 'x = 1')
    finally:
        warnings.formatwarning = saved
    return stream.getvalue()


check('a_replaced_formatwarning_is_used', _override_gets_the_line_positionally,
      'm=msg:l=5:t=x = 1')


def _the_override_is_restorable():
    """Replacing formatwarning must not be one-way."""
    def myformatwarning(*args):
        return 'overridden'

    saved = warnings.formatwarning
    warnings.formatwarning = myformatwarning
    warnings.formatwarning = saved
    stream = io.StringIO()
    warnings.showwarning('msg', UserWarning, 'f.py', 5, stream)
    return stream.getvalue()


check('the_override_can_be_put_back', _the_override_is_restorable, HEADER)


if __name__ == '__main__':
    for _name in sorted(RESULTS):
        _v = RESULTS[_name]
        print('%-6s %s' % ('OK' if _v is True else 'FAIL', _name),
              '' if _v is True else _v)
