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

    @classmethod
    def __instancecheck__(cls, instance):
        """Recognise the builtin concrete types CPython registers as
        virtual subclasses of these ABCs.  Grail keeps no ABC registry,
        so ``isinstance(x, collections.abc.Mapping)`` (and friends) would
        otherwise always be False -- which silently breaks any library
        that branches on it (e.g. Werkzeug's ``iter_multi_items``, which
        treats a dict as a mapping of items rather than iterating its
        keys and losing the values).  ``isinstance`` in builtins.gs walks
        the metaclass chain to reach this inherited hook.  Keyed off the
        ABC's own name so one method covers every exported stub; unlisted
        ABCs keep the old "always False" behaviour."""
        name = cls.__name__
        if name == "Mapping" or name == "MutableMapping":
            return isinstance(instance, dict)
        if name == "Sequence" or name == "MutableSequence" or name == "Reversible":
            return isinstance(instance, (list, tuple, str, bytes, bytearray))
        if name == "Set" or name == "MutableSet":
            return isinstance(instance, (set, frozenset))
        if (
            name == "Iterable"
            or name == "Container"
            or name == "Collection"
            or name == "Sized"
        ):
            return isinstance(
                instance, (list, tuple, dict, set, frozenset, str, bytes, bytearray)
            )
        return False


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
class Mapping(_ABCStub):
    # GRAIL: real mixin methods (as in CPython's collections.abc.Mapping)
    # built on the subclass's __getitem__/__iter__/__len__, so
    # ``CaseInsensitiveMapping`` (django's HttpHeaders base) inherits
    # a working .get/.keys/.items/.values/__contains__/__eq__.
    def get(self, key, default=None):
        try:
            return self[key]
        except KeyError:
            return default

    def __contains__(self, key):
        try:
            self[key]
        except KeyError:
            return False
        return True

    def keys(self):
        return list(self.__iter__())

    def items(self):
        return [(k, self[k]) for k in self.__iter__()]

    def values(self):
        return [self[k] for k in self.__iter__()]

    def __eq__(self, other):
        if not isinstance(other, Mapping):
            return NotImplemented
        return dict(self.items()) == dict(other.items())

    def __ne__(self, other):
        result = self.__eq__(other)
        if result is NotImplemented:
            return result
        return not result


class MutableMapping(Mapping):
    __marker = object()

    def pop(self, key, default=__marker):
        try:
            value = self[key]
        except KeyError:
            if default is self.__marker:
                raise
            return default
        else:
            del self[key]
            return value

    def setdefault(self, key, default=None):
        try:
            return self[key]
        except KeyError:
            self[key] = default
        return default

    def update(self, other=(), **kwds):
        if hasattr(other, "keys"):
            for key in other.keys():
                self[key] = other[key]
        else:
            for key, value in other:
                self[key] = value
        for key, value in kwds.items():
            self[key] = value
class Set(_ABCStub): pass
class MutableSet(_ABCStub): pass
class Container(_ABCStub): pass
class Sized(_ABCStub): pass
class Collection(_ABCStub): pass
class AsyncIterable(_ABCStub): pass
class AsyncIterator(_ABCStub): pass
class AsyncGenerator(_ABCStub): pass
class Reversible(_ABCStub): pass
class ByteString(_ABCStub): pass
class ItemsView(_ABCStub): pass
class KeysView(_ABCStub): pass
class ValuesView(_ABCStub): pass
class MappingView(_ABCStub): pass


__all__ = [
    'Hashable', 'Callable', 'Iterable', 'Iterator', 'Generator',
    'Coroutine', 'Awaitable', 'Sequence', 'MutableSequence',
    'Mapping', 'MutableMapping', 'Set', 'MutableSet', 'Container',
    'Sized', 'Collection',
    'AsyncIterable', 'AsyncIterator', 'AsyncGenerator',
    'Reversible', 'ByteString',
    'ItemsView', 'KeysView', 'ValuesView', 'MappingView',
]
