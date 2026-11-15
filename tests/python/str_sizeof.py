"""Fixture: a str reports its size in CPython's str model.

CPython stores a str in one of three layouts (Objects/unicodeobject.c,
unicode_sizeof_impl), with each character taking 1, 2 or 4 bytes -- the
str's KIND, set by its largest code point -- plus a terminating NUL:

* an ASCII str is a compact PyASCIIObject, 40 bytes then the characters;
* any other exact str is a compact PyCompactUnicodeObject, 56 bytes;
* a subclass instance is a two-block PyUnicodeObject, 64 bytes.

A non-ASCII str also counts a cached UTF-8 copy once one exists, which a fresh
CPython holds only for its one-character Latin-1 singletons: '\\xe9' is 61.
sys.getsizeof answers what __sizeof__ does for an exact str, which is not
GC-tracked.

Grail answered GemStone's physical size, so test_str's test_raiseMemError
self-check -- sys.getsizeof(char * 42) against test.support.calcobjsize of
those structs -- could not hold.  That test then asks for a str of nearly
sys.maxsize characters and expects MemoryError, checked here too.

Every EXPECTED check holds under CPython 3.14, which is what makes it
evidence.
"""

import enum
import struct
import sys

r = {}


def _try(thunk):
    try:
        return ('ok', thunk())
    except BaseException as e:
        return (type(e).__name__, str(e))


class S(str):
    pass


class Colour(enum.StrEnum):
    RED = 'red'


EXACT = ['', 'a', 'a' * 42, '\xe9', 'a\xe9', '\xe9' * 42, '€',
         '€' * 42, '\U0010ffff', '\U0010ffff' * 42, 'ab€\U0001f600',
         'a\ud800', '\udc80' * 3, '\U0001f600\udc80']

r['exact str sizes'] = _try(lambda: [s.__sizeof__() for s in EXACT])
r['getsizeof of an exact str is its __sizeof__'] = _try(
    lambda: [sys.getsizeof(s) == s.__sizeof__() for s in EXACT])
r['str.__sizeof__ called unbound'] = _try(lambda: str.__sizeof__('abc'))
r['a one-character latin-1 str however made'] = _try(
    lambda: [chr(0xe9).__sizeof__(), 'a\xe9'[1].__sizeof__(),
             chr(0x41).__sizeof__(), chr(0x100).__sizeof__()])
r['subclass instance sizes'] = _try(
    lambda: [S(s).__sizeof__() for s in ('', 'ab', '\xe9', '\xe9' * 3,
                                         '€', '\U0010ffff')])
r['a StrEnum member is a subclass instance'] = _try(
    lambda: Colour.RED.__sizeof__())

# test_str's test_raiseMemError, with test.support.calcobjsize spelled out:
# a PyObject header ('nP') plus the struct's fields, padded to a whole 'n'.
ASCII_STRUCT = struct.calcsize('nP' + 'nnb' + '0n')
COMPACT_STRUCT = struct.calcsize('nP' + 'nnbnP' + '0n')
r['calcobjsize of the str structs'] = _try(
    lambda: (ASCII_STRUCT, COMPACT_STRUCT))


def _raise_mem_error_cases():
    out = []
    for char, struct_size, char_size in (('a', ASCII_STRUCT, 1),
                                         ('\xe9', COMPACT_STRUCT, 1),
                                         ('€', COMPACT_STRUCT, 2),
                                         ('\U0010ffff', COMPACT_STRUCT, 4)):
        self_check = (sys.getsizeof(char * 42)
                      == struct_size + char_size * (42 + 1))
        maxlen = (sys.maxsize - struct_size) // char_size
        out.append((self_check, _try(lambda: char * maxlen)))
    return out


r['test_raiseMemError'] = _try(_raise_mem_error_cases)


EXPECTED = {
    # 40 + n + 1 for ASCII; 56 + (n + 1) * kind otherwise; '\xe9' adds its
    # cached UTF-8 copy (2 + 1).
    'exact str sizes': ('ok', [41, 42, 83, 61, 59, 99, 60, 142, 64, 228, 76,
                               62, 64, 68]),
    'getsizeof of an exact str is its __sizeof__': ('ok', [True] * 14),
    'str.__sizeof__ called unbound': ('ok', 44),
    'a one-character latin-1 str however made': ('ok', [61, 61, 42, 60]),
    # 64 + (n + 1) * kind, whatever the characters.
    'subclass instance sizes': ('ok', [65, 67, 66, 68, 68, 72]),
    'a StrEnum member is a subclass instance': ('ok', 68),
    'calcobjsize of the str structs': ('ok', (40, 56)),
    'test_raiseMemError': ('ok', [(True, ('MemoryError', ''))] * 4),
}

KNOWN_DIVERGENCES = {
}

DISAGREEMENTS = sorted(k for k in EXPECTED if r.get(k, '<missing>') != EXPECTED[k])
SUMMARY = '%d checks, %d disagreeing %r, keys match: %s' % (
    len(EXPECTED), len(DISAGREEMENTS), DISAGREEMENTS,
    sorted(r) == sorted(list(EXPECTED) + list(KNOWN_DIVERGENCES)))


if __name__ == '__main__':
    if sys.argv[1:] == ['--emit']:
        for key, value in r.items():
            print('    %r: %r,' % (key, value))
        raise SystemExit
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
