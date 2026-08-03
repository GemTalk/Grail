# `marshal` for Grail.
#
# CPython uses marshal to serialize a restricted set of built-in value types
# (and compiled code objects) to a binary form.  Unlike pickle, marshal's wire
# format is EXPLICITLY an implementation detail: the docs state it is not
# portable across Python versions and must not be relied upon for persistent
# or transferred data.  So Grail is free to use its own encoding here, and
# reuses the tagged byte format the bounded `pickle` module already
# implements (see pickle.py) rather than growing a second serializer.
#
# What that buys: `marshal.loads(marshal.dumps(x))` round-trips every value
# type marshal actually supports.  Grail has no bytecode, so code objects
# remain unsupported -- the one thing CPython's marshal is really FOR.
# Jinja2's bccache reaches for that path only when a FileSystemBytecodeCache
# is configured, never on the hot Flask render path.

import pickle

# The types marshal accepts, per the CPython docs.  Anything else raises
# ValueError, matching CPython -- delegating to pickle unchecked would be
# strictly MORE permissive (pickle serializes arbitrary objects through
# __reduce__), and code that probes marshal to decide whether a value is a
# simple constant would then get the wrong answer.
_MARSHALLABLE = (
    type(None), bool, int, float, complex,
    str, bytes, bytearray,
    tuple, list, dict, set, frozenset,
)


def _check(value, _seen=None):
    """Recursively reject anything marshal does not support."""
    if not isinstance(value, _MARSHALLABLE):
        raise ValueError("unmarshallable object")
    # Guard against self-referential containers: marshal has no memo, so a
    # cycle would recurse until the stack gives out.
    if isinstance(value, (tuple, list, set, frozenset, dict)):
        if _seen is None:
            _seen = set()
        if id(value) in _seen:
            raise ValueError("unmarshallable object")
        _seen = _seen | {id(value)}
        if isinstance(value, dict):
            for k, v in value.items():
                _check(k, _seen)
                _check(v, _seen)
        else:
            for item in value:
                _check(item, _seen)


def load(file):
    return loads(file.read())


def loads(data):
    return pickle.loads(data)


def dump(value, file, version=None):
    file.write(dumps(value, version))


def dumps(value, version=None):
    _check(value)
    return pickle.dumps(value)
