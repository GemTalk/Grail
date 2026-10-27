"""Fixture: types.get_original_bases answers a class's bases before __mro_entries__ ran.

CPython's types module (Lib/types.py:161) has get_original_bases: the
``__orig_bases__`` the class statement recorded when a base's
``__mro_entries__`` replaced it -- ``Generic[T]``, ``list[int]``,
``NamedTuple`` -- and ``__bases__`` otherwise, read from the class's OWN
``__dict__`` so a subclass does not inherit its parent's.  Grail's types
module had no such function, and a class whose SOLE base was a
types.GenericAlias (``class E(list[T])``) recorded no ``__orig_bases__`` at
all, so the answer would have been ``(list,)``.

Every check here holds under CPython 3.14, which is what makes it evidence.
"""

import types
import typing

T = typing.TypeVar('T')
r = {}


class A: pass
class B(typing.Generic[T]): pass
class C(B[int]): pass
class D(B[str], float): pass
class E(list[T]): pass
class FirstBase(typing.Generic[T]): pass
class First(FirstBase[int]): pass
class G(First, A): pass


r['classes'] = [types.get_original_bases(c) for c in (A, B, C, D, E, G, int)]
r['generic_syntax'] = types.get_original_bases(type('Spare', (), {}))


class Named(typing.NamedTuple):
    x: int


Called = typing.NamedTuple('Called', [('x', int)])


class Dicty(typing.TypedDict):
    x: int


r['special_forms'] = [types.get_original_bases(Named)[0] is typing.NamedTuple,
                      types.get_original_bases(Called)[0] is typing.NamedTuple,
                      types.get_original_bases(Dicty)[0] is typing.TypedDict]


def refusal(argument):
    try:
        types.get_original_bases(argument)
        return 'no error'
    except TypeError as e:
        return str(e)


r['refusals'] = [refusal(object()), refusal(3)]

EXPECTED = {
    'classes': [(object,), (typing.Generic[T],), (B[int],), (B[str], float), (list[T],),
                (First, A), (object,)],
    'generic_syntax': (object,),
    'special_forms': [True, True, True],
    'refusals': ["Expected an instance of type, not 'object'",
                 "Expected an instance of type, not 'int'"],
}

DISAGREEMENTS = sorted(k for k in EXPECTED if r.get(k, '<missing>') != EXPECTED[k])
SUMMARY = '%d checks, %d disagreeing %r, keys match: %s' % (
    len(EXPECTED), len(DISAGREEMENTS), DISAGREEMENTS, sorted(r) == sorted(EXPECTED))


if __name__ == '__main__':
    for key in EXPECTED:
        actual = r[key]
        print('%-5s %-16s -> %r' % ('OK' if actual == EXPECTED[key] else 'FAIL', key, actual))
    print(SUMMARY)
