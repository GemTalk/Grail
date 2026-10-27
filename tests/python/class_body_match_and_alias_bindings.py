"""Fixture: a class body reads back the names its ``match`` and ``type`` statements bind.

CPython executes a class body as code, so a ``match`` binds its captures --
and whatever the matching case assigns -- in the class namespace, and a
``type X = ...`` alias binds X there, both visible to every later statement
of the body.  Grail stored them on the class but compiled a later read as a
bare identifier, so the class failed to compile with ``undefined symbol``.

Every check here holds under CPython 3.14, which is what makes it evidence.
"""

r = {}


class Matched:
    match {'kind': 'point', 'at': [3, 4]}:
        case {'kind': kind, 'at': [x, *rest]}:
            body_binding = 'case ran'
        case _:
            body_binding = 'fallback'
    seen = (kind, x, rest, body_binding)


r['match_captures'] = Matched.seen


class Aliased:
    type Pair = tuple[int, int]
    value = Pair.__value__
    name = Pair.__name__


r['alias'] = (Aliased.value, Aliased.name, Aliased.Pair.__value__)


def build():
    class Inner:
        type Alias = list[str]
        match 7:
            case int(n) if n > 5:
                big = True
        read = (Alias.__value__, n, big)
    return Inner


r['inside_a_function'] = build().read


class Unmatched:
    match 1:
        case str(s):
            pass
    fallback = 'unbound' if 's' not in vars() else 'bound'


r['capture_not_bound'] = Unmatched.fallback

EXPECTED = {
    'match_captures': ('point', 3, [4], 'case ran'),
    'alias': (tuple[int, int], 'Pair', tuple[int, int]),
    'inside_a_function': (list[str], 7, True),
    'capture_not_bound': 'unbound',
}

DISAGREEMENTS = sorted(k for k in EXPECTED if r.get(k, '<missing>') != EXPECTED[k])
SUMMARY = '%d checks, %d disagreeing %r, keys match: %s' % (
    len(EXPECTED), len(DISAGREEMENTS), DISAGREEMENTS, sorted(r) == sorted(EXPECTED))


if __name__ == '__main__':
    for key in EXPECTED:
        actual = r[key]
        print('%-5s %-18s -> %r' % ('OK' if actual == EXPECTED[key] else 'FAIL', key, actual))
    print(SUMMARY)
