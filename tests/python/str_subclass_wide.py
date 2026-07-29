"""A str subclass must keep its identity whatever its content holds.

GemStone widens a Unicode string IN PLACE when a character outside the
receiver's range is stored, migrating it to the CANONICAL wider class --
never to a wide counterpart of the receiver's own class.  A str subclass
backed by Unicode7 therefore lost its Python identity the moment it held
non-ASCII: same oop, class silently rewritten to Unicode16.  The failure
was invisible and data-dependent -- ``Markup('abc')`` was a Markup,
``Markup('café')`` was a plain str -- so the same template rendered
differently depending on whether a name happened to carry an accent.

Python str subclasses now subclass Unicode32, which spans the whole
code-point range and so can never be forced to migrate.
"""

ASCII = "abc"
LATIN1 = "café"          # é  — widens a Unicode7 to Unicode16
ASTRAL = "hi \U0001F600"      # 😀 — widens a Unicode16 to Unicode32


class S(str):
    pass


class WithNew(str):
    """Defines __new__, so it takes the runtime-allocator path."""

    def __new__(cls, value=""):
        return super().__new__(cls, value)


class Mixin:
    def tag(self):
        return "mixin"


class MultiBase(str, Mixin):
    """Multi-base — routes through importlib >> ___selectStorageBase___:,
    the other site that has to widen the chosen str base.

    ``str`` is deliberately FIRST.  The mixin-first spelling
    ``class X(Mixin, str)`` builds an EMPTY string at every width: the
    content-populating path is gated on ClassDefAst >> firstBaseIsStr,
    which only inspects ``bases first``.  That is a separate pre-existing
    gap, unrelated to widening (it loses the content on pure ASCII too),
    so it is not asserted here.
    """


def kinds():
    """Type name of a plain subclass at each of the three widths."""
    return (
        type(S(ASCII)).__name__,
        type(S(LATIN1)).__name__,
        type(S(ASTRAL)).__name__,
    )


def isinstances():
    return (
        isinstance(S(ASCII), S),
        isinstance(S(LATIN1), S),
        isinstance(S(ASTRAL), S),
    )


def still_a_str():
    """Widening the storage class must not stop it being a str."""
    return (
        isinstance(S(LATIN1), str),
        isinstance(S(ASTRAL), str),
    )


def contents():
    """Content must survive intact, not just the type."""
    return (
        str(S(ASCII)) == ASCII,
        str(S(LATIN1)) == LATIN1,
        str(S(ASTRAL)) == ASTRAL,
    )


def equality_across_widths():
    """A wide subclass instance compares equal to the plain str."""
    return (S(LATIN1) == LATIN1, S(ASTRAL) == ASTRAL)


def hash_across_widths():
    """...and hashes with it, so dict lookups cross the boundary."""
    d = {LATIN1: "found"}
    return (
        hash(S(LATIN1)) == hash(LATIN1),
        d.get(S(LATIN1)) == "found",
    )


def astral_length():
    """One astral code point is length 1, not a surrogate pair."""
    return len(S(ASTRAL)) == 4      # 'h' 'i' ' ' + one emoji


def with_new_keeps_type():
    return (
        type(WithNew(ASCII)).__name__,
        type(WithNew(LATIN1)).__name__,
        type(WithNew(ASTRAL)).__name__,
    )


def multibase_keeps_type():
    return (
        type(MultiBase(LATIN1)).__name__,
        MultiBase(LATIN1).tag(),
        str(MultiBase(LATIN1)) == LATIN1,
        type(MultiBase(ASTRAL)).__name__,
    )


def plain_str_unaffected():
    """Guard: only SUBCLASS construction widened.  Plain strings keep
    GemStone's compact narrow representation, so the fix must not have
    been implemented by repointing the ``str`` binding itself."""
    return (type(ASCII).__name__, type(LATIN1).__name__, ASCII == "abc")
