"""Fixture: an int reports its size in CPython's int model.

CPython stores an int as a fixed part plus 30-bit digits of 4 bytes each, and
sys.int_info says so.  ``n.__sizeof__()`` is ``int.__basicsize__ +
int.__itemsize__ * ndigits``, with at least one digit, and sys.getsizeof
answers what __sizeof__ does (plus a garbage-collector header only for
GC-tracked objects, which an int is not).

Grail's sys.int_info already gave CPython's numbers, but int.__basicsize__ and
int.__itemsize__ did not exist, n.__sizeof__() answered GemStone's physical
size -- 0 for every small int, which is an immediate -- and sys.getsizeof read
that physical size directly instead of asking __sizeof__
(test_long's test___sizeof__).

Every EXPECTED check holds under CPython 3.14, which is what makes it
evidence.
"""

import sys

r = {}


def _try(thunk):
    try:
        return ('ok', thunk())
    except BaseException as e:
        return (type(e).__name__, str(e))


BASE = 2 ** sys.int_info.bits_per_digit


class MyInt(int):
    pass


r['int_info digits'] = _try(
    lambda: (sys.int_info.bits_per_digit, sys.int_info.sizeof_digit))
r['int layout'] = _try(lambda: (int.__basicsize__, int.__itemsize__))
r['itemsize is sizeof_digit'] = _try(
    lambda: int.__itemsize__ == sys.int_info.sizeof_digit)
r['subclass layout'] = _try(lambda: (MyInt.__basicsize__, MyInt.__itemsize__))
r['layout reads are ints'] = _try(
    lambda: (type(int.__basicsize__).__name__, type(int.__itemsize__).__name__))


def _digits_model(cls):
    values = [0, 1, -1, BASE - 1, 1 - BASE, BASE, -BASE, BASE * BASE - 1,
              BASE * BASE, 2 ** 100, -(2 ** 1000)]
    out = []
    for v in values:
        size = cls(v).__sizeof__()
        out.append((size - cls.__basicsize__) // cls.__itemsize__)
    return out


r['digits counted by __sizeof__'] = _try(lambda: _digits_model(int))
r['digits counted for a subclass'] = _try(lambda: _digits_model(MyInt))
r['getsizeof of an int is its __sizeof__'] = _try(
    lambda: [sys.getsizeof(v) == v.__sizeof__() for v in (0, 7, 2 ** 64, -3)])
r['object.__sizeof__ on an int does not fail'] = _try(
    lambda: type(object.__sizeof__(1)).__name__)


class Sized:
    def __init__(self, n):
        self.n = n

    def __sizeof__(self):
        return self.n


class RaisesTypeError:
    def __sizeof__(self):
        raise TypeError('no size')


r['getsizeof asks __sizeof__'] = _try(lambda: sys.getsizeof(Sized(1000)) >= 1000)
r['a negative __sizeof__'] = _try(lambda: sys.getsizeof(Sized(-1)))
r['a non-int __sizeof__'] = _try(lambda: sys.getsizeof(Sized('x')))
r['a TypeError, no default'] = _try(lambda: sys.getsizeof(RaisesTypeError()))
r['a TypeError, with a default'] = _try(
    lambda: sys.getsizeof(RaisesTypeError(), 7))


EXPECTED = {
    'int_info digits': ('ok', (30, 4)),
    'int layout': ('ok', (24, 4)),
    'itemsize is sizeof_digit': ('ok', True),
    'subclass layout': ('ok', (24, 4)),
    # Read as values, not as methods to call.
    'layout reads are ints': ('ok', ('int', 'int')),
    # 0 is one digit; BASE needs two; 2**100 four; -(2**1000) thirty-four.
    'digits counted by __sizeof__': ('ok', [1, 1, 1, 1, 1, 2, 2, 2, 3, 4, 34]),
    'digits counted for a subclass': ('ok', [1, 1, 1, 1, 1, 2, 2, 2, 3, 4, 34]),
    'getsizeof of an int is its __sizeof__': ('ok', [True, True, True, True]),
    'object.__sizeof__ on an int does not fail': ('ok', 'int'),
    'getsizeof asks __sizeof__': ('ok', True),
    'a negative __sizeof__': ('ValueError', '__sizeof__() should return >= 0'),
    'a non-int __sizeof__': ('TypeError', 'an integer is required'),
    'a TypeError, no default': ('TypeError', 'no size'),
    'a TypeError, with a default': ('ok', 7),
}

KNOWN_DIVERGENCES = {
}

DISAGREEMENTS = sorted(k for k in EXPECTED if r.get(k, '<missing>') != EXPECTED[k])
SUMMARY = '%d checks, %d disagreeing %r, keys match: %s' % (
    len(EXPECTED), len(DISAGREEMENTS), DISAGREEMENTS,
    sorted(r) == sorted(list(EXPECTED) + list(KNOWN_DIVERGENCES)))


if __name__ == '__main__':
    for key in EXPECTED:
        actual = r[key]
        ok = actual == EXPECTED[key]
        print('%-5s %-44s -> %s' % ('OK' if ok else 'FAIL', key,
                                    'as expected' if ok else repr(actual)))
    for key, expected in KNOWN_DIVERGENCES.items():
        actual = r[key]
        print('%-5s %-44s -> %r' % ('OK' if actual == expected else 'XFAIL',
                                    key, actual))
    print(SUMMARY)
