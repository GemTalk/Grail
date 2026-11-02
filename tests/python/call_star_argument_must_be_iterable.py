"""Fixture: a call's ``*'' operand must be iterable, and the refusal names the callee.

When a call's positional arguments are one ``*x'' and nothing else, CPython
hands x to the call as it is (Python/codegen.c:4305), and the call refuses one
that is neither iterable nor a sequence with "f() argument after * must be an
iterable, not int", naming the callee as _PyObject_FunctionStr does --
``module.qualname()'', or just ``dir()'' for a builtin
(Python/ceval.c:3393-3410).  Any other shape is built as a tuple display
first, and a display's ``*'' is refused in other words: "Value after * must be
an iterable, not int".

Grail refused a call's splat in the display's words, so test_extcall's
"argument after *" examples did not match.

Every check here holds under CPython 3.14, which is what makes it evidence.
"""

r = {}


def outcome(thunk):
    try:
        return thunk()
    except TypeError as e:
        return 'TypeError: %s' % e


def h(*args):
    return args


class Nothing:
    pass


class Sequence:
    def __getitem__(self, index):
        if index < 2:
            return index * 10
        raise IndexError(index)


prefix = '%s.%s()' % (h.__module__, h.__qualname__)

r['a_lone_splat_names_the_function'] = [outcome(lambda: h(*1)), outcome(lambda: h(*Nothing())),
                                        outcome(lambda: h(*1, x=2))]
r['a_builtin_is_named_bare'] = outcome(lambda: dir(*1))
r['other_shapes_say_value'] = [outcome(lambda: h(1, *1)), outcome(lambda: h(*1, 2)),
                               outcome(lambda: h(*[1], *2))]
r['a_display_says_value'] = [outcome(lambda: [*1]), outcome(lambda: (0, *1))]
r['iterables_still_unpack'] = [h(*[1, 2]), h(*'ab'), h(*range(2)), h(*(i for i in (7,))),
                               h(0, *Sequence(), 3)]

EXPECTED = {
    'a_lone_splat_names_the_function': ['TypeError: %s argument after * must be an iterable, not int' % prefix,
                                        'TypeError: %s argument after * must be an iterable, not Nothing' % prefix,
                                        'TypeError: %s argument after * must be an iterable, not int' % prefix],
    'a_builtin_is_named_bare': 'TypeError: dir() argument after * must be an iterable, not int',
    'other_shapes_say_value': ['TypeError: Value after * must be an iterable, not int'] * 3,
    'a_display_says_value': ['TypeError: Value after * must be an iterable, not int'] * 2,
    'iterables_still_unpack': [(1, 2), ('a', 'b'), (0, 1), (7,), (0, 0, 10, 3)],
}

DISAGREEMENTS = sorted(k for k in EXPECTED if r.get(k, '<missing>') != EXPECTED[k])
SUMMARY = '%d checks, %d disagreeing %r, keys match: %s' % (
    len(EXPECTED), len(DISAGREEMENTS), DISAGREEMENTS, sorted(r) == sorted(EXPECTED))


if __name__ == '__main__':
    for key in EXPECTED:
        actual = r.get(key, '<missing>')
        print('%-5s %-33s -> %r' % ('OK' if actual == EXPECTED[key] else 'FAIL', key, actual))
    print(SUMMARY)
