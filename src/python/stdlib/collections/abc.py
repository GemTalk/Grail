# GRAIL collections.abc -- recognizing ABCs.
#
# CPython's collections.abc has ~20 abstract base classes used pervasively
# for isinstance()/issubclass() checks, as mixin bases, and as
# type-annotation generics (``Callable[[int], str]``).  This Grail version
# gives them REAL semantics without CPython's ABCMeta machinery:
#
#   * The ABCs form CPython's actual inheritance DAG (Sequence inherits
#     Reversible and Collection, ...).  Grail keeps the first base on the
#     Smalltalk chain and records the rest in the C3 MI registry, which
#     builtins isinstance/issubclass already consult -- so
#     ``issubclass(Sequence, Reversible)`` holds with no hook at all, and a
#     user class that REALLY subclasses an ABC passes both checks on the
#     ordinary chain.  (Method inheritance still follows the FIRST base
#     only -- Grail has no MRO-walk dispatch -- so every composite ABC
#     defines its mixin methods locally rather than relying on a secondary
#     base.)
#   * The "one-trick pony" ABCs (Hashable, Iterable, Iterator, Reversible,
#     Sized, Container, Callable, async variants) do STRUCTURAL checks --
#     CPython implements those with __subclasshook__; here the shared
#     __instancecheck__/__subclasscheck__ classmethods (reached through the
#     metaclass-chain probes in builtins.gs, which fire only after the real
#     class chain and C3 MRO both miss) test for the protocol methods,
#     honoring the ``__iter__ = None`` blocking convention.
#   * The composite ABCs (Sequence, Mapping, Set, ...) are NOT structural in
#     CPython and are not here either: they recognize builtin types via
#     explicit whitelists (standing in for CPython's _collections_abc
#     ``.register(list)`` calls) plus a module-level virtual-subclass
#     registry that ``ABC.register(cls)`` feeds.
#   * Mixin methods are provided on the composite ABCs (Sequence.index,
#     Set.__le__, MutableMapping.update, ...) so tiny concrete subclasses
#     get working derived behavior, as in CPython.
#
# Deliberate approximations (documented, test-visible):
#   * No ABCMeta and no instantiation enforcement -- ``Hashable()`` does not
#     raise.  (A __new__ check is possible but would run on every
#     instantiation of every ABC subclass, e.g. Werkzeug's HeaderSet.)
#   * Hashability is decided by CPython ground truth for builtins
#     (list/set/dict/bytearray unhashable) plus the ``__hash__ = None``
#     convention for user classes -- Grail's builtin classes carry internal
#     hash methods that would fool a purely structural probe.

_registry = {}  # ABC name -> list of classes registered via ABC.register()

# Protocol methods per structural ABC (CPython's __subclasshook__ set: the
# one-trick ponies plus Collection and Generator, which are structural
# upstream too).
_STRUCTURAL = {
    'Hashable': ('__hash__',),
    'Callable': ('__call__',),
    'Iterable': ('__iter__',),
    'Iterator': ('__iter__', '__next__'),
    'Reversible': ('__reversed__', '__iter__'),
    'Sized': ('__len__',),
    'Container': ('__contains__',),
    'Collection': ('__len__', '__iter__', '__contains__'),
    'Generator': ('__iter__', '__next__', 'send', 'throw', 'close'),
    'AsyncIterable': ('__aiter__',),
    'AsyncIterator': ('__aiter__', '__anext__'),
    'Awaitable': ('__await__',),
}

_UNHASHABLE_BUILTINS = (list, set, dict, bytearray)

# Builtins CPython registers as virtual subclasses of the composite ABCs in
# _collections_abc; these whitelists are the Grail equivalent.  Used for both
# instance checks (via isinstance against the tuple) and subclass checks.
# CPython registration propagates to ancestor ABCs (bytes registered on
# Sequence counts for Reversible too) -- the Reversible row spells that out.
_BUILTIN_WHITELIST = {
    'Mapping': (dict,),
    'MutableMapping': (dict,),
    'Sequence': (list, tuple, str, bytes, bytearray),
    'MutableSequence': (list, bytearray),
    'Set': (set, frozenset),
    'MutableSet': (set,),
    'ByteString': (bytes, bytearray),
    'Buffer': (bytes, bytearray),
    'Reversible': (list, tuple, str, bytes, bytearray, dict),
}

# Concrete iterator/generator classes, captured at import so the structural
# checks can recognize builtin iterators whose Grail classes share the
# backing collection's hierarchy (a list iterator must be Iterator/Iterable
# but NOT Sized/Reversible/Collection, whatever its Smalltalk parentage).


