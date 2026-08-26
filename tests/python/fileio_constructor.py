"""``io.FileIO(name, mode)'' -- constructing one, and SUBCLASSING it.

Driven by PythonTests>>FileIOConstructorTestCase.  Each check answers True when
the behaviour matches CPython, so a failure names the specific rule.

FileIO had NO Python-visible constructor.  Grail reaches file objects through
``open()'', which routes to FileIO's ___open___ class method, and nothing ever
called ``io.FileIO(...)'' directly -- so the class that open() returns could not
be instantiated by name.

The interesting part is HOW that failed, because the two halves failed
differently:

    io.FileIO(p, 'rb')                  -> TypeError: FileIO() takes wrong
                                           number of arguments
    class Sub(io.FileIO): pass
    Sub(p, 'rb')                        -> an UNINITIALISED instance, no error

The base class raised, because no constructor matched.  The SUBCLASS silently
succeeded, because the general class-construction path allocates and then asks
___pyBuiltinSubclassInit___ to initialise from the built-in base -- and that knew
about list, set, frozenset and complex, not FileIO.  So the GsFile and the
readable/writable/closed bookkeeping were never written, and the failure surfaced
far away as ``nil does not understand #close'': a Smalltalk error naming neither
the class nor the missing initialisation.

A missing constructor is louder on the class that lacks it than on the class that
inherits it.  That is the general lesson, and it is why the subclass checks below
sit beside the base-class ones.

This is what blocked 20 of test_wave's 25 errors: CPython's audiotests.py builds
``class UnseekableIO(io.FileIO)'' overriding tell/seek to raise, to prove that
wave can read and write a stream it cannot seek.

TextIOWrapper is deliberately NOT covered.  It is a FileIO subclass in Grail, but
its Python constructor takes an already-open BUFFER rather than a path, so it is
excluded from the subclass initialisation and still has no constructor of its own
-- a separate gap, not one to guess at from here.

Run this file under CPython (``python3 tests/python/fileio_constructor.py'') to
see what it produces -- that is where the expectations come from.
"""

import io
import os

DATA = b'hello world'

# A PER-GEM directory, not a fixed /tmp path.  Several checkouts run against one
# stone on the dev host as separate users, so a shared absolute fixture path is a
# real collision even though their Smalltalk is fully isolated -- and none of it
# reproduces when a suite runs alone.
#
# Keyed on the PID rather than tempfile.mkdtemp(), which is what os_walk.py and
# the other migrated fixtures use.  Those do their work at import and rmdir the
# directory when they finish; the functions BELOW are called by Smalltalk after
# the import returns, so there is no point at which this module could clean up,
# and a fresh mkdtemp on every reload would leave one directory per test method.
# A pid-keyed name is stable across reloads in one gem -- so exactly one
# directory per gem -- while still being distinct between concurrent gems.
_DIR = '/tmp/grail_fileio_%d' % os.getpid()
try:
    os.mkdir(_DIR)
except OSError:
    pass  # already there from an earlier reload in this same gem
PATH = _DIR + '/data'
WPATH = _DIR + '/write'


class Unseekable(io.FileIO):
    """CPython's own audiotests.py shape, minus the wave parts."""

    def tell(self):
        raise io.UnsupportedOperation

    def seek(self, *args, **kwargs):
        raise io.UnsupportedOperation


def _prepare():
    with open(PATH, 'wb') as f:
        f.write(DATA)


def the_default_mode_is_binary_read():
    """CPython's FileIO defaults to mode 'r' and REPORTS it as 'rb': FileIO is a
    raw byte stream, so the 'b' is implied and shown."""
    _prepare()
    f = io.FileIO(PATH)
    try:
        return f.mode == 'rb' and f.readable() and not f.writable()
    finally:
        f.close()


def a_mode_is_reported_normalised():
    """'b' present, '+' last -- 'r' reads back as 'rb', 'r+' as 'rb+'.

    Note this differs from open(), which reports the mode the caller PASSED
    (``open(p).mode'' is 'r' in CPython too).  FileIO is the one that
    normalises, so the two must not be made to agree."""
    _prepare()
    got = {}
    for mode in ('r', 'rb', 'w', 'wb', 'r+'):
        path = PATH if mode.startswith('r') else WPATH
        f = io.FileIO(path, mode)
        try:
            got[mode] = f.mode
        finally:
            f.close()
    return got == {'r': 'rb', 'rb': 'rb', 'w': 'wb', 'wb': 'wb', 'r+': 'rb+'}


