# Minimal `tempfile` for Grail.  Jinja2's FileSystemBytecodeCache was the
# original consumer, reachable on the Flask render path; most of the surface
# still raises NotImplementedError.  mkdtemp IS real -- `os` gives us
# mkdir/rmdir/getpid, and CPython's own test suite reaches for it constantly
# (test.support.os_helper.temp_dir), so refusing it bought nothing.
# Expand the rest as downstream packages actually need it.

import os


def gettempdir():
    return "/tmp"


def gettempprefix():
    return "tmp"


_name_counter = [0]


def _next_candidate(prefix, suffix):
    """A per-gem-unique directory name.

    No `random` here: uniqueness comes from the OS pid (distinct per gem, so
    concurrent sessions cannot collide) plus a monotonic in-process counter.
    mkdtemp's O_EXCL-equivalent -- os.mkdir failing when the name exists --
    is what actually guarantees exclusivity; this only has to make collisions
    rare enough that the retry loop terminates."""
    _name_counter[0] += 1
    return "%s%d_%d%s" % (prefix, os.getpid(), _name_counter[0], suffix)


def mkdtemp(suffix=None, prefix=None, dir=None):
    """Create a uniquely-named directory and return its absolute path.

    A real implementation, not the previous NotImplementedError stub: `os`
    provides mkdir/rmdir, so there is no reason for the caller to be refused.
    The caller owns the directory and is responsible for removing it, exactly
    as in CPython."""
    if suffix is None:
        suffix = ""
    if prefix is None:
        prefix = gettempprefix()
    if dir is None:
        dir = gettempdir()

    last = None
    for _attempt in range(100):
        path = dir + "/" + _next_candidate(prefix, suffix)
        try:
            # 0o700: CPython creates the directory private to its owner.
            os.mkdir(path, 0o700)
            return path
        except OSError as exc:
            # Name taken (or a transient failure) -- try the next candidate.
            last = exc
    raise FileExistsError(
        "tempfile.mkdtemp: no unique name found in %r after 100 attempts (%s)"
        % (dir, last))


def mkstemp(suffix=None, prefix=None, dir=None, text=False):
    raise NotImplementedError("tempfile.mkstemp is not supported under Grail")


def NamedTemporaryFile(*args, **kwargs):
    raise NotImplementedError(
        "tempfile.NamedTemporaryFile is not supported under Grail"
    )


def TemporaryFile(*args, **kwargs):
    raise NotImplementedError(
        "tempfile.TemporaryFile is not supported under Grail"
    )


class SpooledTemporaryFile:
    """Stub class — exposed so werkzeug.formparser's ``try: from
    tempfile import SpooledTemporaryFile'' resolves the name.  Real
    file-backed spooling is not supported under Grail.  Constructing
    raises NotImplementedError so callers that try to actually use
    it see the same fail loudly as TemporaryFile."""

    def __init__(self, max_size=0, mode='w+b', buffering=-1,
                 encoding=None, newline=None, suffix=None, prefix=None,
                 dir=None, errors=None):
        raise NotImplementedError(
            "tempfile.SpooledTemporaryFile is not supported under Grail"
        )


class TemporaryDirectory:
    """CPython's ``tempfile.TemporaryDirectory``, on top of mkdtemp.

    Deliberately a real implementation rather than the NotImplementedError stub
    the rest of this module's file-backed types get: nothing here needs a
    temporary FILE, only a temporary DIRECTORY, and mkdtemp already provides
    that.  ``test.test_traceback``'s TestKeywordTypoSuggestions is one caller --
    it wants a scratch directory to write a script into -- and
    ``test.support.os_helper.temp_dir`` reaches for the same shape.

    ``shutil`` is imported lazily, inside cleanup(), and not at module scope: a
    module-level import would make every ``import tempfile'' pull in shutil (and
    through it stat + collections) for a class most callers never construct.
    shutil imports os, not tempfile, so there is no cycle either way -- this is
    about import cost, not correctness.

    ``delete=False`` (3.12+) keeps the directory after the with-block, for a
    caller that wants to inspect it; ``ignore_cleanup_errors`` swallows an OSError
    from the removal, which is CPython's escape hatch for a directory whose
    contents another process is holding open."""

    def __init__(self, suffix=None, prefix=None, dir=None,
                 ignore_cleanup_errors=False, *, delete=True):
        self.name = mkdtemp(suffix, prefix, dir)
        self._ignore_cleanup_errors = ignore_cleanup_errors
        self._delete = delete
        self._finalized = False

    def __repr__(self):
        return "<%s %r>" % (type(self).__name__, self.name)

    def __enter__(self):
        return self.name

    def __exit__(self, exc, value, tb):
        if self._delete:
            self.cleanup()

    def cleanup(self):
        """Remove the directory tree.  Idempotent, as CPython's is: the
        with-block calls it on exit and a caller may call it again."""
        if self._finalized:
            return
        self._finalized = True
        import shutil
        try:
            shutil.rmtree(self.name)
        except OSError:
            if not self._ignore_cleanup_errors:
                raise
