"""str-subclass construction: base order and constructor arity.

Two independent defects, both silent (wrong content, no exception):

1. ``class X(Mixin, str)`` produced an EMPTY string at every width,
   ASCII included.  The population step is gated on ClassDefAst >>
   firstBaseIsStr, which tested ``bases first`` alone -- yet the Smalltalk
   superclass comes from importlib >> ___selectStorageBase___:, which
   answers the leftmost base WITH STORAGE and so still picked str.  So the
   class was str-backed but never populated.  str was the only builtin
   base with this gap; bytes/tuple/list/dict populate on other paths.

2. ``S(b'x', 'ascii')`` answered the 4 characters ``b'x'`` instead of
   ``x``: the emitted construction passed only the FIRST positional, so
   the encoding was dropped and the bytes object got stringified.  And
   separately, ``CharacterCollection class >> __new__:_:`` returned
   ``obj decode: encoding`` directly -- a plain string -- so even when the
   encoding did arrive the subclass was lost (``Markup(b'x', 'ascii')``
   decoded correctly but came back a bare ``str``).
"""

LATIN1 = "café"
ASTRAL = "\U0001F600"
UTF8_LATIN1 = LATIN1.encode("utf-8")


class Mixin:
    def tag(self):
        return "mixin"


class MixinFirst(Mixin, str):
    """str is NOT written first — the base-order case."""


class Plain(str):
    pass


# --- 1. base order ----------------------------------------------------------

def mixin_first_ascii():
    return (type(MixinFirst("abc")).__name__, str(MixinFirst("abc")))


def mixin_first_wide():
    return (
        type(MixinFirst(LATIN1)).__name__,
        str(MixinFirst(LATIN1)),
        type(MixinFirst(ASTRAL)).__name__,
        len(MixinFirst(ASTRAL)),
    )


def mixin_first_method_still_reachable():
    return MixinFirst("abc").tag()


def mixin_first_is_a_str():
    return isinstance(MixinFirst(LATIN1), str)


# --- 2. constructor arity ---------------------------------------------------

def encoding_two_arg():
    return (type(Plain(b"x", "ascii")).__name__, str(Plain(b"x", "ascii")))


def encoding_three_arg():
    v = Plain(b"x", "ascii", "strict")
    return (type(v).__name__, str(v))


def encoding_decodes_multibyte():
    """utf-8 multibyte must decode to wide content AND stay the subclass."""
    v = Plain(UTF8_LATIN1, "utf-8")
    return (type(v).__name__, str(v) == LATIN1)


def encoding_on_mixin_first():
    v = MixinFirst(b"x", "ascii")
    return (type(v).__name__, str(v))


def no_arg_and_one_arg_unchanged():
    return (
        type(Plain()).__name__, str(Plain()),
        type(Plain("abc")).__name__, str(Plain("abc")),
    )


# --- guards: plain str() behaviour must not shift ---------------------------

def plain_str_two_arg_unchanged():
    v = str(b"x", "ascii")
    return (type(v).__name__, str(v))


def plain_str_rejects_decoding_str():
    """CPython: str(str, encoding) is a TypeError."""
    try:
        str("a", "ascii")
    except TypeError:
        return "TypeError"
    return "no-raise"
