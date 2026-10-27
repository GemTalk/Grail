# Copyright 2007 Google, Inc. All Rights Reserved.
# Licensed to PSF under a Contributor Agreement.

"""Abstract Base Classes (ABCs) according to PEP 3119."""


def abstractmethod(funcobj):
    """A decorator indicating abstract methods.

    Requires that the metaclass is ABCMeta or derived from it.  A
    class that has a metaclass derived from ABCMeta cannot be
    instantiated unless all of its abstract methods are overridden.
    The abstract methods can be called using any of the normal
    'super' call mechanisms.  abstractmethod() may be used to declare
    abstract methods for properties and descriptors.

    Usage:

        class C(metaclass=ABCMeta):
            @abstractmethod
            def my_abstract_method(self, arg1, arg2, argN):
                ...
    """
    funcobj.__isabstractmethod__ = True
    return funcobj


class abstractclassmethod(classmethod):
    """A decorator indicating abstract classmethods.

    Deprecated, use 'classmethod' with 'abstractmethod' instead:

        class C(ABC):
            @classmethod
            @abstractmethod
            def my_abstract_classmethod(cls, ...):
                ...

    """

    __isabstractmethod__ = True

    def __init__(self, callable):
        callable.__isabstractmethod__ = True
        super().__init__(callable)


class abstractstaticmethod(staticmethod):
    """A decorator indicating abstract staticmethods.

    Deprecated, use 'staticmethod' with 'abstractmethod' instead:

        class C(ABC):
            @staticmethod
            @abstractmethod
            def my_abstract_staticmethod(...):
                ...

    """

    __isabstractmethod__ = True

    def __init__(self, callable):
        callable.__isabstractmethod__ = True
        super().__init__(callable)


class abstractproperty(property):
    """A decorator indicating abstract properties.

    Deprecated, use 'property' with 'abstractmethod' instead:

        class C(ABC):
            @property
            @abstractmethod
            def my_abstract_property(self):
                ...

    """

    __isabstractmethod__ = True


# GRAIL DEVIATION: the caches belong to a SESSION.  CPython's ABC caches live
# as long as the process, and every answer in them was computed by it.  Grail
# commits a deployed module's classes, caches included, so a later session
# starts from caches another session left -- ones filled partway through the
# deploy, before every registration had been made -- and from nothing else
# once its own session-local stores are gone (the class-attribute overlay a
# canonical class writes to can be dropped wholesale; DunderNewTestCase's
# overlay test does exactly that, and ``issubclass(Sequence, Reversible)''
# then read False out of the committed negative cache).  So each ABC records
# the session its caches were built in and discards them the first time a
# different session consults them.  The registry is not a cache and is kept.
# The session is identified by a token made once per LOGIN and kept in a
# SessionDict, which is never committed.  It used to be the gem's process id,
# but one process can log in more than once (linked topaz, a long-lived tool
# that logs out and back in), and every login after the first then took the
# committed caches for its own and wrote them on each check (#1229).
from _grail_session import SessionDict as _GrailSessionDict
_grail_session_state = _GrailSessionDict("abc.session")


def _grail_session_token():
    token = _grail_session_state.get("token")
    if token is None:
        token = _grail_session_state["token"] = object()
    return token


def _grail_session_caches(cls):
    token = _grail_session_token()
    if getattr(cls, '_abc_cache_session', None) != token:
        cls._abc_cache = WeakSet()
        cls._abc_negative_cache = WeakSet()
        cls._abc_negative_cache_version = ABCMeta._abc_invalidation_counter
        cls._abc_cache_session = token


# GRAIL DEVIATION: there is no _abc accelerator, so CPython would take the
# ``except ImportError`` branch and re-export _py_abc's pure-Python ABCMeta.
# That class is defined HERE instead -- its code is _py_abc's, verbatim below
# -- because Grail persists deployed modules, and a class that already has
# instances in the repository may not stop being defined by the module that
# defined it (gemdb refuses the import).  ``abc.ABCMeta.__module__`` is 'abc'
# either way; _py_abc re-exports this class.  WeakSet comes from weakref,
# which is where Grail keeps it (there is no _weakrefset).
try:
    from _abc import (get_cache_token, _abc_init, _abc_register,
                      _abc_instancecheck, _abc_subclasscheck, _get_dump,
                      _reset_registry, _reset_caches)