def a_text_mode_is_rejected():
    """``io.FileIO(p, 'rt')'' is a ValueError: text decoding is TextIOWrapper's
    job, and FileIO must not silently accept a mode it cannot honour."""
    _prepare()
    try:
        io.FileIO(PATH, 'rt')
    except ValueError:
        return True
    except Exception as e:
        return 'raised %s, wanted ValueError' % type(e).__name__
    return 'no error'


def readable_and_writable_follow_the_mode():
    _prepare()
    r = io.FileIO(PATH, 'rb')
    w = io.FileIO(WPATH, 'wb')
    try:
        return (r.readable() and not r.writable()
                and w.writable() and not w.readable())
    finally:
        r.close()
        w.close()


def it_reads_what_open_wrote():
    _prepare()
    f = io.FileIO(PATH, 'rb')
    try:
        return f.read(5) == b'hello'
    finally:
        f.close()


def it_works_as_a_context_manager():
    _prepare()
    with io.FileIO(PATH, 'rb') as f:
        return f.read() == DATA


def the_mode_keyword_is_accepted():
    """``io.FileIO(p, mode='rb')'' -- the same call arriving as a keyword."""
    _prepare()
    f = io.FileIO(PATH, mode='rb')
    try:
        return f.mode == 'rb'
    finally:
        f.close()


def a_missing_name_is_a_typeerror():
    try:
        io.FileIO()
    except TypeError:
        return True
    except Exception as e:
        return 'raised %s, wanted TypeError' % type(e).__name__
    return 'no error'


# ------------------------------------------------------------------ subclassing
def a_subclass_constructs():
    """The check that was silently answering an uninitialised object."""
    _prepare()
    t = Unseekable(PATH, 'rb')
    try:
        return type(t) is Unseekable and t.mode == 'rb'
    finally:
        t.close()


def a_subclass_reads():
    _prepare()
    t = Unseekable(PATH, 'rb')
    try:
        return t.read(5) == b'hello'
    finally:
        t.close()


def a_subclass_closes():
    """``close'' is where the uninitialised instance used to blow up, with a
    Smalltalk ``nil does not understand #close'' rather than a Python error."""
    _prepare()
    t = Unseekable(PATH, 'rb')
    t.close()
    return t.closed is True


def a_subclass_works_as_a_context_manager():
    _prepare()
    with Unseekable(PATH, 'rb') as t:
        return t.read() == DATA


def a_subclass_override_wins():
    """The reason test_wave subclasses at all: the override must be what runs.

    An inherited-but-uninitialised instance could not get this far, so this also
    pins that the subclass's methods -- not FileIO's -- are the ones dispatched
    after the base's constructor ran."""
    _prepare()
    t = Unseekable(PATH, 'rb')
    try:
        try:
            t.tell()
            return 'tell did not raise'
        except io.UnsupportedOperation:
            return True
    finally:
        t.close()


def a_subclass_writes():
    _prepare()
    with Unseekable(WPATH, 'wb') as t:
        t.write(b'abc')
    with open(WPATH, 'rb') as f:
        return f.read() == b'abc'


def _cleanup():
    for p in (PATH, WPATH):
        try:
            os.remove(p)
        except OSError:
            pass


# scripts/check_python_fixtures.sh runs this under CPython in CI.
if __name__ == '__main__':
    checks = [
        the_default_mode_is_binary_read,
        a_mode_is_reported_normalised,
        a_text_mode_is_rejected,
        readable_and_writable_follow_the_mode,
        it_reads_what_open_wrote,
        it_works_as_a_context_manager,
        the_mode_keyword_is_accepted,
        a_missing_name_is_a_typeerror,
        a_subclass_constructs,
        a_subclass_reads,
        a_subclass_closes,
        a_subclass_works_as_a_context_manager,
        a_subclass_override_wins,
        a_subclass_writes,
    ]
    for fn in checks:
        print('%-4s %s' % ('OK' if fn() is True else 'FAIL', fn.__name__))
    _cleanup()
