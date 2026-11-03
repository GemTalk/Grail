"""Fixture: a method's __get__ binds, and refuses, as CPython's does.

A built-in type's method descriptor binds only an object of its type
(Objects/descrobject.c, method_get through descr_check): "descriptor 'add'
for 'set' objects doesn't apply to a 'int' object", a slot wrapper in the
same words.  The check is of the real type.  Called with no instance and no
owner, any descriptor refuses: "__get__(None, None) is invalid"
(Objects/typeobject.c, wrap_descr_get).  A def binds anything.

Grail bound whatever it was handed, so ``set.add.__get__(0)'' answered a
bound method of 0 (test_descr test_methods_in_c).

Every check here holds under CPython 3.14, which is what makes it evidence.
"""

r = {}


class FakeStr:
    __class__ = str


class SubSet(set):
    pass


class C:
    pass


def plain(self):
    return self


def refusal(call):
    try:
        call()
        return 'bound'
    except TypeError as e:
        return str(e)


r['an_object_of_another_type'] = [
    refusal(lambda: set.add.__get__(0)),
    refusal(lambda: set.add.__get__([])),
    refusal(lambda: set.add.__get__(frozenset())),
    refusal(lambda: str.__add__.__get__(0)),
    refusal(lambda: str.split.__get__(FakeStr())),
]
r['no_instance_and_no_owner'] = [
    refusal(lambda: set.add.__get__(None)),
    refusal(lambda: plain.__get__(None)),
    refusal(lambda: plain.__get__(None, None)),
]
r['no_instance_answers_the_descriptor'] = (
    set.add.__get__(None, set) is set.add, plain.__get__(None, C) is plain)
own = set()
set.add.__get__(own)(1)
sub = SubSet()
set.add.__get__(sub)(2)
r['its_own_type_and_a_subtype_bind'] = (own, sub)
r['a_def_binds_anything'] = plain.__get__(42)()

NOT_APPLY = "descriptor '%s' for '%s' objects doesn't apply to a '%s' object"
EXPECTED = {
    'an_object_of_another_type': [
        NOT_APPLY % ('add', 'set', 'int'),
        NOT_APPLY % ('add', 'set', 'list'),
        NOT_APPLY % ('add', 'set', 'frozenset'),
        NOT_APPLY % ('__add__', 'str', 'int'),
        NOT_APPLY % ('split', 'str', 'FakeStr'),
    ],
    'no_instance_and_no_owner': ['__get__(None, None) is invalid'] * 3,
    'no_instance_answers_the_descriptor': (True, True),
    'its_own_type_and_a_subtype_bind': ({1}, SubSet({2})),
    'a_def_binds_anything': 42,
}

DISAGREEMENTS = sorted(k for k in EXPECTED if r.get(k, '<missing>') != EXPECTED[k])
SUMMARY = '%d checks, %d disagreeing %r, keys match: %s' % (
    len(EXPECTED), len(DISAGREEMENTS), DISAGREEMENTS, sorted(r) == sorted(EXPECTED))


if __name__ == '__main__':
    for key in EXPECTED:
        actual = r.get(key, '<missing>')
        print('%-5s %-36s -> %r' % ('OK' if actual == EXPECTED[key] else 'FAIL', key, actual))
    print(SUMMARY)