except ImportError:
    from weakref import WeakSet
    def get_cache_token():
        """Returns the current ABC cache token.

        The token is an opaque object (supporting equality testing) identifying the
        current version of the ABC cache for virtual subclasses. The token changes
        with every call to ``register()`` on any ABC.
        """
        return ABCMeta._abc_invalidation_counter


    class ABCMeta(type):
        """Metaclass for defining Abstract Base Classes (ABCs).

        Use this metaclass to create an ABC.  An ABC can be subclassed
        directly, and then acts as a mix-in class.  You can also register
        unrelated concrete classes (even built-in classes) and unrelated
        ABCs as 'virtual subclasses' -- these and their descendants will
        be considered subclasses of the registering ABC by the built-in
        issubclass() function, but the registering ABC won't show up in
        their MRO (Method Resolution Order) nor will method
        implementations defined by the registering ABC be callable (not
        even via super()).
        """

        # A global counter that is incremented each time a class is
        # registered as a virtual subclass of anything.  It forces the
        # negative cache to be cleared before its next use.
        # Note: this counter is private. Use `abc.get_cache_token()` for
        #       external code.
        _abc_invalidation_counter = 0

        def __new__(mcls, name, bases, namespace, /, **kwargs):
            cls = super().__new__(mcls, name, bases, namespace, **kwargs)
            # Compute set of abstract method names
            abstracts = {name
                         for name, value in namespace.items()
                         if getattr(value, "__isabstractmethod__", False)}
            for base in bases:
                for name in getattr(base, "__abstractmethods__", set()):
                    value = getattr(cls, name, None)
                    if getattr(value, "__isabstractmethod__", False):
                        abstracts.add(name)
            cls.__abstractmethods__ = frozenset(abstracts)
            # Set up inheritance registry
            # GRAIL DEVIATION: the registry is a STRONG set.  Grail commits a
            # deployed module's classes to the repository, and the weak
            # references a WeakSet holds do not come back with them: a fresh
            # session found every ABC's registry empty, so
            # ``Iterator.register(list_iterator)`` and every other
            # registration _collections_abc makes at import were lost.  The
            # caches stay weak -- losing a cache entry costs a recomputation,
            # not an answer.  The price is that a registered class is kept
            # alive by the ABC, which CPython avoids; registrations are
            # overwhelmingly of long-lived classes.
            cls._abc_registry = set()
            cls._abc_cache = WeakSet()
            cls._abc_negative_cache = WeakSet()
            cls._abc_negative_cache_version = ABCMeta._abc_invalidation_counter
            cls._abc_cache_session = _grail_session_token()
            return cls

        def register(cls, subclass):
            """Register a virtual subclass of an ABC.

            Returns the subclass, to allow usage as a class decorator.
            """
            if not isinstance(subclass, type):
                raise TypeError("Can only register classes")
            if issubclass(subclass, cls):
                return subclass  # Already a subclass
            # Subtle: test for cycles *after* testing for "already a subclass";
            # this means we allow X.register(X) and interpret it as a no-op.
            if issubclass(cls, subclass):
                # This would create a cycle, which is bad for the algorithm below
                raise RuntimeError("Refusing to create an inheritance cycle")
            cls._abc_registry.add(subclass)
            ABCMeta._abc_invalidation_counter += 1  # Invalidate negative cache
            _grail_register_collection_flag(cls, subclass)
            return subclass

        def _dump_registry(cls, file=None):
            """Debug helper to print the ABC registry."""
            print(f"Class: {cls.__module__}.{cls.__qualname__}", file=file)
            print(f"Inv. counter: {get_cache_token()}", file=file)
            for name in cls.__dict__:
                if name.startswith("_abc_"):
                    value = getattr(cls, name)
                    if isinstance(value, WeakSet):
                        value = set(value)
                    print(f"{name}: {value!r}", file=file)

        def _abc_registry_clear(cls):
            """Clear the registry (for debugging or testing)."""
            cls._abc_registry.clear()

        def _abc_caches_clear(cls):
            """Clear the caches (for debugging or testing)."""
            cls._abc_cache.clear()
            cls._abc_negative_cache.clear()

        def __instancecheck__(cls, instance):
            """Override for isinstance(instance, cls)."""
            # Inline the cache checking
            _grail_session_caches(cls)
            try:
                subclass = instance.__class__
            except AttributeError:
                # Fall back to the type when the instance has no __class__,
                # as the built-in isinstance() does (CPython 3.14.8,
                # gh-153772).
                subclass = type(instance)
            if subclass in cls._abc_cache:
                return True
            subtype = type(instance)
            if subtype is subclass:
                if (cls._abc_negative_cache_version ==
                    ABCMeta._abc_invalidation_counter and
                    subclass in cls._abc_negative_cache):
                    return False
                # Fall back to the subclass check.
                return cls.__subclasscheck__(subclass)
            return any(cls.__subclasscheck__(c) for c in (subclass, subtype))

        def __subclasscheck__(cls, subclass):
            """Override for issubclass(subclass, cls)."""
            if not isinstance(subclass, type):
                raise TypeError('issubclass() arg 1 must be a class')
            _grail_session_caches(cls)
            # Check cache
            if subclass in cls._abc_cache:
                return True
            # Check negative cache; may have to invalidate
            if cls._abc_negative_cache_version < ABCMeta._abc_invalidation_counter:
                # Invalidate the negative cache
                cls._abc_negative_cache = WeakSet()
                cls._abc_negative_cache_version = ABCMeta._abc_invalidation_counter
            elif subclass in cls._abc_negative_cache:
                return False
            # Check the subclass hook
            ok = cls.__subclasshook__(subclass)
            if ok is not NotImplemented:
                assert isinstance(ok, bool)
                if ok:
                    cls._abc_cache.add(subclass)
                else:
                    cls._abc_negative_cache.add(subclass)
                return ok
            # Check if it's a direct subclass
            if cls in getattr(subclass, '__mro__', ()):
                cls._abc_cache.add(subclass)
                return True
            # Check if it's a subclass of a registered class (recursive)
            for rcls in cls._abc_registry:
                if issubclass(subclass, rcls):
                    cls._abc_cache.add(subclass)
                    return True
            # Check if it's a subclass of a subclass (recursive)
            for scls in cls.__subclasses__():
                if issubclass(subclass, scls):
                    cls._abc_cache.add(subclass)
                    return True
            # No dice; update negative cache
            cls._abc_negative_cache.add(subclass)
            return False