def _gen():
    yield None


_GEN_TYPE = type(_gen())
_ITER_TYPES = (type(iter([])), type(iter(())), type(iter({})),
               type(iter(set())), type(iter('')), _GEN_TYPE)


def _has(obj, names):
    # Protocol probe.  Two layers: getattr first, honoring the
    # ``__iter__ = None`` blocking convention (a None class attr shadows an
    # inherited real method); then Grail's ___hasProtocol___ ownership check,
    # because PythonInstance compiles catchable-TypeError FALLBACKS for
    # __iter__/__next__/__getitem__ onto every instance -- getattr alone
    # would make every object look Iterable.
    for n in names:
        if getattr(obj, n, None) is None:
            return False
        if not ___hasProtocol___(obj, n):
            return False
    return True


class _ABCRoot:
    """Shared ABC machinery; every exported ABC descends from this, so the
    classmethods below are found through the metaclass chain by the
    ``__instancecheck__:`` / ``__subclasscheck__:`` probes in builtins.gs."""

    def __getitem__(self, item):
        return self

    def __class_getitem__(cls, item):
        # ``Callable[[int], str]`` / ``MutableSet[str]`` -- generics erase.
        return cls

    def __call__(self, *args, **kwargs):
        return self

    @classmethod
    def register(cls, sub_cls):
        """CPython's ABC.register(cls): record a virtual subclass.  The
        registry feeds __instancecheck__/__subclasscheck__; returns the
        argument (documented contract, usable as a class decorator)."""
        name = cls.__name__
        if name not in _registry:
            _registry[name] = []
        _registry[name].append(sub_cls)
        return sub_cls

    def __subclasshook__(self, cls):
        return NotImplemented

    @classmethod
    def __instancecheck__(cls, instance):
        """isinstance(x, ABC) fallback -- builtins.gs calls this only after
        the real class chain and C3 MRO both missed, so real subclasses
        never reach here.  Order: registry (registration wins in CPython),
        callable/iterator special cases, builtin whitelist, structural
        protocol."""
        name = cls.__name__
        regs = _registry.get(name)
        if regs is not None:
            for r in regs:
                if isinstance(instance, r):
                    return True
        if name == 'Callable':
            return callable(instance) is True
        # Builtin iterators/generators: their Grail classes share the backing
        # collection's Smalltalk hierarchy, so both the whitelists and the
        # ownership-based structural probes would misclassify them -- decide
        # them explicitly and stop.
        if type(instance) in _ITER_TYPES:
            if name in ('Iterable', 'Iterator'):
                return True
            if name == 'Generator':
                return type(instance) is _GEN_TYPE
            return False
        if name == 'Hashable':
            if isinstance(instance, _UNHASHABLE_BUILTINS):
                return False
            return getattr(instance, '__hash__', 'missing') is not None
        builtin = _BUILTIN_WHITELIST.get(name)
        if builtin is not None and isinstance(instance, builtin):
            return True
        structural = _STRUCTURAL.get(name)
        if structural is not None and _has(instance, structural):
            return True
        return False

    @classmethod
    def __subclasscheck__(cls, sub):
        """issubclass(C, ABC) fallback -- same layering as
        __instancecheck__, applied to the class object."""
        name = cls.__name__
        regs = _registry.get(name)
        if regs is not None:
            for r in regs:
                if sub is r or issubclass(sub, r):
                    return True
        if sub in _ITER_TYPES:
            if name in ('Iterable', 'Iterator'):
                return True
            if name == 'Generator':
                return sub is _GEN_TYPE
            return False
        if name == 'Hashable':
            for b in _UNHASHABLE_BUILTINS:
                if sub is b or issubclass(sub, b):
                    return False
            return getattr(sub, '__hash__', 'missing') is not None
        builtin = _BUILTIN_WHITELIST.get(name)
        if builtin is not None:
            for b in builtin:
                if sub is b or issubclass(sub, b):
                    return True
        structural = _STRUCTURAL.get(name)
        if structural is not None and _has(sub, structural):
            return True
        return False


# ---------------------------------------------------------------------------
# The ABC DAG (CPython's real bases; the first base carries the Smalltalk
# chain, the rest live in the C3 MI registry for isinstance/issubclass).
# ---------------------------------------------------------------------------

