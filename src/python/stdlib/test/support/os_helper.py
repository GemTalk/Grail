# Trimmed test.support.os_helper for Grail.
#
# The curated CPython test modules import only a scratch filename (TESTFN) and
# unlink() from here.  CPython's full os_helper adds unicode/undecodable TESTFN
# variants, Windows retry loops, EnvironmentVarGuard, temp-dir helpers, etc. —
# none of which the vendored set needs, and several of which lean on os
# facilities Grail stubs.  Keep this minimal; grow it as new modules import
# more names (the harness ERROR detail names the missing symbol).

import os

# A scratch filename in the current directory.  os.getpid() keeps concurrent
# sessions from colliding; fall back to a fixed suffix if it is unavailable.
TESTFN_ASCII = "@test"
try:
    TESTFN_ASCII = "{}_{}_tmp".format(TESTFN_ASCII, os.getpid())
except (AttributeError, OSError):
    pass
TESTFN = TESTFN_ASCII


def _unlink(filename):
    os.unlink(filename)


def unlink(filename):
    """Remove ``filename``, ignoring a missing file (matches CPython)."""
    try:
        _unlink(filename)
    except (FileNotFoundError, NotADirectoryError):
        pass


class temp_dir:
    """Context manager yielding a temporary directory path (CPython
    os_helper.temp_dir), written as a plain class -- Grail forbids
    @contextlib.contextmanager.  Creates the dir when ``path'' is None and
    removes it on exit."""

    def __init__(self, path=None, quiet=False):
        self.path = path
        self.quiet = quiet
        self._created = False

    def __enter__(self):
        import tempfile
        if self.path is None:
            self.path = tempfile.mkdtemp()
            self._created = True
        return self.path

    def __exit__(self, *exc):
        if self._created:
            import shutil
            shutil.rmtree(self.path, ignore_errors=True)
        return False