else:
    class ABCMeta(type):
        """Metaclass for defining Abstract Base Classes (ABCs).

        Use this metaclass to create an ABC.  An ABC can be subclassed
        directly, and then acts as a mix-in class.  You can also register
        unrelated concrete classes (even built-in classes) and unrelated
        ABCs as 'virtual subclasses' -- these and their descendants will
        be considered subclasses of the registering ABC by the built-in
        issubclass() function, but the registering ABC won't show up in
        their MRO (Method Resolution Order) nor will method
        implementations defined by the registering ABC be callable (not
        even via super()).
        """
        def __new__(mcls, name, bases, namespace, /, **kwargs):
            cls = super().__new__(mcls, name, bases, namespace, **kwargs)
            _abc_init(cls)
            return cls

        def register(cls, subclass):
            """Register a virtual subclass of an ABC.

            Returns the subclass, to allow usage as a class decorator.
            """
            return _abc_register(cls, subclass)

        def __instancecheck__(cls, instance):
            """Override for isinstance(instance, cls)."""
            return _abc_instancecheck(cls, instance)

        def __subclasscheck__(cls, subclass):
            """Override for issubclass(subclass, cls)."""
            return _abc_subclasscheck(cls, subclass)

        def _dump_registry(cls, file=None):
            """Debug helper to print the ABC registry."""
            print(f"Class: {cls.__module__}.{cls.__qualname__}", file=file)
            print(f"Inv. counter: {get_cache_token()}", file=file)
            (_abc_registry, _abc_cache, _abc_negative_cache,
             _abc_negative_cache_version) = _get_dump(cls)
            print(f"_abc_registry: {_abc_registry!r}", file=file)
            print(f"_abc_cache: {_abc_cache!r}", file=file)
            print(f"_abc_negative_cache: {_abc_negative_cache!r}", file=file)
            print(f"_abc_negative_cache_version: {_abc_negative_cache_version!r}",
                  file=file)

        def _abc_registry_clear(cls):
            """Clear the registry (for debugging or testing)."""
            _reset_registry(cls)

        def _abc_caches_clear(cls):
            """Clear the caches (for debugging or testing)."""
            _reset_caches(cls)


