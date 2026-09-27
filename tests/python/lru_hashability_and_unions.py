"""Fixture for lru_cache's argument-hashability requirement and for
singledispatch registration from a UNION annotation.

A module fixture rather than an eval: string because the singledispatch cases
define nested functions with annotations, and the LRU cases need decorators.
"""

import functools
import typing


def _attempt(fn):
    """Answer the value, or the exception's type name."""
    try:
        return fn()
    except Exception as e:
        return type(e).__name__


# --- lru_cache argument hashability -----------------------------------------

def unhashable_argument_raises_type_error():
    """CPython's lru_cache hashes the key it builds, so an unhashable argument
    is a TypeError (issue #28653).  Grail keys a Smalltalk dictionary by an
    Array of the arguments, and a Smalltalk collection hashes perfectly well --
    so the call was cached under a key Python semantics say cannot exist.

    Both bounds, because they take different paths through the wrapper."""
    @functools.lru_cache(maxsize=None)
    def infinite(o):
        return 1

    @functools.lru_cache(maxsize=10)
    def limited(o):
        return 1

    return [_attempt(lambda: infinite([])),
            _attempt(lambda: limited([])),
            _attempt(lambda: infinite({})),
            _attempt(lambda: limited(set()))]


def unhashable_keyword_argument_raises_type_error():
    @functools.lru_cache(maxsize=None)
    def f(o=None):
        return 1
    return _attempt(lambda: f(o=[]))


def hashable_arguments_still_cache():
    """The check must not disturb the ordinary path: same argument, one miss."""
    calls = []

    @functools.lru_cache(maxsize=None)
    def f(x):
        calls.append(x)
        return x * 2

    return [f(3), f(3), f(4), len(calls)]


def unhashable_by_class_body_raises():
    """A class made unhashable at creation time (it defines __eq__ and no
    __hash__) is rejected too -- the check asks for the Python hash rather
    than testing a fixed list of builtin types."""
    class Point:
        def __init__(self, x):
            self.x = x
        def __eq__(self, other):
            return isinstance(other, Point) and self.x == other.x

    @functools.lru_cache(maxsize=None)
    def f(p):
        return 1

    return _attempt(lambda: f(Point(1)))


# --- singledispatch union registration --------------------------------------

def typing_union_dispatch():
    """``@f.register`` with a typing.Union annotation registers the
    implementation once per MEMBER, which is how CPython dispatches it: no
    union object goes into the registry, each class does.  These used to be
    left unregistered and every call fell through to the default."""
    @functools.singledispatch
    def f(arg):
        return "default"

    @f.register
    def _(arg: typing.Union[str, bytes]):
        return "union"

    return [f([]), f(""), f(b"")]


def pep604_union_dispatch():
    """The ``int | float'' spelling."""
    @functools.singledispatch
    def f(arg):
        return "default"

    @f.register
    def _(arg: int | float):
        return "union"

    return [f(""), f(1), f(1.0)]


def optional_union_dispatch():
    """``X | None'' -- CPython treats it as a union including type(None)."""
    @functools.singledispatch
    def f(arg):
        return "default"

    @f.register
    def _(arg: int | None):
        return "union"

    return [f(""), f(1), f(None)]


def subscripted_union_member_is_still_rejected():
    """``list[int] | str'' is NOT a union of plain classes -- CPython rejects
    it, and so must this.  The distinction is the whole reason the union check
    cannot be a bare ``contains a bracket'' test."""
    @functools.singledispatch
    def f(arg):
        return "default"

    def register():
        @f.register
        def _(arg: list[int] | str):
            return "union"
    return _attempt(register)


# --- lru_cache key equality --------------------------------------------------
#
# CPython hashes an lru_cache key once and compares it with tuple ==, which is
# each element's Python __eq__.  Grail stored a bare Array in a Smalltalk
# dictionary, so a bucket collision compared elements with SMALLTALK =:
# ``SmallFraction = complex'' was a doesNotUnderstand, a NotImplemented from
# __eq__ was an uncatchable ``Expected NotImplemented to be a Boolean'', and a
# user class's __eq__ was never consulted (Smalltalk = on an instance is
# identity).  Collisions depend on object hashes, so the first two failed on
# some runs and not others; enough keys make a collision certain.

def mixed_numeric_keys_do_not_crash():
    """Complex and float keys side by side, into an unbounded and a bounded
    cache (the bounded one also walks its recency list).  Answers how many
    calls came back with the wrong value: 0."""
    @functools.lru_cache(maxsize=None)
    def unbounded(x):
        return ('u', x)

    @functools.lru_cache(maxsize=64)
    def bounded(x):
        return ('b', x)

    wrong = 0
    for i in range(3000):
        for v in (complex(i, 1), i + 0.5):
            if unbounded(v) != ('u', v) or bounded(v) != ('b', v):
                wrong += 1
    return wrong


class _NoEq:
    def __eq__(self, other):
        return NotImplemented

    __hash__ = object.__hash__


def not_implemented_eq_falls_back_to_identity():
    """Every key is distinct, so every call misses and answers its own key."""
    @functools.lru_cache(maxsize=None)
    def f(x):
        return x

    keys = [_NoEq() for _ in range(3000)]
    wrong = sum(1 for k in keys if f(k) is not k)
    info = f.cache_info()
    return [wrong, info.hits, info.misses]


class _Key:
    def __init__(self, v):
        self.v = v

    def __eq__(self, other):
        return isinstance(other, _Key) and other.v == self.v

    def __hash__(self):
        return hash(self.v)


def equal_keys_share_an_entry():
    """_Key(1) and a fresh _Key(1) are the same key to CPython.  Unbounded:
    one hit.  Bounded to 2: the hit on a fresh _Key(1) must TOUCH the stored
    entry, so _Key(3) evicts _Key(2) and the last _Key(1) hits again."""
    @functools.lru_cache(maxsize=None)
    def f(k):
        return k.v

    f(_Key(1)); f(_Key(1)); f(_Key(2))
    a = f.cache_info()

    @functools.lru_cache(maxsize=2)
    def g(k):
        return k.v

    g(_Key(1)); g(_Key(2)); g(_Key(1)); g(_Key(3)); g(_Key(1)); g(_Key(2))
    b = g.cache_info()
    return [a.hits, a.misses, a.currsize, b.hits, b.misses, b.currsize]


if __name__ == '__main__':
    # Only the key-equality checks self-run; the rest of this file returns
    # values the SUnit class compares.  Expected values from CPython 3.14.6.
    for fn, expected in [
            (mixed_numeric_keys_do_not_crash, 0),
            (not_implemented_eq_falls_back_to_identity, [0, 0, 3000]),
            (equal_keys_share_an_entry, [1, 2, 2, 2, 4, 2])]:
        actual = fn()
        print('%-12s %s %s' % (fn.__name__, 'OK ' if actual == expected else 'DIFF', actual))
