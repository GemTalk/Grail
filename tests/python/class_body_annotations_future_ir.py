"""Fixture: class-body annotations of method-local classes under ``from
__future__ import annotations`` (plan P3.3b).

PEP 563 still applies in 3.14 when the future import is present: a class's
annotations are an EAGER dict of source strings, built with the class, and
there is no annotate function -- nothing in an annotation is ever evaluated,
so an annotation may name anything.  The method-local class helper builds that
dict through IR since P3.3b.  Every expectation is CPython 3.14's, verified by
running this file directly.

* ``strings``: each annotation is its unparsed source, values are stored.
* ``never_evaluated``: an annotation that would raise, or call something,
  does neither.
* ``no_annotate``: ``__annotate__`` is None.
* ``slots``: ``__slots__`` beside string annotations.
"""

from __future__ import annotations

r = {}

calls = []


def note(v):
    calls.append(v)
    return v


def strings():
    class C:
        x: int
        y: list[str] | None = None
        z: 'quoted'
    return C.__annotations__, C.y, 'x' in C.__dict__


def never_evaluated():
    class C:
        a: no_such_name
        b: note('b') = 1
    return C.__annotations__, list(calls), C.b


def no_annotate():
    class C:
        x: int
    return C.__annotate__


def slots():
    class S:
        __slots__ = ('a',)
        a: int
    s = S()
    s.a = 1
    return S.__slots__, s.a, S.__annotations__


r['strings'] = strings()
r['never_evaluated'] = never_evaluated()
r['no_annotate'] = no_annotate()
r['slots'] = slots()


EXPECTED = {
    'strings': ({'x': 'int', 'y': 'list[str] | None', 'z': "'quoted'"},
                None, False),
    'never_evaluated': ({'a': 'no_such_name', 'b': "note('b')"}, [], 1),
    'no_annotate': None,
    'slots': (('a',), 1, {'a': 'int'}),
}


KEYS = sorted(EXPECTED)


if __name__ == '__main__':
    for key in KEYS:
        print('%-5s %-24s -> %r' % ('OK' if r[key] == EXPECTED[key] else 'FAIL', key, r[key]))
    for extra in sorted(set(r) - set(EXPECTED)):
        print('%-5s %-24s is not in EXPECTED' % ('FAIL', extra))