# GRAIL: Py_TPFLAGS_SEQUENCE and Py_TPFLAGS_MAPPING, the type flags a sequence
# or a mapping pattern tests (MATCH_SEQUENCE / MATCH_MAPPING), which Grail's
# classes have no field for.  A type has the flag of the first class in its
# MRO that has one (Objects/typeobject.c, inherit_patma_flags): a built-in that
# carries it natively, an ABC that declares __abc_tpflags__ (Sequence,
# Mapping), or a class an ABC with the flag registered -- registration sets it
# (Modules/_abc.c:594), and _py_abc's register, the one this module defines,
# never did.  Registrations are kept here, beside the registries themselves.
_GRAIL_SEQUENCE_FLAG = 1 << 5
_GRAIL_MAPPING_FLAG = 1 << 6
_grail_registered_collection_flags = {}


def _grail_native_collection_flags():
    import types
    return {list: _GRAIL_SEQUENCE_FLAG, tuple: _GRAIL_SEQUENCE_FLAG,
            range: _GRAIL_SEQUENCE_FLAG, memoryview: _GRAIL_SEQUENCE_FLAG,
            dict: _GRAIL_MAPPING_FLAG, types.MappingProxyType: _GRAIL_MAPPING_FLAG}


def _grail_collection_flag(cls):
    """The Py_TPFLAGS_SEQUENCE or Py_TPFLAGS_MAPPING bit cls carries, or 0."""
    native = _grail_native_collection_flags()
    for base in cls.__mro__:
        if base in native:
            return native[base]
        if _grail_is_builtin(base):
            # A built-in without the flag -- str, bytes, bytearray, object --
            # carries none whatever is registered: CPython leaves an
            # immutable type's flags alone (_PyType_SetFlagsRecursive).
            continue
        flag = _grail_registered_collection_flags.get(base)
        if flag is None:
            flag = base.__dict__.get('__abc_tpflags__', 0) & (
                _GRAIL_SEQUENCE_FLAG | _GRAIL_MAPPING_FLAG)
        if flag:
            return flag
    return 0


def _grail_is_builtin(cls):
    # Not every Grail built-in answers __module__ (mappingproxy does not).
    return getattr(cls, '__module__', 'builtins') == 'builtins'


def _grail_register_collection_flag(abc, subclass):
    flag = _grail_collection_flag(abc)
    if flag and not _grail_is_builtin(subclass):
        _grail_registered_collection_flags[subclass] = flag


def update_abstractmethods(cls):
    """Recalculate the set of abstract methods of an abstract class.

    If a class has had one of its abstract methods implemented after the
    class was created, the method will not be considered implemented until
    this function is called. Alternatively, if a new abstract method has been
    added to the class, it will only be considered an abstract method of the
    class after this function is called.

    This function should be called before any use is made of the class,
    usually in class decorators that add methods to the subject class.

    Returns cls, to allow usage as a class decorator.

    If cls is not an instance of ABCMeta, does nothing.
    """
    if not hasattr(cls, '__abstractmethods__'):
        # We check for __abstractmethods__ here because cls might by a C
        # implementation or a python implementation (especially during
        # testing), and we want to handle both cases.
        return cls

    abstracts = set()
    # Check the existing abstract methods of the parents, keep only the ones
    # that are not implemented.
    for scls in cls.__bases__:
        for name in getattr(scls, '__abstractmethods__', ()):
            value = getattr(cls, name, None)
            if getattr(value, "__isabstractmethod__", False):
                abstracts.add(name)
    # Also add any other newly added abstract methods.
    for name, value in cls.__dict__.items():
        if getattr(value, "__isabstractmethod__", False):
            abstracts.add(name)
    cls.__abstractmethods__ = frozenset(abstracts)
    return cls


class ABC(metaclass=ABCMeta):
    """Helper class that provides a standard way to create an ABC using
    inheritance.
    """
    __slots__ = ()


# GRAIL: collections/abc.py is Grail's own and keeps its own virtual-subclass
# registry, so a registration there has to invalidate the cache token
# functools.singledispatch compares against -- the token is ABCMeta's counter.
def _bump_invalidation_counter():
    ABCMeta._abc_invalidation_counter += 1
    return ABCMeta._abc_invalidation_counter
