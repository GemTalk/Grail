"""Fixture for BuiltClassRebuildTestCase (#1802): revision 1 of a module whose
classes are built by CALLING something -- collections.namedtuple, a class
statement over one, typing.NamedTuple (whose metaclass returns a namedtuple)
and a direct type() -- rather than only by class statements.

The test loads this, rewrites the file to v2.py and loads it again: a rebuild of
the same module, which must hand back the same class objects.
"""
import collections
import typing

Pair = collections.namedtuple('Pair', 'left right')


class Span(collections.namedtuple('Span', 'lo hi')):
    def width(self):
        return self.hi - self.lo


class TP(typing.NamedTuple):
    a: int
    b: str = 'x'


def _kind(self):
    return 'k'


Built = type('Built', (object,), {'kind': _kind})

# Two namedtuples with ONE name: two classes, as in CPython.  Only the first
# keeps its identity across a rebuild; the second is new every time.
Dup1 = collections.namedtuple('Dup', 'a')
Dup2 = collections.namedtuple('Dup', 'b')


def later():
    """A namedtuple built at RUN time, after the import: new on every call."""
    return collections.namedtuple('Later', 'z')


VERSION = 1
