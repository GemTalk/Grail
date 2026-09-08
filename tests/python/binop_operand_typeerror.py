# Fixture for TypeErrorTestCase's binary-operand-name checks.
#
# CPython names the PYTHON TYPES of both operands when an arithmetic operator
# has no implementation for the pair:
#
#     TypeError: unsupported operand type(s) for +: 'P' and 'int'
#
# Grail's arithmetic fallback named the SMALLTALK CLASS that happens to back
# each operand instead, so the same message read ``'P' and 'SmallInteger''',
# ``'Object' and 'SmallDouble''', ``'P' and 'Unicode7''' -- GemStone kernel
# class names leaking into a Python-facing message.  Which name you got even
# depended on the VALUE: a small int said 'SmallInteger' and a big one
# 'LargePositiveInteger', where CPython says 'int' for both.
#
# The comparison fallback beside it (``'<' not supported between instances
# of ...'') already reported Python names, through object >>
# ___pyTypeNameForError___; the arithmetic one was simply never moved over.
#
# Both directions are covered.  ``P() + 1'' raises from the FORWARD fallback
# (___binOpFallback___); ``NotImplementedAdd() + 1'', whose __add__ declines,
# gets as far as int's reflected __radd__ and raises from the REVERSE one
# (___rbinOpFallback___), which had the identical leak.
#
# EVERY expectation here is measured against CPython -- run this file as a
# script (``python3 tests/python/binop_operand_typeerror.py'') and every line
# must read OK.  scripts/check_python_fixtures.sh does exactly that.

CHECKS = []


def check(name, expected):
    """Register fn as a check whose answer must equal ``expected'' in CPython."""

    def register(fn):
        CHECKS.append((name, fn, expected))
        return fn

    return register


def caught(fn):
    """The exception type and message, or 'no raise'."""
    try:
        fn()
    except BaseException as e:
        return "%s: %s" % (type(e).__name__, e)
    return "no raise"


class P:
    """No arithmetic protocol at all."""


class NotImplementedAdd:
    """Declines the forward operator, so the REFLECTED slot runs and refuses.
    That is the only Python shape that reaches a reverse-op fallback."""

    def __add__(self, other):
        return NotImplemented


# --- the right operand: every built-in whose Smalltalk class has a
# --- different name from its Python type ------------------------------------


@check("plain_plus_smallint", "TypeError: unsupported operand type(s) for +: 'P' and 'int'")
def plain_plus_smallint():
    return caught(lambda: P() + 1)


@check("plain_plus_largeint", "TypeError: unsupported operand type(s) for +: 'P' and 'int'")
def plain_plus_largeint():
    """A LargePositiveInteger in Grail; still 'int' in CPython."""
    return caught(lambda: P() + 10 ** 30)


@check("plain_plus_negint", "TypeError: unsupported operand type(s) for +: 'P' and 'int'")
def plain_plus_negint():
    return caught(lambda: P() + -(10 ** 30))


@check("plain_plus_float", "TypeError: unsupported operand type(s) for +: 'P' and 'float'")
def plain_plus_float():
    return caught(lambda: P() + 1.5)


@check("plain_plus_bool", "TypeError: unsupported operand type(s) for +: 'P' and 'bool'")
def plain_plus_bool():
    return caught(lambda: P() + True)


@check("plain_plus_str", "TypeError: unsupported operand type(s) for +: 'P' and 'str'")
def plain_plus_str():
    return caught(lambda: P() + "a")


@check("plain_plus_bytes", "TypeError: unsupported operand type(s) for +: 'P' and 'bytes'")
def plain_plus_bytes():
    return caught(lambda: P() + b"a")


@check("plain_plus_tuple", "TypeError: unsupported operand type(s) for +: 'P' and 'tuple'")
def plain_plus_tuple():
    return caught(lambda: P() + (1,))


@check("plain_plus_list", "TypeError: unsupported operand type(s) for +: 'P' and 'list'")
def plain_plus_list():
    return caught(lambda: P() + [1])


@check("plain_plus_dict", "TypeError: unsupported operand type(s) for +: 'P' and 'dict'")
def plain_plus_dict():
    return caught(lambda: P() + {1: 2})


@check("plain_plus_none", "TypeError: unsupported operand type(s) for +: 'P' and 'NoneType'")
def plain_plus_none():
    return caught(lambda: P() + None)


# --- the left operand --------------------------------------------------------


@check("object_plus_float", "TypeError: unsupported operand type(s) for +: 'object' and 'float'")
def object_plus_float():
    """``object'' with a lower-case o: the Smalltalk class is ``Object''."""
    return caught(lambda: object() + 1.5)


@check("set_plus_int", "TypeError: unsupported operand type(s) for +: 'set' and 'int'")
def set_plus_int():
    return caught(lambda: set() + 1)


@check("none_plus_int", "TypeError: unsupported operand type(s) for +: 'NoneType' and 'int'")
def none_plus_int():
    return caught(lambda: None + 1)


