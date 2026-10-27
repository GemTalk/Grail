"""Fixture: a mapping pattern's keys that collide at run time raise ValueError.

Dotted-name keys are only known when the pattern runs.  CPython's match_keys
(Python/ceval.c) takes the keys in order: one equal to an earlier key is a
ValueError, ``mapping pattern checks duplicate key (...)``, and the match
fails quietly at the first key the subject lacks -- all before any value is
matched, so a pattern that raises has bound nothing.  Grail matched the
values key by key and never compared the keys.

Every check here holds under CPython 3.14, which is what makes it evidence.
"""

r = {}


class Keys:
    A = 'a'
    B = 'b'
    ONE = 1


def attribute_then_literal(subject):
    y = z = None
    try:
        match subject:
            case {Keys.A: y, 'a': z}:
                return 'matched', y, z
        return 'no match', y, z
    except ValueError as e:
        return str(e), y, z


def literal_then_attribute(subject):
    y = z = None
    try:
        match subject:
            case {'a': y, Keys.A: z}:
                return 'matched', y, z
        return 'no match', y, z
    except ValueError as e:
        return str(e), y, z


def equal_numbers(subject):
    y = z = None
    try:
        match subject:
            case {Keys.ONE: y, 1.0: z}:
                return 'matched', y, z
        return 'no match', y, z
    except ValueError as e:
        return str(e), y, z


def distinct(subject):
    match subject:
        case {Keys.A: y, Keys.B: z}:
            return 'matched', y, z
    return 'no match'


r['collision'] = [attribute_then_literal({'a': 0, 'b': 1}),
                  literal_then_attribute({'a': 0, 'b': 1}),
                  equal_numbers({1: 'x', 2: 'y'})]
r['missing_first_key_is_a_miss'] = [attribute_then_literal({'b': 1}),
                                    literal_then_attribute({})]
r['distinct'] = distinct({'a': 0, 'b': 1})

EXPECTED = {
    'collision': [("mapping pattern checks duplicate key ('a')", None, None),
                  ("mapping pattern checks duplicate key ('a')", None, None),
                  ('mapping pattern checks duplicate key (1.0)', None, None)],
    'missing_first_key_is_a_miss': [('no match', None, None)] * 2,
    'distinct': ('matched', 0, 1),
}

DISAGREEMENTS = sorted(k for k in EXPECTED if r.get(k, '<missing>') != EXPECTED[k])
SUMMARY = '%d checks, %d disagreeing %r, keys match: %s' % (
    len(EXPECTED), len(DISAGREEMENTS), DISAGREEMENTS, sorted(r) == sorted(EXPECTED))


if __name__ == '__main__':
    for key in EXPECTED:
        actual = r[key]
        print('%-5s %-28s -> %r' % ('OK' if actual == EXPECTED[key] else 'FAIL',
                                    key, actual))
    print(SUMMARY)
