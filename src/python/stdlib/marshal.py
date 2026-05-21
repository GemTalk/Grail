# Minimal `marshal` stub for Grail.  CPython uses marshal to
# serialize compiled code objects to / from disk; Grail has no
# bytecode, so the load/dump pair raises NotImplementedError if
# anything actually tries to use it (Jinja2's bccache reaches for
# this only when a FileSystemBytecodeCache is configured — never on
# the hot Flask render path).


def load(file):
    raise NotImplementedError("marshal.load is not supported under Grail")


def loads(data):
    raise NotImplementedError("marshal.loads is not supported under Grail")


def dump(value, file, version=None):
    raise NotImplementedError("marshal.dump is not supported under Grail")


def dumps(value, version=None):
    raise NotImplementedError("marshal.dumps is not supported under Grail")