class Hashable(_ABCRoot): pass
class Callable(_ABCRoot): pass
class Sized(_ABCRoot): pass
class Container(_ABCRoot): pass
class Buffer(_ABCRoot): pass


class Iterable(_ABCRoot):
    def __iter__(self):
        return iter([])


class Iterator(Iterable):
    def __next__(self):
        raise StopIteration

    def __iter__(self):
        return self


class Reversible(Iterable): pass


class Generator(Iterator):
    def send(self, value):
        raise StopIteration

    def throw(self, typ, val=None, tb=None):
        raise typ

    def close(self):
        pass


class Awaitable(_ABCRoot): pass
class Coroutine(Awaitable): pass
class AsyncIterable(_ABCRoot): pass
class AsyncIterator(AsyncIterable): pass
class AsyncGenerator(AsyncIterator): pass


class Collection(Sized, Iterable, Container): pass


class Sequence(Reversible, Collection):
    """Mixin methods derive everything from __getitem__ + __len__."""

    def __iter__(self):
        i = 0
        result = []
        try:
            while True:
                result.append(self[i])
                i += 1
        except IndexError:
            pass
        return iter(result)

    def __contains__(self, value):
        for v in self:
            if v is value or v == value:
                return True
        return False

    def __reversed__(self):
        result = []
        i = len(self) - 1
        while i >= 0:
            result.append(self[i])
            i -= 1
        return iter(result)

    def index(self, value, start=0, stop=None):
        if start is not None and start < 0:
            start = len(self) + start
            if start < 0:
                start = 0
        if stop is not None and stop < 0:
            stop += len(self)
        i = start
        while stop is None or i < stop:
            try:
                v = self[i]
            except IndexError:
                break
            if v is value or v == value:
                return i
            i += 1
        raise ValueError

    def count(self, value):
        n = 0
        for v in self:
            if v is value or v == value:
                n += 1
        return n


