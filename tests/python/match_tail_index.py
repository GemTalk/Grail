"""Fixture: a sequence pattern reads an element after the star at len - k.

CPython addresses the elements after a ``*_`` from the end with a
NON-negative index, ``subject[len(subject) - k]`` (Python/codegen.c,
pattern_helper_sequence_subscr: "The subject may not support negative
indexing!").  Grail passed the negative index straight to __getitem__, so a
Sequence that reads its index literally answered -1 where CPython reads 41.

Every check here holds under CPython 3.14, which is what makes it evidence.
"""

import collections.abc

r = {}


class Echo(collections.abc.Sequence):
    """Answers the index it is asked for, and records it."""

    def __init__(self, length):
        self.length = length
        self.asked = []

    def __getitem__(self, i):
        self.asked.append(i)
        return i

    def __len__(self):
        return self.length


def tail(subject):
    match subject:
        case [x, *_, y]:
            return x, y, subject.asked
    return 'no match'


def two_tails(subject):
    match subject:
        case [*_, y, z]:
            return y, z, subject.asked
    return 'no match'


r['head_and_tail'] = tail(Echo(42))
r['two_tails'] = two_tails(Echo(5))
match [1, 2, 3, 4]:
    case [first, *_, last]:
        r['lists_unchanged'] = (first, last)

EXPECTED = {
    'head_and_tail': (0, 41, [0, 41]),
    'two_tails': (3, 4, [3, 4]),
    'lists_unchanged': (1, 4),
}

DISAGREEMENTS = sorted(k for k in EXPECTED if r.get(k, '<missing>') != EXPECTED[k])
SUMMARY = '%d checks, %d disagreeing %r, keys match: %s' % (
    len(EXPECTED), len(DISAGREEMENTS), DISAGREEMENTS, sorted(r) == sorted(EXPECTED))


if __name__ == '__main__':
    for key in EXPECTED:
        actual = r[key]
        print('%-5s %-16s -> %r' % ('OK' if actual == EXPECTED[key] else 'FAIL',
                                    key, actual))
    print(SUMMARY)
