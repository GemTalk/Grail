"""Fixtures for SysConsoleStreamTestCase -- sys.stdout / sys.stderr as real
writable stream objects.

Both were the Python None singleton.  That is invisible for as long as
everything writes with ``print'' -- Grail's print treats a None sys.stdout as
"write to the console" -- and it stops being invisible the moment vendored
CPython source writes the way CPython writes, THROUGH the stream object:

  * ``argparse.ArgumentParser.print_help()'' reaches ``_print_message(text,
    _sys.stdout)'', whose body is ``try: file.write(message) except
    (AttributeError, OSError): pass''.  ``None.write'' is an AttributeError, so
    it was SWALLOWED: ``--help'' rendered its help and printed nothing, with no
    error and no exit-code change.  ``parser.error(...)'' lost its message the
    same way while still exiting 2.
  * ``traceback.print_exc()'' failed LOUDLY on the same thing:
    ``AttributeError: 'NoneType' object has no attribute 'write'''.

Everything here is measured against CPython 3.14 and is SILENT under it -- no
check writes visible text to the real stdout, because this file is run as a
script by scripts/check_python_fixtures.sh and its output is parsed.  What the
console stream does with a NON-empty write cannot be observed from Python at
all (the text goes to the terminal), so that half is pinned in Smalltalk by
SysConsoleStreamTestCase, which installs a capturing console.
"""

import io
import sys
import traceback


def the_streams_are_not_none():
    """THE DEFECT, in one line."""
    return sys.stdout is not None and sys.stderr is not None


def stdout_is_the_same_object_as_dunder_stdout():
    """CPython keeps the original stream in the dunder name and starts the
    plain name pointing at the same object."""
    return sys.stdout is sys.__stdout__ and sys.stderr is sys.__stderr__


def the_streams_report_cpython_s_names():
    return (sys.__stdout__.name, sys.__stderr__.name) == ('<stdout>',
                                                          '<stderr>')


def the_mode_is_write():
    return sys.__stdout__.mode == 'w' and sys.__stderr__.mode == 'w'


def an_empty_write_answers_zero():
    """write() answers the number of CHARACTERS written.  Only the empty case
    can be checked here without putting text on a terminal; the counted case is
    in SysConsoleStreamTestCase, against a capturing console."""
    return sys.__stdout__.write('') == 0 and sys.__stderr__.write('') == 0


def write_rejects_a_non_str():
    """CPython raises rather than stringifying."""
    try:
        sys.__stdout__.write(5)
        return 'NOT RAISED'
    except TypeError:
        return True


def the_protocol_predicates_answer():
    out = sys.__stdout__
    return (out.writable(), out.readable(), out.closed) == (True, False, False)


def isatty_answers_a_bool():
    """The VALUE is not pinned: it depends on where the process's stdout is
    pointing under CPython, and Grail answers False unconditionally because the
    console sink is the one object it must never send anything to."""
    return isinstance(sys.__stdout__.isatty(), bool)


def encoding_and_errors_are_strings():
    """The values differ by platform and by stream (CPython gives stderr
    'backslashreplace'), so only their type is pinned."""
    return (isinstance(sys.__stdout__.encoding, str)
            and isinstance(sys.__stdout__.errors, str))


def flush_answers_none():
    return sys.__stdout__.flush() is None and sys.__stderr__.flush() is None


def a_reassigned_stdout_still_redirects_print():
    """test.support.captured_stdout()'s whole mechanism, and the behaviour a
    real sys.stdout must not disturb: an assignment is a redirect, and the
    stream object is restorable."""
    before = sys.stdout
    buf = io.StringIO()
    sys.stdout = buf
    try:
        print('123')
        sys.stdout.write('abc')
    finally:
        sys.stdout = before
    return buf.getvalue() == '123\nabc' and sys.stdout is before


def print_exc_writes_to_sys_stderr():
    """The loud symptom.  print_exc() reads sys.stderr at CALL time and writes
    through it; with sys.stderr None that was an AttributeError."""
    buf = io.StringIO()
    before = sys.stderr
    sys.stderr = buf
    try:
        try:
            raise ValueError('boom')
        except ValueError:
            traceback.print_exc()
    finally:
        sys.stderr = before
    return 'ValueError: boom' in buf.getvalue()


def an_argparse_style_print_message_is_not_swallowed():
    """argparse's _print_message, spelled out: the ``except AttributeError:
    pass'' is what turned a missing stream into silence rather than a report.
    Nothing is swallowed once the stream is real."""
    def _print_message(message, file=None):
        if message:
            if file is None:
                file = sys.stderr
            try:
                file.write(message)
            except (AttributeError, OSError):
                pass

    buf = io.StringIO()
    before = sys.stdout
    sys.stdout = buf
    try:
        _print_message('usage: prog [-h]\n', sys.stdout)
    finally:
        sys.stdout = before
    return buf.getvalue() == 'usage: prog [-h]\n'


def fileno_is_unsupported():
    """A GRAIL LIMIT, expected to disagree with CPython (which answers 1).
    There is no descriptor on this side that is known to be the console's: the
    sink may be the Transcript, a GsFile, or a ClientForwarder whose descriptor
    lives in the client process.  io.UnsupportedOperation is an OSError
    subclass, so ``except OSError'' around fileno() catches it."""
    try:
        sys.__stdout__.fileno()
        return False
    except OSError:
        return True


if __name__ == '__main__':
    checks = [
        the_streams_are_not_none,
        stdout_is_the_same_object_as_dunder_stdout,
        the_streams_report_cpython_s_names,
        the_mode_is_write,
        an_empty_write_answers_zero,
        write_rejects_a_non_str,
        the_protocol_predicates_answer,
        isatty_answers_a_bool,
        encoding_and_errors_are_strings,
        flush_answers_none,
        a_reassigned_stdout_still_redirects_print,
        print_exc_writes_to_sys_stderr,
        an_argparse_style_print_message_is_not_swallowed,
    ]
    grail_only = [
        fileno_is_unsupported,
    ]
    for fn in checks:
        print('%-4s %s' % ('OK' if fn() is True else 'FAIL', fn.__name__))
    # These assert a Grail LIMITATION, so CPython is expected to disagree.
    print('--- documented Grail limits: CPython is expected to differ ---')
    for fn in grail_only:
        print('%-5s %s' % ('XPASS' if fn() is True else 'XFAIL', fn.__name__))
