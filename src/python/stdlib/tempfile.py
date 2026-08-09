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