@check("int_plus_plain", "TypeError: unsupported operand type(s) for +: 'int' and 'P'")
def int_plus_plain():
    """Operands named in SOURCE order, the int on the left."""
    return caught(lambda: 1 + P())


@check("float_plus_plain", "TypeError: unsupported operand type(s) for +: 'float' and 'P'")
def float_plus_plain():
    return caught(lambda: 1.5 + P())


# --- other operators, so the op string is not the only thing verified.
# --- ``**'' is deliberately absent: CPython words that one ``for ** or
# --- pow()'', a wording divergence of its own and not this fix's business.


@check("plain_minus_int", "TypeError: unsupported operand type(s) for -: 'P' and 'int'")
def plain_minus_int():
    return caught(lambda: P() - 1)


@check("plain_times_int", "TypeError: unsupported operand type(s) for *: 'P' and 'int'")
def plain_times_int():
    return caught(lambda: P() * 1)


@check("plain_truediv_int", "TypeError: unsupported operand type(s) for /: 'P' and 'int'")
def plain_truediv_int():
    return caught(lambda: P() / 1)


@check("plain_floordiv_int", "TypeError: unsupported operand type(s) for //: 'P' and 'int'")
def plain_floordiv_int():
    return caught(lambda: P() // 1)


@check("plain_mod_int", "TypeError: unsupported operand type(s) for %: 'P' and 'int'")
def plain_mod_int():
    return caught(lambda: P() % 1)


@check("plain_mod_str", "TypeError: unsupported operand type(s) for %: 'P' and 'str'")
def plain_mod_str():
    # The reflected slot on the RIGHT operand EXISTS here, and declines.
    #
    # CPython's str.__rmod__ answers NotImplemented for a non-string left
    # operand, which is what makes this the ordinary unsupported-operand
    # error.  Grail's was `self error: 'Not yet implemented: __rmod__'` -- a
    # raw Smalltalk error no `except` can see, so this expression did not
    # raise, it took the process down.  `Decimal("2") % "a"` is the same
    # shape; the plain class is what is asserted here because CPython names
    # its C Decimal 'decimal.Decimal' where Grail says 'Decimal'.
    return caught(lambda: P() % "a")


@check("plain_rshift_int", "TypeError: unsupported operand type(s) for >>: 'P' and 'int'")
def plain_rshift_int():
    return caught(lambda: P() >> 1)


@check("plain_or_int", "TypeError: unsupported operand type(s) for |: 'P' and 'int'")
def plain_or_int():
    return caught(lambda: P() | 1)


@check("plain_xor_int", "TypeError: unsupported operand type(s) for ^: 'P' and 'int'")
def plain_xor_int():
    return caught(lambda: P() ^ 1)


@check("plain_matmul_int", "TypeError: unsupported operand type(s) for @: 'P' and 'int'")
def plain_matmul_int():
    return caught(lambda: P() @ 1)


@check("plain_lshift_int", "TypeError: unsupported operand type(s) for <<: 'P' and 'int'")
def plain_lshift_int():
    return caught(lambda: P() << 1)


@check("plain_and_int", "TypeError: unsupported operand type(s) for &: 'P' and 'int'")
def plain_and_int():
    return caught(lambda: P() & 1)


# --- the REVERSE fallback ----------------------------------------------------


@check("declined_plus_int",
       "TypeError: unsupported operand type(s) for +: 'NotImplementedAdd' and 'int'")
def declined_plus_int():
    """__add__ returns NotImplemented, so int.__radd__ runs and refuses."""
    return caught(lambda: NotImplementedAdd() + 1)


@check("declined_plus_float",
       "TypeError: unsupported operand type(s) for +: 'NotImplementedAdd' and 'float'")
def declined_plus_float():
    return caught(lambda: NotImplementedAdd() + 1.5)


# --- positive controls: arithmetic that WORKS must keep working --------------


@check("working_arithmetic", (3, 3.5, 6, "aa"))
def working_arithmetic():
    return (1 + 2, 1 + 2.5, 2 * 3, "a" * 2)


# --- harness entry points ----------------------------------------------------


def check_count():
    """How many checks ran.  Asserted by the Smalltalk test so a half-built
    table cannot report a well-formed zero failures."""
    return len(CHECKS)


def failures():
    """Every check whose answer differs from CPython's, as one string.

    Rows, not a count: the leaked name a check actually got is the whole
    diagnosis."""
    bad = []
    for name, fn, expected in CHECKS:
        actual = fn()
        if actual != expected:
            bad.append("%s: expected <%s> got <%s>" % (name, expected, actual))
    return "\n".join(bad)


if __name__ == "__main__":
    for _name, _fn, _expected in CHECKS:
        _actual = _fn()
        print("%-4s %-24s %s" % ("OK" if _actual == _expected else "FAIL", _name, _actual))
