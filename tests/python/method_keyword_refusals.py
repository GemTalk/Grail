"""Fixture: str, set and bytes methods take and refuse keywords as CPython's do.

A method whose parameters are all positional-only refuses any keyword, in the
name of the type that defines it, before it counts its arguments:
``'abc'.count(sub='a')`` is ``str.count() takes no keyword arguments`` and
``frozenset().union(x=1)`` is ``frozenset.union() ...``.  Grail's varargs
entries for these read the positionals and DROPPED the keywords, so
``'abc'.startswith('a', x=1)`` answered True and ``frozenset().union(x=1)`` a
copy -- and ``bytes.replace`` even took ``count=``, which CPython 3.14 refuses.
``str.expandtabs`` is the other way round: its ``tabsize`` is nameable, and
Grail refused it.

Every check here holds under CPython 3.14, which is what makes it evidence.
"""

r = {}


def refusal(call):
    try:
        call()
    except TypeError as exc:
        return str(exc)
    return 'no TypeError'


class MySet(set):
    pass


r['str_positional_only'] = [
    refusal(lambda: 'abc'.count(sub='a')),
    refusal(lambda: 'abc'.startswith('a', x=1)),
    refusal(lambda: 'abc'.endswith(suffix='c')),
    refusal(lambda: 'abc'.find('a', start=0)),
    refusal(lambda: 'abc'.rfind('a', x=1)),
    refusal(lambda: 'abc'.rindex('a', x=1)),
]
r['set_positional_only'] = [
    refusal(lambda: frozenset().union(x=1)),
    refusal(lambda: set().union([1], x=1)),
    refusal(lambda: set().intersection(x=1)),
    refusal(lambda: frozenset().difference(x=1)),
    refusal(lambda: set().update(x=1)),
    refusal(lambda: set().intersection_update(x=1)),
    refusal(lambda: set().difference_update(x=1)),
    refusal(lambda: MySet().union(x=1)),
]
r['bytes_replace'] = [
    refusal(lambda: b'aa'.replace(b'a', b'b', count=1)),
    refusal(lambda: bytearray(b'aa').replace(b'a', b'b', count=1)),
    b'aaa'.replace(b'a', b'b', 2),
]
r['expandtabs_tabsize'] = [
    'a\tb'.expandtabs(tabsize=4),
    'a\tb'.expandtabs(4),
    'a\tb'.expandtabs(),
    refusal(lambda: 'a\tb'.expandtabs(size=4)),
]
r['positionals_still_taken'] = [
    'abcabc'.count('a', 1), 'abc'.startswith('b', 1), 'abc'.find('c', 0, 3),
    sorted(frozenset([1]).union([2], [3])), sorted(set([1, 2]).intersection([2])),
]

EXPECTED = {
    'str_positional_only': [
        'str.count() takes no keyword arguments',
        'str.startswith() takes no keyword arguments',
        'str.endswith() takes no keyword arguments',
        'str.find() takes no keyword arguments',
        'str.rfind() takes no keyword arguments',
        'str.rindex() takes no keyword arguments',
    ],
    'set_positional_only': [
        'frozenset.union() takes no keyword arguments',
        'set.union() takes no keyword arguments',
        'set.intersection() takes no keyword arguments',
        'frozenset.difference() takes no keyword arguments',
        'set.update() takes no keyword arguments',
        'set.intersection_update() takes no keyword arguments',
        'set.difference_update() takes no keyword arguments',
        'set.union() takes no keyword arguments',
    ],
    'bytes_replace': [
        'bytes.replace() takes no keyword arguments',
        'bytearray.replace() takes no keyword arguments',
        b'bba',
    ],
    'expandtabs_tabsize': [
        'a   b',
        'a   b',
        'a       b',
        "expandtabs() got an unexpected keyword argument 'size'",
    ],
    'positionals_still_taken': [1, True, 2, [1, 2, 3], [2]],
}

DISAGREEMENTS = sorted(k for k in EXPECTED if r.get(k, '<missing>') != EXPECTED[k])
SUMMARY = '%d checks, %d disagreeing %r, keys match: %s' % (
    len(EXPECTED), len(DISAGREEMENTS), DISAGREEMENTS, sorted(r) == sorted(EXPECTED))


if __name__ == '__main__':
    for key in EXPECTED:
        actual = r[key]
        print('%-24s %-5s -> %r' % (key, 'OK' if actual == EXPECTED[key] else 'FAIL', actual))
    print(SUMMARY)
