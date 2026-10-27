"""Fixture for BuiltClassRebuildTestCase (#1802): revision 2 of v1.py.  Pair
gains a field with a default; everything else is as it was, so the rebuild
reuses every class v1 built at module scope, Pair's included.
"""
import collections
import typing

Pair = collections.namedtuple('Pair', 'left right extra', defaults=[None])


class Span(collections.namedtuple('Span', 'lo hi')):
    def width(self):
        return self.hi - self.lo


class TP(typing.NamedTuple):
    a: int
    b: str = 'x'


def _kind(self):
    return 'k'


Built = type('Built', (object,), {'kind': _kind})

Dup1 = collections.namedtuple('Dup', 'a')
Dup2 = collections.namedtuple('Dup', 'b')


def later():
    return collections.namedtuple('Later', 'z')


VERSION = 2