class MutableSequence(Sequence):
    def append(self, value):
        self.insert(len(self), value)

    def clear(self):
        try:
            while True:
                self.pop()
        except IndexError:
            pass

    def reverse(self):
        n = len(self)
        i = 0
        while i < (n // 2):
            tmp = self[i]
            self[i] = self[n - i - 1]
            self[n - i - 1] = tmp
            i += 1

    def extend(self, values):
        if values is self:
            values = list(values)
        for v in values:
            self.append(v)

    def pop(self, index=-1):
        v = self[index]
        del self[index]
        return v

    def remove(self, value):
        del self[self.index(value)]

    def __iadd__(self, values):
        self.extend(values)
        return self


class ByteString(Sequence): pass


class Set(Collection):
    """Mixin methods derive the set algebra from __contains__ + __iter__ +
    __len__, exactly as CPython's collections.abc.Set does."""

    @classmethod
    def _from_iterable(cls, it):
        return cls(it)

    def __le__(self, other):
        if not isinstance(other, Set):
            return NotImplemented
        if len(self) > len(other):
            return False
        for elem in self:
            if elem not in other:
                return False
        return True

    def __lt__(self, other):
        if not isinstance(other, Set):
            return NotImplemented
        return len(self) < len(other) and self.__le__(other)

    def __gt__(self, other):
        if not isinstance(other, Set):
            return NotImplemented
        return len(self) > len(other) and self.__ge__(other)

    def __ge__(self, other):
        if not isinstance(other, Set):
            return NotImplemented
        if len(self) < len(other):
            return False
        for elem in other:
            if elem not in self:
                return False
        return True

    def __eq__(self, other):
        if not isinstance(other, Set):
            return NotImplemented
        return len(self) == len(other) and self.__le__(other)

    def __ne__(self, other):
        result = self.__eq__(other)
        if result is NotImplemented:
            return result
        return not result

    def __and__(self, other):
        if not isinstance(other, Iterable):
            return NotImplemented
        result = []
        for value in other:
            if value in self:
                result.append(value)
        return self._from_iterable(result)

    __rand__ = __and__

    def __or__(self, other):
        if not isinstance(other, Iterable):
            return NotImplemented
        chain = list(self)
        for v in other:
            chain.append(v)
        return self._from_iterable(chain)

    __ror__ = __or__

    def __sub__(self, other):
        if not isinstance(other, Set):
            if not isinstance(other, Iterable):
                return NotImplemented
            other = self._from_iterable(other)
        result = []
        for value in self:
            if value not in other:
                result.append(value)
        return self._from_iterable(result)

    def __rsub__(self, other):
        if not isinstance(other, Set):
            if not isinstance(other, Iterable):
                return NotImplemented
            other = self._from_iterable(other)
        result = []
        for value in other:
            if value not in self:
                result.append(value)
        return self._from_iterable(result)

    def __xor__(self, other):
        if not isinstance(other, Set):
            if not isinstance(other, Iterable):
                return NotImplemented
            other = self._from_iterable(other)
        return (self - other) | (other - self)

    __rxor__ = __xor__

    def isdisjoint(self, other):
        for value in other:
            if value in self:
                return False
        return True

    def _hash(self):
        n = len(self)
        h = 1927868237 * (n + 1)
        h &= 0xFFFFFFFFFFFFFFFF
        for x in self:
            hx = hash(x)
            h ^= (hx ^ (hx << 16) ^ 89869747) * 3644798167
            h &= 0xFFFFFFFFFFFFFFFF
        h = h * 69069 + 907133923
        h &= 0xFFFFFFFFFFFFFFFF
        if h > 0x7FFFFFFFFFFFFFFF:
            h -= 0x10000000000000000
        if h == -1:
            h = 590923713
        return h


class MutableSet(Set):
    def remove(self, value):
        if value not in self:
            raise KeyError(value)
        self.discard(value)

    def pop(self):
        it = iter(self)
        try:
            value = next(it)
        except StopIteration:
            raise KeyError
        self.discard(value)
        return value

    def clear(self):
        try:
            while True:
                self.pop()
        except KeyError:
            pass

    def __ior__(self, it):
        for value in it:
            self.add(value)
        return self

    def __iand__(self, it):
        for value in (self - it):
            self.discard(value)
        return self

    def __ixor__(self, it):
        if it is self:
            self.clear()
        else:
            if not isinstance(it, Set):
                it = self._from_iterable(it)
            for value in it:
                if value in self:
                    self.discard(value)
                else:
                    self.add(value)
        return self

    def __isub__(self, it):
        if it is self:
            self.clear()
        else:
            for value in it:
                self.discard(value)
        return self


class Mapping(Collection):
    # Real mixin methods (as in CPython's collections.abc.Mapping) built on
    # the subclass's __getitem__/__iter__/__len__, so e.g.
    # ``CaseInsensitiveMapping`` (django's HttpHeaders base) inherits a
    # working .get/.keys/.items/.values/__contains__/__eq__.
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

    def popitem(self):
        try:
            key = next(iter(self))
        except StopIteration:
            raise KeyError
        value = self[key]
        del self[key]
        return key, value

    def setdefault(self, key, default=None):
        try:
            return self[key]
        except KeyError:
            self[key] = default
        return default

    def clear(self):
        try:
            while True:
                self.popitem()
        except KeyError:
            pass

    def update(self, other=(), **kwds):
        if hasattr(other, "keys"):
            for key in other.keys():
                self[key] = other[key]
        else:
            for key, value in other:
                self[key] = value
        for key, value in kwds.items():
            self[key] = value


class MappingView(Sized):
    def __init__(self, mapping):
        self._mapping = mapping

    def __len__(self):
        return len(self._mapping)


class KeysView(MappingView, Set):
    @classmethod
    def _from_iterable(cls, it):
        return set(it)

    def __contains__(self, key):
        return key in self._mapping

    def __iter__(self):
        return iter(list(self._mapping))


class ItemsView(MappingView, Set):
    @classmethod
    def _from_iterable(cls, it):
        return set(it)

    def __contains__(self, item):
        key, value = item
        try:
            v = self._mapping[key]
        except KeyError:
            return False
        return v is value or v == value

    def __iter__(self):
        result = []
        for key in self._mapping:
            result.append((key, self._mapping[key]))
        return iter(result)


class ValuesView(MappingView, Collection):
    def __contains__(self, value):
        for key in self._mapping:
            v = self._mapping[key]
            if v is value or v == value:
                return True
        return False

    def __iter__(self):
        result = []
        for key in self._mapping:
            result.append(self._mapping[key])
        return iter(result)


__all__ = [
    'Hashable', 'Callable', 'Iterable', 'Iterator', 'Generator',
    'Coroutine', 'Awaitable', 'Sequence', 'MutableSequence',
    'Mapping', 'MutableMapping', 'Set', 'MutableSet', 'Container',
    'Sized', 'Collection',
    'AsyncIterable', 'AsyncIterator', 'AsyncGenerator',
    'Reversible', 'ByteString', 'Buffer',
    'ItemsView', 'KeysView', 'ValuesView', 'MappingView',
]
