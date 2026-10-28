"""Fixture: built-in types and functions refuse keywords as CPython's do, however they are called.

CPython binds a built-in's arguments in one order (Python/getargs.c
_PyArg_UnpackKeywords): too many in all, a required one missing, one given
both ways, then a keyword the signature does not name -- and one that takes no
keyword says so before it counts anything.  Grail disagreed in several ways:

* ``int`` called through a name DROPPED a stray keyword: ``int(bogus=1)``
  answered 0 (test_descr test_keywords);
* ``mappingproxy(mapping=d)`` and ``memoryview(object=b)`` were refused,
  where the parameter is nameable;
* bytearray's refusals spoke of ``bytes()``, and super's of ``Super()``;
* a builtin or a native method that takes no keyword reported an argument
  count, or ``no matching method``.

Every check here holds under CPython 3.14, which is what makes it evidence.
"""

import types

r = {}


def refusal(call):
    try:
        call()
    except TypeError as exc:
        return str(exc)
    return 'no TypeError'


constructor, proxy, function = int, types.MappingProxyType, len
r['int'] = [
    refusal(lambda: constructor(bogus=1)),
    refusal(lambda: int(x=1)),
    refusal(lambda: int('1', x=1)),
    refusal(lambda: int('1', 2, base=2)),
    refusal(lambda: int(base=2)),
    refusal(lambda: int.__new__(int, 1, 2, 3)),
    int('101', base=2),
    constructor('ff', base=16),
]
r['nameable_parameter'] = [
    proxy(mapping={'a': 1})['a'],
    refusal(lambda: proxy(bogus=1)),
    refusal(lambda: proxy({}, bogus=1)),
    memoryview(object=b'ab').tobytes(),
    refusal(lambda: memoryview(bogus=1)),
]
r['named_after_the_type'] = [
    refusal(lambda: bytearray(bogus=1)),
    refusal(lambda: bytes(bogus=1)),
    refusal(lambda: bytearray(b'a', 'ascii', 'strict', 'x')),
    refusal(lambda: bytes(b'a', source=b'b')),
    refusal(lambda: super(bogus=1)),
    bytearray(source=b'a'),
    bytes('a', encoding='ascii'),
]
r['takes_no_keyword'] = [
    refusal(lambda: len(obj=[1])),
    refusal(lambda: function(obj=[1])),
    refusal(lambda: isinstance(1, int, x=1)),
    refusal(lambda: reversed(seq=[1])),
    refusal(lambda: [].append(x=1)),
    refusal(lambda: {}.get(1, x=1)),
]

EXPECTED = {
    'int': [
        "int() got an unexpected keyword argument 'bogus'",
        "int() got an unexpected keyword argument 'x'",
        "int() got an unexpected keyword argument 'x'",
        'int() takes at most 2 arguments (3 given)',
        'int() missing string argument',
        'int() takes at most 2 arguments (3 given)',
        5,
        255,
    ],
    'nameable_parameter': [
        1,
        "mappingproxy() missing required argument 'mapping' (pos 1)",
        'mappingproxy() takes at most 1 argument (2 given)',
        b'ab',
        "memoryview() missing required argument 'object' (pos 1)",
    ],
    'named_after_the_type': [
        "bytearray() got an unexpected keyword argument 'bogus'",
        "bytes() got an unexpected keyword argument 'bogus'",
        'bytearray() takes at most 3 arguments (4 given)',
        "argument for bytes() given by name ('source') and position (1)",
        'super() takes no keyword arguments',
        bytearray(b'a'),
        b'a',
    ],
    'takes_no_keyword': [
        'len() takes no keyword arguments',
        'len() takes no keyword arguments',
        'isinstance() takes no keyword arguments',
        'reversed() takes no keyword arguments',
        'list.append() takes no keyword arguments',
        'dict.get() takes no keyword arguments',
    ],
}

DISAGREEMENTS = sorted(k for k in EXPECTED if r.get(k, '<missing>') != EXPECTED[k])
SUMMARY = '%d checks, %d disagreeing %r, keys match: %s' % (
    len(EXPECTED), len(DISAGREEMENTS), DISAGREEMENTS, sorted(r) == sorted(EXPECTED))


if __name__ == '__main__':
    for key in EXPECTED:
        actual = r[key]
        print('%-22s %-5s -> %r' % (key, 'OK' if actual == EXPECTED[key] else 'FAIL', actual))
    print(SUMMARY)
