"""Fixture: a ``**`` operand's keys must be strs, and binding reads a copy.

CPython refuses a ``**`` key that is not a str with ``keywords must be
strings`` (Objects/call.c:1095-1100, _PyStack_UnpackDict), whatever the
operand is and whatever else the call passes; Grail handed an exact dict's
keys on unchecked, and built a dict subclass's or a mapping's copy without
checking either.  And CPython binds from keys it has already taken out of
the dict, so a str-subclass key whose __eq__ deletes from the caller's dict
cannot disturb the binding (bpo-2016, test_extcall's ``Name.__eq__'').

Every check here holds under CPython 3.14, which is what makes it evidence.
"""

import collections

r = {}


def f(a, b):
    return (a, b)


def g(**kw):
    return kw


def h(a=0, **kw):
    return (a, kw)


class Subdict(dict):
    pass


class Mapping:
    def __init__(self, entries):
        self.entries = entries

    def keys(self):
        return self.entries.keys()

    def __getitem__(self, key):
        return self.entries[key]


class Name(str):
    def __eq__(self, other):
        try:
            del x[self]
        except KeyError:
            pass
        return str.__eq__(self, other)

    def __hash__(self):
        return str.__hash__(self)


class Plain(str):
    pass


def attempt(thunk):
    try:
        return thunk()
    except Exception as exception:
        return '%s: %s' % (type(exception).__name__, exception)


refused = 'TypeError: keywords must be strings'
r['an_int_key_is_refused'] = [attempt(lambda: f(**{1: 2})), attempt(lambda: g(**{1: 2})),
                              attempt(lambda: dict(**{1: 2}))]
r['beside_a_named_keyword_or_another_splat'] = [attempt(lambda: h(a=1, **{1: 2})),
                                                attempt(lambda: g(**{'a': 1}, **{2: 3}))]
r['from_a_dict_subclass_or_a_mapping'] = [attempt(lambda: g(**Subdict({1: 2}))),
                                          attempt(lambda: g(**Mapping({1: 2}))),
                                          attempt(lambda: g(**collections.OrderedDict({1: 2})))]
x = {Name('a'): 1, Name('b'): 2}
r['a_key_deleting_from_the_callers_dict_still_binds'] = attempt(lambda: f(**x))
r['str_subclass_and_surrogate_keys_bind'] = [attempt(lambda: f(**{Plain('a'): 1, 'b': 2})),
                                             attempt(lambda: list(g(**{'\udc80': 1})))]
passed = {'a': 1, 'b': 2}
received = g(**passed)
received['c'] = 3
r['the_callee_gets_its_own_dict'] = (passed, received, (lambda **kw: g(**kw))(a=1, b=2))

EXPECTED = {
    'an_int_key_is_refused': [refused] * 3,
    'beside_a_named_keyword_or_another_splat': [refused] * 2,
    'from_a_dict_subclass_or_a_mapping': [refused] * 3,
    'a_key_deleting_from_the_callers_dict_still_binds': (1, 2),
    'str_subclass_and_surrogate_keys_bind': [(1, 2), ['\udc80']],
    'the_callee_gets_its_own_dict': ({'a': 1, 'b': 2}, {'a': 1, 'b': 2, 'c': 3}, {'a': 1, 'b': 2}),
}

DISAGREEMENTS = sorted(k for k in EXPECTED if r.get(k, '<missing>') != EXPECTED[k])
SUMMARY = '%d checks, %d disagreeing %r, keys match: %s' % (
    len(EXPECTED), len(DISAGREEMENTS), DISAGREEMENTS, sorted(r) == sorted(EXPECTED))


if __name__ == '__main__':
    for key in EXPECTED:
        actual = r.get(key, '<missing>')
        print('%-5s %-50s -> %r' % ('OK' if actual == EXPECTED[key] else 'FAIL', key, actual))
    print(SUMMARY)
