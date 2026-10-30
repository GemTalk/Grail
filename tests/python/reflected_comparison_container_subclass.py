"""Fixture: a builtin's comparison reflects to a container subclass's own dunder.

When a builtin's comparison declines the other operand, CPython calls the
reflected dunder of the other operand's type (Objects/object.c:1046
do_richcompare): ``1 < C(2)`` runs ``C(2).__gt__(1)``, and ``1 == C(1)`` runs
``C(1).__eq__(1)``.  Grail did that for a plain Python class, but not for one
over a kernel container -- ``class C(list)`` -- so the ordering raised
TypeError and the equality answered False (test_descr test_rich_comparisons).
A pair neither side can order still raises.  Every check here holds under
CPython 3.14, which is what makes it evidence.
"""

r = {}


class C(list):
    def __init__(self, value):
        self.value = value

    def __eq__(self, other):
        return self.value == other if isinstance(other, int) else NotImplemented

    def __ne__(self, other):
        return self.value != other if isinstance(other, int) else NotImplemented

    def __lt__(self, other):
        return self.value < other if isinstance(other, int) else NotImplemented

    def __le__(self, other):
        return self.value <= other if isinstance(other, int) else NotImplemented

    def __gt__(self, other):
        return self.value > other if isinstance(other, int) else NotImplemented

    def __ge__(self, other):
        return self.value >= other if isinstance(other, int) else NotImplemented


class Tagged(dict):
    def __gt__(self, other):
        return 'Tagged.__gt__'

    def __eq__(self, other):
        return 'Tagged.__eq__'


class Plain(list):
    pass


def outcome(thunk):
    try:
        return thunk()
    except TypeError as exc:
        return str(exc)


r['int_on_the_left'] = [1 < C(2), 2 <= C(2), 3 > C(2), 2 >= C(3), 1 == C(1), 1 != C(1), 2 == C(1)]
r['other_builtins_on_the_left'] = [outcome(lambda: 'a' < Tagged()), outcome(lambda: 1.5 < Tagged()),
                                   outcome(lambda: (1,) < Tagged()), outcome(lambda: 1.5 == Tagged()),
                                   outcome(lambda: 7 == Tagged())]
r['no_dunder_of_its_own'] = [outcome(lambda: 1 < Plain()), 1 == Plain()]
r['declined_both_ways'] = outcome(lambda: 'a' < C(2))

EXPECTED = {
    'int_on_the_left': [True, True, True, False, True, False, False],
    'other_builtins_on_the_left': ['Tagged.__gt__', 'Tagged.__gt__', 'Tagged.__gt__',
                                   'Tagged.__eq__', 'Tagged.__eq__'],
    'no_dunder_of_its_own': ["'<' not supported between instances of 'int' and 'Plain'", False],
    'declined_both_ways': "'<' not supported between instances of 'str' and 'C'",
}

DISAGREEMENTS = sorted(k for k in EXPECTED if r.get(k, '<missing>') != EXPECTED[k])
SUMMARY = '%d checks, %d disagreeing %r, keys match: %s' % (
    len(EXPECTED), len(DISAGREEMENTS), DISAGREEMENTS, sorted(r) == sorted(EXPECTED))


if __name__ == '__main__':
    for key in EXPECTED:
        ok = r[key] == EXPECTED[key]
        print('%-26s %s' % (key, 'OK' if ok else 'FAIL'))
        if not ok:
            print('    got  %r' % (r[key],))
            print('    want %r' % (EXPECTED[key],))
    print(SUMMARY)
