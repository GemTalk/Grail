"""Fixture: a method called through its class refuses a missing or foreign receiver in CPython's words.

A method of a built-in type read off the type is a descriptor.  Called with no
argument it says it needs one: ``unbound method set.add() needs an argument``,
or, for a slot wrapper, ``descriptor '__repr__' of 'object' object needs an
argument``.  Called on an object of another type it says it does not apply to
it.  A def in a Python class body is a plain function, so with no argument it
is missing its parameters, ``C.m() missing 1 required positional argument:
'self'``.

Grail answered all of the no-argument calls with Python 2's ``unbound method
'add' must be called with an instance as the first argument``, and
``set.add(0)`` raised an AttributeError, ``type object 'set' has no method
'add'``.  test_descr's test_methods_in_c asserts the first two texts.

Every check here holds under CPython 3.14, which is what makes it evidence.
"""

r = {}


def refusal(call):
    try:
        call()
    except TypeError as exc:
        return str(exc)
    except AttributeError as exc:
        return 'AttributeError: %s' % exc
    return 'no TypeError'


class C:
    def m(self):
        return 'm'

    def n(self, a, b=1):
        return a

    def k(self, *, a):
        return a

    @classmethod
    def c(cls):
        return 'c'

    @staticmethod
    def s():
        return 's'


class D(C):
    pass


r['needs_an_argument'] = [
    refusal(lambda: set.add()),
    refusal(lambda: list.append()),
    refusal(lambda: int.bit_length()),
    refusal(lambda: type.mro()),
    refusal(lambda: dict.__getitem__()),
    refusal(lambda: set.__contains__()),
]
r['slot_wrapper'] = [
    refusal(lambda: object.__repr__()),
    refusal(lambda: str.__len__()),
    refusal(lambda: int.__add__()),
    refusal(lambda: object.__init__()),
]
r['plain_function_missing_parameters'] = [
    refusal(lambda: C.m()),
    refusal(lambda: C.n()),
    refusal(lambda: C.k()),
    refusal(lambda: D.m()),
]
r['foreign_receiver'] = [
    refusal(lambda: set.add(0)),
    refusal(lambda: str.upper(1)),
    refusal(lambda: type.mro(1)),
]
r['takes_no_keyword'] = [refusal(lambda: set.add(set(), x=1))]
r['still_runs'] = [C.m(C()), C.n(None, 5), C.c(), C.s(), int.bit_length(True), str.upper('ab')]

EXPECTED = {
    'needs_an_argument': [
        'unbound method set.add() needs an argument',
        'unbound method list.append() needs an argument',
        'unbound method int.bit_length() needs an argument',
        'unbound method type.mro() needs an argument',
        'unbound method dict.__getitem__() needs an argument',
        'unbound method set.__contains__() needs an argument',
    ],
    'slot_wrapper': [
        "descriptor '__repr__' of 'object' object needs an argument",
        "descriptor '__len__' of 'str' object needs an argument",
        "descriptor '__add__' of 'int' object needs an argument",
        "descriptor '__init__' of 'object' object needs an argument",
    ],
    'plain_function_missing_parameters': [
        "C.m() missing 1 required positional argument: 'self'",
        "C.n() missing 2 required positional arguments: 'self' and 'a'",
        "C.k() missing 1 required positional argument: 'self'",
        "C.m() missing 1 required positional argument: 'self'",
    ],
    'foreign_receiver': [
        "descriptor 'add' for 'set' objects doesn't apply to a 'int' object",
        "descriptor 'upper' for 'str' objects doesn't apply to a 'int' object",
        "descriptor 'mro' for 'type' objects doesn't apply to a 'int' object",
    ],
    'takes_no_keyword': ['set.add() takes no keyword arguments'],
    'still_runs': ['m', 5, 'c', 's', 1, 'AB'],
}

DISAGREEMENTS = sorted(k for k in EXPECTED if r.get(k, '<missing>') != EXPECTED[k])
SUMMARY = '%d checks, %d disagreeing %r, keys match: %s' % (
    len(EXPECTED), len(DISAGREEMENTS), DISAGREEMENTS, sorted(r) == sorted(EXPECTED))


if __name__ == '__main__':
    for key in EXPECTED:
        actual = r[key]
        print('%-34s %-5s -> %r' % (key, 'OK' if actual == EXPECTED[key] else 'FAIL', actual))
    print(SUMMARY)
