# Minimal `pickle` stub for Grail.  CPython's pickle module
# serializes arbitrary Python objects; Grail has no real pickle
# infrastructure and the only Jinja2-side use is bccache computing
# a magic-bytes cache key (``b"j2" + pickle.dumps(bc_version, 2)``)
# at module import time.  Returning a deterministic byte string
# keeps the import path quiet without faking real serialization;
# any caller that tries to load/dump real data hits
# NotImplementedError.

_HIGHEST_PROTOCOL = 5
HIGHEST_PROTOCOL = _HIGHEST_PROTOCOL
DEFAULT_PROTOCOL = 4


class PickleError(Exception):
    pass


class PicklingError(PickleError):
    pass


class UnpicklingError(PickleError):
    pass


def dumps(obj, protocol=None, *, fix_imports=True):
    """Return a deterministic byte string keyed on ``repr(obj)`` —
    enough to participate in Jinja2's bccache magic-bytes computation
    without faking a real pickle stream."""
    return ("__grail_pickle__:" + repr(obj)).encode("utf-8")


def loads(data, *, fix_imports=True, encoding="ASCII", errors="strict"):
    raise NotImplementedError("pickle.loads is not supported under Grail")


def dump(obj, file, protocol=None, *, fix_imports=True):
    file.write(dumps(obj, protocol, fix_imports=fix_imports))


def load(file, *, fix_imports=True, encoding="ASCII", errors="strict"):
    raise NotImplementedError("pickle.load is not supported under Grail")
