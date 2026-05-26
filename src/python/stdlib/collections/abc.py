# GRAIL minimal collections.abc stub.
#
# CPython's collections.abc has ~20 abstract base classes used
# pervasively for isinstance() checks and as type-annotation
# generics (e.g. `c.Callable[[int], str]`).  Grail uses *instances*
# of a single stub class as the exported names so subscripting
# (`Callable[args]`) resolves through `__getitem__` regardless of
# class-vs-instance dispatch.  isinstance() dispatch returns
# False (no registered virtual subclasses).


class _ABCStub:
    """Stand-in for any collections.abc ABC.  Exported names below
    are CLASSES that inherit from this stub so user code can both
    ``isinstance''-check and SUBCLASS them (Werkzeug's
    ``class HeaderSet(cabc.MutableSet[str])'' is the load-bearing
    subclass case).  ``register'' is a classmethod so call sites
    like ``MutableMapping.register(MyClass)'' (Jinja2 hits this on
    the env-1 jinja2.utils module init) resolve to the class side."""

    def __init__(self, name='_ABC'):
        self._name = name

    def __getitem__(self, item):
        return self

    def __class_getitem__(cls, item):
        return cls

    def __repr__(self):
        return self._name

    def __call__(self, *args, **kwargs):
        return self

    @classmethod
    def register(cls, sub_cls):
        """Mimic ABC.register(cls) — CPython records the argument as
        a virtual subclass.  Grail's stub doesn't track membership so
        it just returns sub_cls (CPython's documented contract) and
        is a no-op for isinstance dispatch (which always returns
        False here).  Classmethod so ``MutableMapping.register(...)''
        works when MutableMapping is a CLASS (post-Werkzeug-staging
        rework) rather than an instance."""
        return sub_cls

    def __subclasshook__(self, cls):
        return NotImplemented


# Each ABC is exposed as a CLASS (not an instance) so user code can
# both isinstance-check against it AND subclass it.  Werkzeug's
# ``class HeaderSet(cabc.MutableSet[str]):'' is the load-bearing
# subclass case; making the names classes lets ``MutableSet[str]''
# resolve via ``__class_getitem__'' (which returns the class itself,
# inherited from Object's defaulting class method) and remain
# subclassable.
class Hashable(_ABCStub): pass
class Callable(_ABCStub): pass
class Iterable(_ABCStub): pass
class Iterator(_ABCStub): pass
class Generator(_ABCStub): pass
class Coroutine(_ABCStub): pass
class Awaitable(_ABCStub): pass
class Sequence(_ABCStub): pass
class MutableSequence(_ABCStub): pass
class Mapping(_ABCStub): pass
class MutableMapping(_ABCStub): pass
class Set(_ABCStub): pass
class MutableSet(_ABCStub): pass
class Container(_ABCStub): pass
class Sized(_ABCStub): pass
class Collection(_ABCStub): pass


__all__ = [
    'Hashable', 'Callable', 'Iterable', 'Iterator', 'Generator',
    'Coroutine', 'Awaitable', 'Sequence', 'MutableSequence',
    'Mapping', 'MutableMapping', 'Set', 'MutableSet', 'Container',
    'Sized', 'Collection',
]
