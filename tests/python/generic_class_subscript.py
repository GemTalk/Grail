# Regression fixture for class subscription as a base class.
#
# CPython lets you subscript a class to get a generic alias —
# ``list[V]'' / ``dict[K, V]'' / ``MyClass[T]''.  When that
# subscripted form appears as a base class
# (``class Foo(list[V]): ...''), the runtime collapses it back to
# the origin class for MRO purposes.
#
# Pre-fix, Grail had no ``__class_getitem__'' on its class objects,
# so ``OrderedCollection[V]'' (the Smalltalk shape of ``list[V]'')
# raised MessageNotUnderstood.  Werkzeug uses generic-subscripted
# bases throughout its datastructures package
# (``MultiDict[K, V]'', ``ImmutableList[V]'', ...).
#
# This regression keeps it lit.


from typing import TypeVar

T = TypeVar('T')
K = TypeVar('K')
V = TypeVar('V')


# NOTE: ``class GenericList(list[T])'' compiles cleanly (the subscript
# resolves) but ``GenericList([1, 2, 3])'' doesn't actually populate
# the list — Grail's class-instantiation dispatch calls ``self new''
# without forwarding the iterable to list's constructor.  Werkzeug
# uses ``list'' subclasses through inheritance but never directly
# constructs them with an iterable, so the gap is tolerable for now.
# Tracked separately from the __class_getitem__ regression.


class GenericList(list[T]):
    """A class with a single-parameter generic base.  Class
    compiles (the previously-broken step) — population of list
    contents from an iterable arg is a separate gap."""

    @staticmethod
    def origin_is_list():
        return list[T] is list


class GenericMap(dict[K, V]):
    """A class with a multi-parameter generic base."""

    def get_default(self, key, default):
        return self[key] if key in self else default


def list_subclass_compiles():
    """The class-creation step (previously broken on subscript) now
    works — verify by reading a static helper through the class."""
    return GenericList.origin_is_list()


def map_subclass_works():
    m = GenericMap()
    m['a'] = 1
    return m.get_default('a', 'missing'), m.get_default('z', 'missing')


def subscription_returns_self_for_use_as_alias():
    """Bare subscription (not as a base) — used by typing /
    type-annotation positions.  Grail collapses to the origin."""
    return list[int] is list, dict[str, int] is dict
