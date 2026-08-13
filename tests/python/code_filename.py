# Fixture for TracebackTestCase's co_filename / linecache / FrameSummary tests.
#
# co_filename used to be the '<grail>' placeholder for every code object, so
# linecache could never find a module's source and traceback.FrameSummary.line
# was always None.  Each def shape below has its OWN PyCode emit site in
# codegen, which is why all three are checked.

import linecache
import os
import traceback

_THIS_FILE = None                      # set at the bottom, from a code object


def module_level_filename():
    """A module top-level def -- compiles to a real Smalltalk method, stamped
    by importlib's top-level-def pass."""
    return module_level_filename.__code__.co_filename


class Holder:
    def meth(self):
        return 1                       # line 23


def class_body_filename():
    """A class-body def -- stamped by ClassDefAst's ___methodCodeTable___."""
    return Holder.meth.__code__.co_filename


def nested_def_filename():
    """A nested def -- compiles to an ExecBlock, stamped by the def-time
    ___pyCode___ cascade."""
    def inner():
        return 2
    return inner.__code__.co_filename


def linecache_reads_own_source():
    """linecache must find THIS file through a code object's co_filename, and
    read back the exact source line.  Line 23 is Holder.meth's ``return 1``."""
    path = Holder.meth.__code__.co_filename
    line = linecache.getline(path, 23)
    if not line:
        return False
    return line.strip() == "return 1                       # line 23"


def frame_summary_has_source_line():
    """A real traceback's FrameSummary carries the SOURCE TEXT of its line,
    read lazily from linecache."""
    def raiser():
        raise ValueError("fixture")

    try:
        raiser()
    except ValueError as e:
        frames = traceback.extract_tb(e.__traceback__)
        if not frames:
            return False
        f = frames[0]
        return (f.filename == Holder.meth.__code__.co_filename
                and isinstance(f.line, str)
                and f.line != ""
                and f.lineno is not None)
    return False


def lookup_line_is_honoured():
    """lookup_line=False defers the linecache read; the default resolves it.
    locals= captures repr()s rather than the live objects.

    The cache slot is ``_lines'', which is what CPython 3.14 calls it.  This
    check used to read ``_line'' -- Grail's own name for it -- and so RAISED
    AttributeError under real CPython rather than merely disagreeing.  One more
    fixture that had never been run there."""
    path = Holder.meth.__code__.co_filename

    deferred = traceback.FrameSummary(path, 23, "meth", lookup_line=False)
    if deferred._lines is not None:
        return False                   # must not have looked it up yet
    if deferred.line.strip() != "return 1                       # line 23":
        return False                   # ...but reading .line resolves it

    eager = traceback.FrameSummary(path, 23, "meth")
    if eager._lines is None:
        return False                   # default resolves in __init__

    withlocals = traceback.FrameSummary(path, 23, "meth", locals={"a": 1})
    return withlocals.locals == {"a": "1"}


def stat_result_fields():
    """os.stat answers CPython's st_* names, and the values are sane."""
    st = os.stat(Holder.meth.__code__.co_filename)
    return (st.st_size > 0
            and st.st_mtime > 0
            and st.st_mode > 0
            and st.st_mtime_ns == st.st_mtime * 1000000000)


_THIS_FILE = module_level_filename()
