"""The sys.exc_info() shorthands must act on `limit` and `chain`, like the
functions they delegate to.

`format_exception` honoured both all along; only the shorthands were wrong, in
three different ways and one of them loudly:

    format_exc(1)            the limit was DROPPED -- whole traceback
    format_exc(limit=1)      TypeError: unexpected keyword argument 'limit'
    format_exc(chain=False)  TypeError: unexpected keyword argument 'chain'
    print_exc(limit=1)       dropped, silently
    print_exc(chain=False)   dropped, silently
    print_last(chain=False)  dropped, silently

`format_exc(limit=N)` is a common way to keep a logged traceback short, and the
TypeError it raised came from INSIDE an except block, so it replaced the
exception being reported (#1263).

`print_exception` was dropping `chain` too, which the issue did not list.  That
one matters beyond its own call: `print_exc` delegates to it, so fixing the
shorthand alone would have left `print_exc(chain=False)` still broken.

`format_exc` took `*args` because a zero-parameter function read as a module
attribute used to be INVOKED on read.  That no longer happens, so CPython's
signature works -- `read_then_call_still_works` below is what pins it, since
that is the regression the varargs hack existed to prevent.

Every expectation here was measured against CPython 3.14 on the same machine.
The try/except sits inside a function so the frame counts do not depend on
whether this file is imported or run as a script.
"""

import io
import sys
import traceback

RESULTS = {}


def check(name, got, want):
    RESULTS[name] = (got == want) or ('got: ' + repr(got)[:200])


def _inner():
    1 / 0


def _middle():
    _inner()


def _outer():
    try:
        _middle()
    except ZeroDivisionError:
        raise KeyError('outer')


def _frames(text):
    return text.count('  File "')


def _chained(text):
    return 'ZeroDivisionError' in text


def _shape(text):
    """(frame count, whether the __context__ chain was rendered)."""
    return (_frames(text), _chained(text))


def _printed(call):
    buffer = io.StringIO()
    call(buffer)
    return buffer.getvalue()


def _error(fn):
    try:
        return fn()
    except BaseException as exc:
        return (type(exc).__name__, str(exc)[:60])


# --------------------------------------------------------------- the defects

def _measure_chained():
    """Every measurement taken from inside `except KeyError`, where the KeyError
    was raised while handling a ZeroDivisionError two calls deep.  The full
    render is 5 frames: 3 for the ZeroDivisionError, 2 for the KeyError."""
    try:
        _outer()
    except KeyError:
        exc = sys.exc_info()[1]

        # format_exc: the limit positionally, by keyword, and chain=False.
        check('format_exc_default_renders_everything',
              _shape(traceback.format_exc()), (5, True))
        check('format_exc_honours_a_positional_limit',
              _shape(traceback.format_exc(1)), (2, True))
        check('format_exc_honours_a_keyword_limit',
              _shape(traceback.format_exc(limit=1)), (2, True))
        check('format_exc_honours_chain_false',
              _shape(traceback.format_exc(chain=False)), (2, False))

        # print_exc: same three, through the file it writes to.
        check('print_exc_default_renders_everything',
              _shape(_printed(lambda f: traceback.print_exc(file=f))), (5, True))
        check('print_exc_honours_a_keyword_limit',
              _shape(_printed(lambda f: traceback.print_exc(limit=1, file=f))),
              (2, True))
        check('print_exc_honours_chain_false',
              _shape(_printed(lambda f: traceback.print_exc(chain=False, file=f))),
              (2, False))
        # limit is the FIRST positional parameter, not file.
        check('print_exc_takes_limit_then_file_positionally',
              _shape(_printed(lambda f: traceback.print_exc(1, f))), (2, True))

        # print_exception dropped chain as well -- not in the issue, and the
        # reason fixing print_exc alone would not have been enough.
        check('print_exception_honours_chain_false',
              _shape(_printed(lambda f: traceback.print_exception(
                  type(exc), exc, exc.__traceback__, chain=False, file=f))),
              (2, False))
        check('print_exception_honours_limit',
              _shape(_printed(lambda f: traceback.print_exception(
                  type(exc), exc, exc.__traceback__, limit=1, file=f))),
              (2, True))

        # The delegate that was right all along, asserted so a "fix" that broke
        # it could not pass.
        check('format_exception_was_and_is_correct',
              (_shape(''.join(traceback.format_exception(
                  type(exc), exc, exc.__traceback__, limit=1))),
               _shape(''.join(traceback.format_exception(
                   type(exc), exc, exc.__traceback__, chain=False)))),
              ((2, True), (2, False)))

        # CPython's limit semantics at the edges: 0 shows no frames, and a
        # negative limit counts from the END of the traceback.
        check('limit_zero_shows_no_frames',
              _frames(traceback.format_exc(limit=0)), 0)
        check('a_negative_limit_counts_from_the_end',
              _frames(traceback.format_exc(limit=-1)), 2)

        # The regression the *args hack existed to prevent: reading the function
        # off the module must not invoke it, and the read handle must still take
        # the keyword.
        handle = traceback.format_exc
        check('read_then_call_still_works',
              (_shape(handle()), _shape(handle(limit=1))), ((5, True), (2, True)))


_measure_chained()


# ------------------------------------------------------------------ unchanged

def _measure_unchained():
    """chain=False must be a no-op when there is no __context__ to suppress."""
    try:
        raise ValueError('single')
    except ValueError:
        check('chain_false_is_a_noop_without_a_context',
              (_frames(traceback.format_exc()),
               _frames(traceback.format_exc(chain=False))),
              (1, 1))


_measure_unchained()

check('no_active_exception_still_reads_nonetype_none',
      (traceback.format_exc().strip(), traceback.format_exc(limit=1).strip()),
      ('NoneType: None', 'NoneType: None'))
check('print_last_without_a_last_exception_still_raises',
      _error(lambda: traceback.print_last())[0], 'ValueError')


if __name__ == '__main__':
    for _name in sorted(RESULTS):
        _v = RESULTS[_name]
        print('%-4s %s' % ('OK' if _v is True else 'FAIL', _name),
              '' if _v is True else _v)
