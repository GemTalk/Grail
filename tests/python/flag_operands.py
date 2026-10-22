"""A flag's ``|``, ``&``, ``^`` and ``in`` take the operands CPython's do.

CPython's ``Flag._get_value`` (Lib/enum.py) admits a member of the flag's own
class or, when the flag has an int member type (IntFlag, ``class H(int,
Flag)``), anything that is an int -- a bool included -- and its operators
answer NotImplemented for everything else, so the other operand's reflected
dunder gets its turn and the TypeError names both types.  Grail rejected a
bool, raised ``unsupported operand type(s) for flag operation`` from inside
the operator, and never asked the other operand.

``in`` is stricter: ``Flag.__contains__`` takes only a member of the flag's
own class, so ``2 in Perm.W`` is a TypeError even for an IntFlag.  Grail
answered True.

Self-running: ``python3 flag_operands.py`` prints one line per check against
what CPython 3.14 answers.
"""

import enum


class Perm(enum.IntFlag):
    R = 4
    W = 2


class Color(enum.Flag):
    RED = 1
    BLUE = 2


class Mixed(int, enum.Flag):
    A = 1
    B = 2


class MyInt(int):
    pass


class Reflects:
    def __ror__(self, other):
        return "Reflects.__ror__"

    def __rand__(self, other):
        return "Reflects.__rand__"

    def __rxor__(self, other):
        return "Reflects.__rxor__"


def _outcome(action):
    try:
        return "ok -> %r" % (action(),)
    except Exception as e:
        return "%s: %s" % (type(e).__name__, e)


def _operators(flag, operand):
    return (
        _outcome(lambda: flag | operand),
        _outcome(lambda: flag & operand),
        _outcome(lambda: flag ^ operand),
    )


r = {
    "intflag_with_a_bool": _operators(Perm.W, True),
    "a_bool_with_an_intflag": _outcome(lambda: True | Perm.W),
    "intflag_with_an_int_and_int_subclass": (_outcome(lambda: Perm.W | 4), _outcome(lambda: Perm.W | MyInt(4))),
    "intflag_with_a_str": _operators(Perm.W, "x"),
    "intflag_with_a_float": _outcome(lambda: Perm.W & 1.5),
    "a_str_with_an_intflag": _outcome(lambda: "x" | Perm.W),
    "intflag_dunders_decline": (Perm.W.__or__("x"), Perm.W.__and__(1.5), Perm.W.__xor__(None), Perm.W.__ror__("x")),
    "intflag_with_a_reflecting_operand": (Perm.W | Reflects(), Perm.W & Reflects(), Perm.W ^ Reflects()),
    "mixed_with_a_bool": _outcome(lambda: Mixed.A | True),
    "mixed_dunder_declines": Mixed.A.__or__("x"),
    "mixed_with_a_reflecting_operand": Mixed.A | Reflects(),
    "flag_with_an_int_or_bool": (_outcome(lambda: Color.RED | 1), _outcome(lambda: Color.RED | True)),
    "flag_dunder_declines": (Color.RED.__or__(1), Color.RED.__and__(True)),
    "flag_with_a_reflecting_operand": Color.RED | Reflects(),
    "flag_with_its_own_members": (Color.RED | Color.BLUE, Color.RED & Color.BLUE, Color.RED ^ Color.BLUE),
    "contains_own_members": (Perm.W in (Perm.R | Perm.W), Perm.R in Perm.W, Color.RED in Color.RED, Mixed.B in Mixed.B),
    "contains_refuses_others": (
        _outcome(lambda: 2 in (Perm.R | Perm.W)),
        _outcome(lambda: True in Perm.W),
        _outcome(lambda: "x" in Perm.W),
        _outcome(lambda: 2 in Mixed.B),
        _outcome(lambda: Perm.W in Color.RED),
    ),
}

EXPECTED = {
    'a_bool_with_an_intflag': 'ok -> 3',
    'a_str_with_an_intflag': "TypeError: unsupported operand type(s) for |: 'str' and 'Perm'",
    'contains_own_members': (True, False, True, True),
    'contains_refuses_others': (
        "TypeError: unsupported operand type(s) for 'in': 'int' and 'Perm'",
        "TypeError: unsupported operand type(s) for 'in': 'bool' and 'Perm'",
        "TypeError: unsupported operand type(s) for 'in': 'str' and 'Perm'",
        "TypeError: unsupported operand type(s) for 'in': 'int' and 'Mixed'",
        "TypeError: unsupported operand type(s) for 'in': 'Perm' and 'Color'",
    ),
    'flag_dunder_declines': (NotImplemented, NotImplemented),
    'flag_with_a_reflecting_operand': 'Reflects.__ror__',
    'flag_with_an_int_or_bool': (
        "TypeError: unsupported operand type(s) for |: 'Color' and 'int'",
        "TypeError: unsupported operand type(s) for |: 'Color' and 'bool'",
    ),
    'flag_with_its_own_members': (Color.RED | Color.BLUE, Color(0), Color.RED | Color.BLUE),
    'intflag_dunders_decline': (NotImplemented, NotImplemented, NotImplemented, NotImplemented),
    'intflag_with_a_bool': ('ok -> <Perm.W|1: 3>', 'ok -> <Perm: 0>', 'ok -> <Perm.W|1: 3>'),
    'intflag_with_a_float': "TypeError: unsupported operand type(s) for &: 'Perm' and 'float'",
    'intflag_with_a_reflecting_operand': ('Reflects.__ror__', 'Reflects.__rand__', 'Reflects.__rxor__'),
    'intflag_with_a_str': (
        "TypeError: unsupported operand type(s) for |: 'Perm' and 'str'",
        "TypeError: unsupported operand type(s) for &: 'Perm' and 'str'",
        "TypeError: unsupported operand type(s) for ^: 'Perm' and 'str'",
    ),
    'intflag_with_an_int_and_int_subclass': ('ok -> <Perm.R|W: 6>', 'ok -> <Perm.R|W: 6>'),
    'mixed_dunder_declines': NotImplemented,
    'mixed_with_a_bool': 'ok -> <Mixed.A: 1>',
    'mixed_with_a_reflecting_operand': 'Reflects.__ror__',
}

DISAGREEMENTS = sorted(k for k in EXPECTED if r.get(k, "<missing>") != EXPECTED[k])
SUMMARY = "%d checks, %d disagreeing %r, keys match: %s" % (
    len(EXPECTED), len(DISAGREEMENTS), DISAGREEMENTS, sorted(r) == sorted(EXPECTED))


if __name__ == '__main__':
    for k in sorted(EXPECTED):
        actual = r[k]
        print('%-36s %s %r' % (k, 'OK ' if actual == EXPECTED[k] else 'DIFF', actual))
    print(SUMMARY)
