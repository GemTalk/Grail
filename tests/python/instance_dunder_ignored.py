"""Fixture: a protocol dunder stored on an INSTANCE is ignored (#1481).

CPython looks the special methods behind len(), bool(), -o, abs() and the
rest up on the TYPE.  ``o.__len__ = f`` puts f in the instance dict, where
those protocols never look -- although ``o.__len__()``, an ordinary attribute
load, does find it.

Grail used to answer the stored function itself, uncalled, for a unary
protocol send that the class did not define: ``-o`` evaluated to a lambda and
``bool(o)`` raised "__bool__ should return bool".  A class that DID define
the dunder lost to the instance's, because the store installed the same
override machinery that makes ``self.m()`` honour ``o.m = f``.

Everything here is verified against real CPython by running the file
directly.
"""

import operator

r = {}


def record(key, fn):
    try:
        r[key] = fn()
    except Exception as exc:
        r[key] = type(exc).__name__


class Plain:
    pass


def plain_with(name, value):
    o = Plain()
    setattr(o, name, value)
    return o


class Defines:
    def __len__(self):
        return 2

    def __neg__(self):
        return 'type-neg'

    def __bool__(self):
        return True

    def __bytes__(self):
        return b'type'


def defines_with(name, value):
    o = Defines()
    setattr(o, name, value)
    return o


record('bool_with_both', lambda: bool(plain_with('__bool__', lambda: False)))
record('bool_with_len', lambda: bool(plain_with('__len__', lambda: 0)))
record('if_statement', lambda: 'yes' if plain_with('__bool__', lambda: False) else 'no')
record('not_operator', lambda: not plain_with('__bool__', lambda: False))
record('len', lambda: len(plain_with('__len__', lambda: 3)))
record('neg', lambda: -plain_with('__neg__', lambda: 1))
record('pos', lambda: +plain_with('__pos__', lambda: 1))
record('invert', lambda: ~plain_with('__invert__', lambda: 1))
record('abs', lambda: abs(plain_with('__abs__', lambda: 1)))
record('bytes_is_refused', lambda: bytes(plain_with('__bytes__', lambda: b'x')) == b'x')
record('iter', lambda: iter(plain_with('__iter__', lambda: iter([1]))))
record('length_hint', lambda: operator.length_hint(plain_with('__len__', lambda: 7)))
record('class_len_wins', lambda: len(defines_with('__len__', lambda: 9)))
record('class_neg_wins', lambda: -defines_with('__neg__', lambda: 'inst-neg'))
record('class_bool_wins', lambda: bool(defines_with('__bool__', lambda: False)))
record('class_bytes_wins', lambda: bytes(defines_with('__bytes__', lambda: b'inst')))
record('explicit_len_call_finds_it', lambda: defines_with('__len__', lambda: 9).__len__())
record('explicit_neg_call_finds_it', lambda: plain_with('__neg__', lambda: 'inst').__neg__())
record('getattr_finds_it', lambda: getattr(plain_with('__len__', 5), '__len__'))
record('plain_attribute_still_reads', lambda: plain_with('size', 5).size)


EXPECTED = {
    'bool_with_both': True,
    'bool_with_len': True,
    'if_statement': 'yes',
    'not_operator': False,
    'len': 'TypeError',
    'neg': 'TypeError',
    'pos': 'TypeError',
    'invert': 'TypeError',
    'abs': 'TypeError',
    'bytes_is_refused': 'TypeError',
    'iter': 'TypeError',
    'length_hint': 0,
    'class_len_wins': 2,
    'class_neg_wins': 'type-neg',
    'class_bool_wins': True,
    'class_bytes_wins': b'type',
    'explicit_len_call_finds_it': 9,
    'explicit_neg_call_finds_it': 'inst',
    'getattr_finds_it': 5,
    'plain_attribute_still_reads': 5,
}


KEYS = sorted(EXPECTED)


if __name__ == '__main__':
    for key in KEYS:
        actual = r[key]
        print('%-5s %-32s -> %r' % ('OK' if actual == EXPECTED[key] else 'FAIL',
                                    key, actual))
    for extra in sorted(set(r) - set(EXPECTED)):
        print('%-5s %-32s is not in EXPECTED' % ('FAIL', extra))
