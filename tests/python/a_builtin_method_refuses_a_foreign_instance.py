"""Fixture: a built-in type's method refuses an instance of an unrelated class.

A method of a built-in type read off the type is a descriptor that checks
its first argument (Objects/descrobject.c, descr_check): "descriptor 'sort'
for 'list' objects doesn't apply to a 'Thing' object", and for a slot
wrapper "descriptor '__add__' requires a 'int' object but received a
'Thing'" (wrapperdescr_call).  The check is of the real type, so an object
that only claims ``__class__ = str'' is refused too.  An instance of a
subclass of the type is one of its own, and a def in a Python class body
is a plain function that checks nothing.

Grail ran the type's method on the foreign object, which died inside it on a
MessageNotUnderstood no Python code could catch (test_descr
test_specialized_method_calls_check_types, test_proxy_call).

Every check here holds under CPython 3.14, which is what makes it evidence.
"""

r = {}


class Thing:
    pass


class FakeStr:
    __class__ = str


class Listing(list):
    pass


class Text(str):
    pass


class Plain:
    def method(self):
        return 'ran'


thing = Thing()
fake = FakeStr()


def refusal(call):
    try:
        call()
    except TypeError as e:
        return str(e)
    return 'no TypeError'


r['method_descriptors'] = [
    refusal(lambda: list.sort(thing)),
    refusal(lambda: list.append(thing, 1)),
    refusal(lambda: str.split(thing)),
    refusal(lambda: str.upper(thing)),
    refusal(lambda: str.strip(thing)),
    refusal(lambda: dict.get(thing, 1)),
]
r['slot_wrappers'] = [
    refusal(lambda: int.__add__(thing, 1)),
    refusal(lambda: list.__len__(thing)),
]
r['a_claimed_class_is_not_enough'] = (
    isinstance(fake, str),
    refusal(lambda: str.split(fake)),
    refusal(lambda: str.__add__(fake, 'abc')),
)
listing = Listing()
list.append(listing, 1)
r['a_subclass_instance_is_one_of_its_own'] = (listing, str.upper(Text('a')))
r['a_python_def_checks_nothing'] = Plain.method(thing)
r['object_methods_apply_to_anything'] = object.__repr__(thing).startswith('<')

EXPECTED = {
    'method_descriptors': [
        "descriptor 'sort' for 'list' objects doesn't apply to a 'Thing' object",
        "descriptor 'append' for 'list' objects doesn't apply to a 'Thing' object",
        "descriptor 'split' for 'str' objects doesn't apply to a 'Thing' object",
        "descriptor 'upper' for 'str' objects doesn't apply to a 'Thing' object",
        "descriptor 'strip' for 'str' objects doesn't apply to a 'Thing' object",
        "descriptor 'get' for 'dict' objects doesn't apply to a 'Thing' object",
    ],
    'slot_wrappers': [
        "descriptor '__add__' requires a 'int' object but received a 'Thing'",
        "descriptor '__len__' requires a 'list' object but received a 'Thing'",
    ],
    'a_claimed_class_is_not_enough': (
        True,
        "descriptor 'split' for 'str' objects doesn't apply to a 'FakeStr' object",
        "descriptor '__add__' requires a 'str' object but received a 'FakeStr'",
    ),
    'a_subclass_instance_is_one_of_its_own': ([1], 'A'),
    'a_python_def_checks_nothing': 'ran',
    'object_methods_apply_to_anything': True,
}

DISAGREEMENTS = sorted(k for k in EXPECTED if r.get(k, '<missing>') != EXPECTED[k])
SUMMARY = '%d checks, %d disagreeing %r, keys match: %s' % (
    len(EXPECTED), len(DISAGREEMENTS), DISAGREEMENTS, sorted(r) == sorted(EXPECTED))


if __name__ == '__main__':
    for key in EXPECTED:
        actual = r.get(key, '<missing>')
        print('%-5s %-38s -> %r' % ('OK' if actual == EXPECTED[key] else 'FAIL', key, actual))
    print(SUMMARY)
