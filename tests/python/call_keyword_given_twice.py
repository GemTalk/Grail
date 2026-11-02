"""Fixture: a call that gives a keyword twice through ``**'' is refused.

CPython builds a call's keywords with DICT_MERGE, which refuses a key it has
already -- from a named keyword or an earlier ``**m'' -- with
``f() got multiple values for keyword argument 'x''' (Python/ceval.c,
_PyEval_FormatKwargsError), naming the callee as _PyObject_FunctionStr does.
Grail merged the mappings and let the later one win, so
``f(x=5, **{'x': 3})'' called f with x=3, and a mapping whose keys() gives a
name twice was copied with the later value winning.  test_unpack_ex's and
test_extcall's doctests check each shape.

Every check here holds under CPython 3.14, which is what makes it evidence.
"""

r = {}


def outcome(thunk):
    try:
        return thunk()
    except Exception as e:
        return '%s: %s' % (type(e).__name__, e)


def f(*args, **kwargs):
    return kwargs


class MultiDict:
    # test_extcall's: a mapping whose keys() may repeat a name.
    def __init__(self, pairs):
        self._pairs = list(pairs)

    def keys(self):
        return [key for key, _ in self._pairs]

    def __getitem__(self, key):
        return [value for k, value in self._pairs if k == key][-1]


# CPython's _PyObject_FunctionStr: the module, the qualified name, and ().
NAMED = "TypeError: %s.%s() got multiple values for keyword argument " % (f.__module__, f.__qualname__)

r['named_then_splat'] = outcome(lambda: f(x=5, **{'x': 3}, y=2))
r['splat_then_named'] = outcome(lambda: f(**{'x': 3}, x=5, y=2))
r['two_splats'] = outcome(lambda: f(**{'x': 3}, **{'x': 5}, y=2))
r['named_and_two_splats'] = outcome(lambda: f(x=5, **{'x': 3}, **{'x': 2}))
r['a_key_that_is_not_a_string'] = outcome(lambda: f(**{1: 3}, **{1: 5}))
r['no_overlap_is_merged_in_order'] = list(f(a=1, **{'b': 2}, c=3, **{'d': 4}).items())
r['one_splat_alone'] = f(**{'x': 1})
r['a_builtin_names_itself'] = outcome(lambda: dict(a=1, **{'a': 2}))
r['keys_that_repeat_a_name'] = [outcome(lambda: f(**MultiDict([('x', 1), ('x', 2)]))),
                                outcome(lambda: f(a=3, **MultiDict([('x', 1), ('x', 2)]))),
                                f(**MultiDict([('x', 1), ('y', 2)]))]

EXPECTED = {
    'named_then_splat': NAMED + "'x'",
    'splat_then_named': NAMED + "'x'",
    'two_splats': NAMED + "'x'",
    'named_and_two_splats': NAMED + "'x'",
    'a_key_that_is_not_a_string': NAMED + "'1'",
    'no_overlap_is_merged_in_order': [('a', 1), ('b', 2), ('c', 3), ('d', 4)],
    'one_splat_alone': {'x': 1},
    'a_builtin_names_itself': "TypeError: dict() got multiple values for keyword argument 'a'",
    'keys_that_repeat_a_name': [NAMED + "'x'", NAMED + "'x'", {'x': 1, 'y': 2}],
}

DISAGREEMENTS = sorted(k for k in EXPECTED if r.get(k, '<missing>') != EXPECTED[k])
SUMMARY = '%d checks, %d disagreeing %r, keys match: %s' % (
    len(EXPECTED), len(DISAGREEMENTS), DISAGREEMENTS, sorted(r) == sorted(EXPECTED))


if __name__ == '__main__':
    for key in EXPECTED:
        actual = r.get(key, '<missing>')
        print('%-5s %-30s -> %r' % ('OK' if actual == EXPECTED[key] else 'FAIL', key, actual))
    print(SUMMARY)
