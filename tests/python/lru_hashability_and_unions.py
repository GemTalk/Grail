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
