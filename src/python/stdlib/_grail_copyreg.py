# The Python-level half of Grail's ``copyreg``.
#
# ``copyreg`` itself is a native Smalltalk module (src/smalltalk/Python/
# copyreg.gs), and it has to stay one: its tables are SESSION-LOCAL state held
# class-side, which a deployed Python module cannot offer -- a module global
# dictionary is committed with the module, so a later session's registrations
# would write the deploy session's dictionary (docs/Persistent_Modules_and_
# Classes.md par.4.3, par.8.7).
#
# What CPython's copyreg.py defines as plain FUNCTIONS lives here instead, and
# the native module hands these objects out as its own attributes
# (``copyreg.__newobj__ is _grail_copyreg.__newobj__``).  The bodies are
# CPython 3.14's, except where noted; the tables they read and write are
# reached through ``copyreg`` at call time, never bound here.
#
# pickle names these functions on the wire as ``copyreg.<name>`` -- see
# pickle._GRAIL_MODULE_ALIASES -- so a pickle written here reads in CPython.


def __newobj__(cls, *args):
    return cls.__new__(cls, *args)


def __newobj_ex__(cls, args, kwargs):
    """Used by pickle protocol 4, instead of __newobj__ to allow classes with
    keyword-only arguments to be pickled correctly.
    """
    return cls.__new__(cls, *args, **kwargs)


def _reconstructor(cls, base, state):
    if base is object:
        obj = object.__new__(cls)
    else:
        obj = base.__new__(cls, state)
        if base.__init__ != object.__init__:
            base.__init__(obj, state)
    return obj


def _is_python_defined(cls):
    # ClassDefAst stamps every class it builds; see pickle._is_python_subclass.
    return hasattr(cls, '___pyDefinedClass___')


_PUBLIC_BUILTINS = (int, float, complex, str, bytes, bytearray, tuple,
                    frozenset, list, dict, set)


def _public_builtin(cls, base):
    """The public builtin a Grail implementation root stands for.

    GRAIL: a subclass of int/float/str is rooted at AbstractPyInt/
    AbstractPyFloat/AbstractPyStr, and __mro__ reports that root -- whose repr
    reads <class 'int'> -- rather than int itself.  The root is not callable
    as the builtin is: ``AbstractPyInt(I(7))'' sends ``I new'', an uncatchable
    MessageNotUnderstood.  So the base found in the MRO is mapped back to the
    builtin that shares its name, which is the class CPython would have found."""
    name = getattr(base, '__name__', None)
    for t in _PUBLIC_BUILTINS:
        if t.__name__ == name and issubclass(cls, t):
            return t
    return base


def _defines_getstate(cls):
    for klass in cls.__mro__:
        if _is_python_defined(klass) and '__getstate__' in klass.__dict__:
            return True
    return False


def _reduce_ex(self, proto):
    # CPython's copyreg._reduce_ex, the protocol 0/1 reduction of a plain
    # instance.  GRAIL: CPython finds the first base that is NOT a heap type
    # through ``__flags__ & _HEAPTYPE''; Grail's equivalent question is whether
    # ClassDefAst built the class, so that is what the MRO walk asks.
    assert proto < 2
    cls = self.__class__
    for base in cls.__mro__:
        if not _is_python_defined(base):
            break
    else:
        base = object # not really reachable
    base = _public_builtin(cls, base)
    if base is object:
        state = None
    else:
        if base is cls:
            raise TypeError(f"cannot pickle {cls.__name__!r} object")
        state = base(self)
    args = (cls, base, state)
    try:
        getstate = self.__getstate__
    except AttributeError:
        if getattr(self, "__slots__", None):
            raise TypeError(f"cannot pickle {cls.__name__!r} object: "
                            f"a class that defines __slots__ without "
                            f"defining __getstate__ cannot be pickled "
                            f"with protocol {proto}") from None
        try:
            dict = self.__dict__
        except AttributeError:
            dict = None
    else:
        # GRAIL: CPython asks ``type(self).__getstate__ is object.__getstate__'',
        # which Grail cannot answer by identity (the method is minted on each
        # read), so the question is put directly: did any Python class in the
        # MRO define __getstate__?  The order is CPython's, and it matters --
        # the __slots__ read reaches a __getattr__, and a looping one must
        # raise RecursionError from HERE (test_bad_getattr).
        if (not _defines_getstate(type(self)) and
            getattr(self, "__slots__", None)):
            raise TypeError("a class that defines __slots__ without "
                            "defining __getstate__ cannot be pickled")
        dict = getstate()
    if dict:
        return _reconstructor, args, dict
    else:
        return _reconstructor, args


def _slotnames(cls):
    """Return a list of slot names for a given class.

    This needs to find slots defined by the class and its bases, so we
    can't simply return the __slots__ attribute.  We must walk down
    the Method Resolution Order and concatenate the __slots__ of each
    class found there.  (This assumes classes don't modify their
    __slots__ attribute to misrepresent their slots after the class is
    defined.)
    """

    # Get the value from a cache in the class if possible
    names = cls.__dict__.get("__slotnames__")
    if names is not None:
        return names

    # Not cached -- calculate the value
    names = []
    if not hasattr(cls, "__slots__"):
        # This class has no slots
        pass
    else:
        # Slots found -- gather slot names from all base classes
        for c in cls.__mro__:
            if "__slots__" in c.__dict__:
                slots = c.__dict__['__slots__']
                # if class has a single slot, it can be given as a string
                if isinstance(slots, str):
                    slots = (slots,)
                for name in slots:
                    # special descriptors
                    if name in ("__dict__", "__weakref__"):
                        continue
                    # mangled names
                    elif name.startswith('__') and not name.endswith('__'):
                        stripped = c.__name__.lstrip('_')
                        if stripped:
                            names.append('_%s%s' % (stripped, name))
                        else:
                            names.append(name)
                    else:
                        names.append(name)

    # Cache the outcome in the class if at all possible
    try:
        cls.__slotnames__ = names
    except:
        pass # But don't die if we can't

    return names


def pickle_complex(c):
    return complex, (c.real, c.imag)


def pickle_union(obj):
    import typing, operator
    return operator.getitem, (typing.Union, obj.__args__)


def constructor(object):
    if not callable(object):
        raise TypeError("constructors must be callable")


def add_extension(module, name, code):
    """Register an extension code."""
    import copyreg
    _extension_registry = copyreg._extension_registry
    _inverted_registry = copyreg._inverted_registry
    code = int(code)
    if not 1 <= code <= 0x7fffffff:
        raise ValueError("code out of range")
    key = (module, name)
    if (_extension_registry.get(key) == code and
        _inverted_registry.get(code) == key):
        return # Redundant registrations are benign
    if key in _extension_registry:
        raise ValueError("key %s is already registered with code %s" %
                         (key, _extension_registry[key]))
    if code in _inverted_registry:
        raise ValueError("code %s is already in use for key %s" %
                         (code, _inverted_registry[code]))
    _extension_registry[key] = code
    _inverted_registry[code] = key


def remove_extension(module, name, code):
    """Unregister an extension code.  For testing only."""
    import copyreg
    _extension_registry = copyreg._extension_registry
    _inverted_registry = copyreg._inverted_registry
    _extension_cache = copyreg._extension_cache
    key = (module, name)
    if (_extension_registry.get(key) != code or
        _inverted_registry.get(code) != key):
        raise ValueError("key %s is not registered with code %s" %
                         (key, code))
    del _extension_registry[key]
    del _inverted_registry[code]
    if code in _extension_cache:
        del _extension_cache[code]


def clear_extension_cache():
    import copyreg
    copyreg._extension_cache.clear()
