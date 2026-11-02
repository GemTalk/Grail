"""Fixture: io.UnsupportedOperation is an OSError and a ValueError.

CPython builds it with both bases (Modules/_io/_iomodule.c:659), so code that
refuses an operation a stream does not support can be caught either way:
``except ValueError`` is how test_fileio expects a read from a file opened
for writing to be refused.  Grail's is a Smalltalk class, whose one superclass
is OSError, and nothing registered the second: ``except ValueError`` let it
through, issubclass said no, and __mro__ and __bases__ left ValueError out.
CPython also gives it the module io, so it reprs as io.UnsupportedOperation.

Every check here holds under CPython 3.14, which is what makes it evidence.
"""

import io
import _io
import _pyio

r = {}


def names(classes):
    return [each.__name__ for each in classes]


def caught_as(exception_class, thunk):
    try:
        thunk()
    except exception_class as e:
        return type(e).__name__
    return 'not raised'


def raise_one():
    raise io.UnsupportedOperation('not here')


class Refusal(io.UnsupportedOperation):
    pass


def raise_a_subclass():
    raise Refusal('not here either')


r['mro'] = names(io.UnsupportedOperation.__mro__)
r['bases'] = names(io.UnsupportedOperation.__bases__)
r['issubclass'] = [issubclass(io.UnsupportedOperation, OSError), issubclass(io.UnsupportedOperation, ValueError)]
r['isinstance'] = [isinstance(io.UnsupportedOperation('x'), OSError), isinstance(io.UnsupportedOperation('x'), ValueError)]
r['caught_as_value_error'] = caught_as(ValueError, raise_one)
r['caught_as_os_error'] = caught_as(OSError, raise_one)
r['caught_when_pyio_raises_it'] = caught_as(ValueError, lambda: _pyio.BytesIO().fileno())
r['a_subclass_mro'] = names(Refusal.__mro__)
r['a_subclass_caught_as_value_error'] = caught_as(ValueError, raise_a_subclass)
r['module_and_repr'] = [io.UnsupportedOperation.__module__, repr(io.UnsupportedOperation)]
r['one_class'] = _io.UnsupportedOperation is io.UnsupportedOperation is _pyio.UnsupportedOperation

EXPECTED = {
    'mro': ['UnsupportedOperation', 'OSError', 'ValueError', 'Exception', 'BaseException', 'object'],
    'bases': ['OSError', 'ValueError'],
    'issubclass': [True, True],
    'isinstance': [True, True],
    'caught_as_value_error': 'UnsupportedOperation',
    'caught_as_os_error': 'UnsupportedOperation',
    'caught_when_pyio_raises_it': 'UnsupportedOperation',
    'a_subclass_mro': ['Refusal', 'UnsupportedOperation', 'OSError', 'ValueError', 'Exception', 'BaseException', 'object'],
    'a_subclass_caught_as_value_error': 'Refusal',
    'module_and_repr': ['io', "<class 'io.UnsupportedOperation'>"],
    'one_class': True,
}

DISAGREEMENTS = sorted(k for k in EXPECTED if r.get(k, '<missing>') != EXPECTED[k])
SUMMARY = '%d checks, %d disagreeing %r, keys match: %s' % (
    len(EXPECTED), len(DISAGREEMENTS), DISAGREEMENTS, sorted(r) == sorted(EXPECTED))


if __name__ == '__main__':
    for key in EXPECTED:
        actual = r.get(key, '<missing>')
        print('%-5s %-34s -> %r' % ('OK' if actual == EXPECTED[key] else 'FAIL', key, actual))
    print(SUMMARY)
