"""``&``, ``|`` and ``^`` on a bool and an operand that is not an int raise
CPython's TypeError.

bool's bitwise dunders handed any operand that was not a bool to the kernel's
integer bit primitive, whose retry sends the selector on to the operand:
``True & 'x'`` ended the process with ``a Unicode7 does not understand
#bitAnd:``, a Smalltalk error no ``except`` can catch -- as did ``x &= 'a'`` on
a bool, and ``True | 1.5``.  They now answer NotImplemented, as CPython's do,
and the operator raises the TypeError after the other operand's reflected
dunder has had its turn.

bool with bool stays a bool, and bool with an int (or an int subclass) is still
the int result.  Self-running: ``python3 bool_bitwise_operands.py`` prints one
line per check against what CPython 3.14 answers.
"""

import enum


class Reflects:
    def __rand__(self, other):
        return "Reflects.__rand__"

    def __ror__(self, other):
        return "Reflects.__ror__"

    def __rxor__(self, other):
        return "Reflects.__rxor__"


class MyInt(int):
    pass


class Perm(enum.IntFlag):
    R = 4
    W = 2


def _outcome(action):
    try:
        return "ok -> %r" % (action(),)
    except Exception as e:
        return "%s: %s" % (type(e).__name__, e)


def _operators(operand):
    return (
        _outcome(lambda: True & operand),
        _outcome(lambda: True | operand),
        _outcome(lambda: False ^ operand),
    )


def _augmented():
    flag = True
    flag &= "a"
    return flag


r = {
    "with_a_str": _operators("x"),
    "with_an_object": _operators(object()),
    "with_none": _operators(None),
    "with_a_float": _operators(1.5),
    "with_a_list": _operators([1]),
    "augmented": _outcome(_augmented),
    "the_dunders_decline": (bool.__and__(True, "x"), bool.__or__(True, 1.5), bool.__xor__(False, None)),
    "the_reflected_dunder_answers": (True & Reflects(), True | Reflects(), True ^ Reflects()),
    "bool_with_bool": (True & False, True | False, True ^ True),
    "bool_with_int": (True & 3, True | 2, True ^ 3, False | 2 ** 100),
    "bool_with_an_int_subclass": (True | MyInt(2), type(True | MyInt(2)).__name__),
    "bool_with_an_intflag": (True & Perm.R, True | Perm.W),
}

EXPECTED = {
    'augmented': "TypeError: unsupported operand type(s) for &=: 'bool' and 'str'",
    'bool_with_an_int_subclass': (3, 'int'),
    'bool_with_an_intflag': (0, 3),
    'bool_with_bool': (False, True, False),
    'bool_with_int': (1, 3, 2, 1267650600228229401496703205376),
    'the_dunders_decline': (NotImplemented, NotImplemented, NotImplemented),
    'the_reflected_dunder_answers': ('Reflects.__rand__', 'Reflects.__ror__', 'Reflects.__rxor__'),
    'with_a_float': (
        "TypeError: unsupported operand type(s) for &: 'bool' and 'float'",
        "TypeError: unsupported operand type(s) for |: 'bool' and 'float'",
        "TypeError: unsupported operand type(s) for ^: 'bool' and 'float'",
    ),
    'with_a_list': (
        "TypeError: unsupported operand type(s) for &: 'bool' and 'list'",
        "TypeError: unsupported operand type(s) for |: 'bool' and 'list'",
        "TypeError: unsupported operand type(s) for ^: 'bool' and 'list'",
    ),
    'with_a_str': (
        "TypeError: unsupported operand type(s) for &: 'bool' and 'str'",
        "TypeError: unsupported operand type(s) for |: 'bool' and 'str'",
        "TypeError: unsupported operand type(s) for ^: 'bool' and 'str'",
    ),
    'with_an_object': (
        "TypeError: unsupported operand type(s) for &: 'bool' and 'object'",
        "TypeError: unsupported operand type(s) for |: 'bool' and 'object'",
        "TypeError: unsupported operand type(s) for ^: 'bool' and 'object'",
    ),
    'with_none': (
        "TypeError: unsupported operand type(s) for &: 'bool' and 'NoneType'",
        "TypeError: unsupported operand type(s) for |: 'bool' and 'NoneType'",
        "TypeError: unsupported operand type(s) for ^: 'bool' and 'NoneType'",
    ),
}

DISAGREEMENTS = sorted(k for k in EXPECTED if r.get(k, "<missing>") != EXPECTED[k])
SUMMARY = "%d checks, %d disagreeing %r, keys match: %s" % (
    len(EXPECTED), len(DISAGREEMENTS), DISAGREEMENTS, sorted(r) == sorted(EXPECTED))


if __name__ == '__main__':
    for k in sorted(EXPECTED):
        actual = r[k]
        print('%-28s %s %r' % (k, 'OK ' if actual == EXPECTED[k] else 'DIFF', actual))
    print(SUMMARY)
