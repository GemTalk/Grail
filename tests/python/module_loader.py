"""Fixtures for a module's __loader__ and the linecache lazy-lookup path.

Driven by PythonTests>>TracebackTestCase.  Each function answers True when the
behaviour matches CPython, so a failure names the specific rule.

Line 6 of this file is the blank line above; ``import linecache`` is line 12 --
referenced by lazycache_resolves_through_the_loader below, which is why these
imports must stay put.
"""

import collections
import linecache
import traceback


def module_has_a_loader():
    """Every module gets a __loader__, as CPython's import system guarantees."""
    g = globals()
    if '__loader__' not in g:
        return False
    loader = g['__loader__']
    return (loader is not None
            and loader.name == 'module_loader'
            and loader.path == g['__file__']
            and loader.path.endswith('/tests/python/module_loader.py'))


def loader_answers_the_modules_source():
    """get_source(name) answers the text on disk, and it really is THIS file."""
    loader = globals()['__loader__']
    src = loader.get_source('module_loader')
    if not isinstance(src, str):
        return False
    return ('def loader_answers_the_modules_source():' in src
            and src.startswith('"""Fixtures for a module'))


def loader_reports_filename_and_package():
    loader = globals()['__loader__']
    return (loader.get_filename('module_loader') == globals()['__file__']
            and loader.is_package('module_loader') is False)


def loader_rejects_a_foreign_name():
    """CPython raises ImportError when a loader is handed a module it does not
    load.  linecache relies on that being an ImportError specifically -- it
    catches (ImportError, OSError) and falls through to its next strategy."""
    loader = globals()['__loader__']
    try:
        loader.get_source('some.other.module')
        return False
    except ImportError:
        pass
    # A missing / omitted name means "whatever you load", which every CPython
    # loader tolerates.
    return isinstance(loader.get_source(None), str)


def lazycache_resolves_through_the_loader():
    """The point of the loader: linecache resolves a filename that is NOT on
    disk through the calling module's loader, so the caller's own source comes
    back under that key.  This is how a traceback shows source for a frame
    whose co_filename does not name a readable file."""
    linecache.clearcache()
    lines = linecache.updatecache('/no/such/file.py', globals())
    if not lines:
        return False
    # Line 12 of this file is ``import linecache`` (see the module docstring).
    if lines[11].rstrip('\n') != 'import linecache':
        return False
    return linecache.getline('/no/such/file.py', 12).rstrip('\n') == 'import linecache'


def lazycache_without_globals_finds_nothing():
    """No module_globals means no loader to ask, so the lookup stays empty --
    it must not fall back to anything surprising."""
    linecache.clearcache()
    return (linecache.updatecache('/no/such/file.py') == []
            and linecache.getline('/no/such/file.py', 1) == '')


# A traceback duck-typed the way CPython's own test suite does it: only the
# three documented attributes plus tb_lasti, with the PEP 657 positions coming
# off the code object's co_positions().
_code = collections.namedtuple('code', ['co_filename', 'co_name'])
_code.co_positions = lambda _: iter([(12, 12, 4, 9)])
_frame = collections.namedtuple('frame', ['f_code', 'f_globals', 'f_locals'])
_tb = collections.namedtuple('tb', ['tb_frame', 'tb_lineno', 'tb_next', 'tb_lasti'])


def _fake_tb(f_locals=None):
    path = globals()['__file__']
    return _tb(_frame(_code(path, 'method'), globals(), f_locals), 12, None, 0)


def extract_tb_accepts_a_duck_typed_traceback():
    """extract_tb must not require Grail's own tb_line / tb_colno extras: they
    are a shortcut for the common case, not part of the traceback protocol.
    Requiring them made extract_tb raise AttributeError, which
    TracebackException swallowed into an EMPTY stack -- so the caller got an
    IndexError from stack[0] with nothing to say why."""
    stack = traceback.extract_tb(_fake_tb())
    if len(stack) != 1:
        return False
    frame = stack[0]
    return (frame.name == 'method'
            and frame.lineno == 12
            and frame.line == 'import linecache'
            # Columns come from co_positions(), keyed by tb_lasti.
            and frame.colno == 4
            and frame.end_colno == 9
            and frame.end_lineno == 12)


def lookup_lines_false_defers_the_linecache_read():
    """CPython's contract: with lookup_lines=False the cache is untouched
    until something asks for .line."""
    linecache.clearcache()
    exc = traceback.TracebackException(Exception, Exception('uh oh'),
                                       _fake_tb(), lookup_lines=False)
    if linecache.cache != {}:
        return False
    # Reading .line resolves it now.
    return exc.stack[0].line == 'import linecache'


def capture_locals_snapshots_reprs():
    """capture_locals stores repr()s -- not the live objects, so a traceback
    cannot keep a frame's locals alive -- and a local whose repr() raises
    renders as a placeholder instead of escaping."""
    class Unrepresentable:
        def __repr__(self):
            raise ValueError('bad value')

    tb = _fake_tb({'something': 1, 'other': 'string',
                   'unrepresentable': Unrepresentable()})
    exc = traceback.TracebackException(Exception, Exception('uh oh'), tb,
                                       capture_locals=True)
    if exc.stack[0].locals != {'something': '1', 'other': "'string'",
                               'unrepresentable': '<local repr() failed>'}:
        return False

    # Default is None, not an empty dict -- callers test ``is None''.
    plain = traceback.TracebackException(Exception, Exception('uh oh'),
                                         _fake_tb({'something': 1}))
    return plain.stack[0].locals is None
