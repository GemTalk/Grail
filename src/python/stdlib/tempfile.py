# Minimal `tempfile` stub for Grail.  Jinja2's FileSystemBytecodeCache
# is the only consumer reachable on the Flask render path; the gem
# has no /tmp story today, so we return a path and raise on real
# file creation.  Expand the surface only if a downstream package
# starts using tempfile for real.


def gettempdir():
    return "/tmp"


def gettempprefix():
    return "tmp"


def mkdtemp(suffix=None, prefix=None, dir=None):
    raise NotImplementedError("tempfile.mkdtemp is not supported under Grail")


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
