"""Fixture: a case's captures are bound only once its whole pattern has matched.

CPython keeps a pattern's captured values on the stack and stores them after
the whole case pattern has matched, before the guard (Python/codegen.c,
codegen_match_inner).  So a pattern that fails part-way, or an or-alternative
that fails after capturing, binds nothing; a guard sees the captures, and they
stay bound when it fails.  Grail stored each capture as it was reached, so a
failed case left its partial bindings behind.

Every check here holds under CPython 3.14, which is what makes it evidence.
"""

r = {}


def bound(names, scope):
    return sorted(n for n in names if n in scope)


def failed_part_way(subject):
    match subject:
        case [a, 1]:
            pass
    return bound(['a'], locals())


def failed_alternatives(subject):
    match subject:
        case [x, 1] | [1, x]:
            pass
    return bound(['x'], locals())


def later_case(subject):
    match subject:
        case [a, 1]:
            pass
        case [b, 2]:
            pass
    return bound(['a', 'b'], locals())


def failed_star_and_rest(sequence, mapping):
    match sequence:
        case [*front, 9]:
            pass
    match mapping:
        case {'k': 1, **rest}:
            pass
    return bound(['front', 'rest'], locals())


def guard(subject):
    seen = []
    match subject:
        case [x] if seen.append(x) or False:
            pass
        case _:
            pass
    return seen, bound(['x'], locals())


def nested_alternatives(subject):
    match subject:
        case [y, ([a, 9] | (a, 8)), z]:
            pass
    return bound(['a', 'y', 'z'], locals())


r['failed_part_way'] = failed_part_way([5, 2])
r['failed_alternatives'] = failed_alternatives([7, 2])
r['later_case'] = later_case([5, 2])
r['failed_star_and_rest'] = failed_star_and_rest([1, 2], {'k': 2})
r['guard_sees_and_keeps'] = guard([3])
r['nested_alternatives'] = [nested_alternatives([0, [4, 7], 1]), nested_alternatives([0, (4, 8), 1])]
match [1, 2]:
    case [module_a, 3]:
        pass
r['module_scope'] = 'module_a' in globals()

EXPECTED = {
    'failed_part_way': [],
    'failed_alternatives': [],
    'later_case': ['b'],
    'failed_star_and_rest': [],
    'guard_sees_and_keeps': ([3], ['x']),
    'nested_alternatives': [[], ['a', 'y', 'z']],
    'module_scope': False,
}

DISAGREEMENTS = sorted(k for k in EXPECTED if r.get(k, '<missing>') != EXPECTED[k])
SUMMARY = '%d checks, %d disagreeing %r, keys match: %s' % (
    len(EXPECTED), len(DISAGREEMENTS), DISAGREEMENTS, sorted(r) == sorted(EXPECTED))


if __name__ == '__main__':
    for key in EXPECTED:
        actual = r[key]
        print('%-5s %-22s -> %r' % ('OK' if actual == EXPECTED[key] else 'FAIL',
                                    key, actual))
    print(SUMMARY)
