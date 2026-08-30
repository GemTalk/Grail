# GRAIL minimal typing stub.
#
# CPython's typing module is large (~3000 lines) and dense with
# metaclass machinery for runtime type checks.  Most Flask-stack
# packages reach for it at import time purely for annotation
# scaffolding — `TypeVar`, `Any`, `Optional`, `Callable`, etc. —
# which Grail evaluates as bare attribute lookups before lazily
# stringifying.  Stub the surface so those lookups succeed and
# the rest of the module body can compile.
#
# Anything that actually uses typing at runtime (Protocol
# isinstance dispatch, runtime_checkable, get_type_hints) will
# silently return placeholders; expand on demand.


class _StubGeneric:
    """Bare-bones generic placeholder.  Supports `X[args]` so
    annotations like ``List[int]`` and ``Callable[..., Any]``
    don't blow up at module load."""

    def __init__(self, name='_Stub'):
        self._name = name

    def __class_getitem__(cls, item):
        return cls

    # GRAIL: subscript codegen always emits `__getitem__:` regardless
    # of class vs instance receiver — define both shapes.
    def __getitem__(self, item):
        return self

    def __call__(self, *args, **kwargs):
        return self


class _AbcAlias(_StubGeneric):
    """A typing name that STANDS FOR a real class somewhere else --
    ``typing.MutableMapping`` for ``collections.abc.MutableMapping``.

    Everything a plain `_StubGeneric` does (subscript, call, repr) is
    inherited unchanged; what this adds is PEP 560's ``__mro_entries__``, so
    the name works as a BASE CLASS and not merely as an annotation:

        class HTTPHeaderDict(typing.MutableMapping[str, str]): ...

    Without it that raised ``TypeError: cannot subclass a non-class base
    (_StubGeneric)`` -- an instance is not a class, and Grail said so.  With
    it the class is built on ``collections.abc.MutableMapping``, which is a
    real class here and carries the mixin methods (``get``, ``pop``,
    ``setdefault``, ``update``, ``keys``, ``items``, ...) that such a
    subclass exists to inherit.  urllib3's ``_collections`` module is two of
    these in a row.

    The origin is resolved LAZILY, on first use as a base, and never at
    import time.  typing is imported very early -- the ``_overload_registry``
    comment below says why that matters -- and pulling collections.abc into
    every ``import typing`` would invert that dependency for a hook most
    programs never fire.  Subscripting answers ``self`` (inherited), so
    ``MutableMapping`` and ``MutableMapping[str, str]`` reach the same hook.
    """

    def __init__(self, name, origin_module='collections.abc',
                 origin_name=None):
        _StubGeneric.__init__(self, name)
        self._origin_module = origin_module
        self._origin_name = origin_name or name
        self._origin_cache = None

    def _origin_class(self):
        if self._origin_cache is None:
            if self._origin_module == 'contextlib':
                import contextlib
                mod = contextlib
            else:
                import collections.abc
                mod = collections.abc
            self._origin_cache = getattr(mod, self._origin_name)
        return self._origin_cache

    def __mro_entries__(self, bases):
        return (self._origin_class(),)


# Special singletons / sentinels --------------------------------------------

class _AnyMeta(_StubGeneric):
    pass


Any = _AnyMeta('Any')
ClassVar = _StubGeneric('ClassVar')
Final = _StubGeneric('Final')
Literal = _StubGeneric('Literal')
NoReturn = _StubGeneric('NoReturn')
Optional = _StubGeneric('Optional')
Union = _StubGeneric('Union')
Self = _StubGeneric('Self')


# Generic containers ---------------------------------------------------------

# `typing.List` is NOT `list`, upstream or here, though it is a deprecated alias
# OF it.  It is a `_SpecialGenericAlias` -- a distinct object wrapping `list` as
# its `__origin__` -- and the difference is observable:
#
#     repr(typing.List)         'typing.List'          not "<class 'list'>"
#     repr(typing.List[int])    'typing.List[int]'     not 'list[int]'
#     typing.List[int] == list[int]                    False
#
# The last one is why test_enum's test_enum_of_generic_aliases can tell them
# apart: it puts BOTH in one enum and requires two distinct members, which only
# holds if they are unequal and hash apart.
#
# These were plain `_StubGeneric` instances once, which made them not types at
# all -- `isinstance([], typing.List)` was False and `typing.List | typing.Tuple`
# raised "unsupported operand type(s) for |".  Aliasing them straight to the
# builtin fixed that by making them the wrong object; this keeps what aliasing
# bought (both checks below still hold, via __instancecheck__ / __subclasscheck__
# delegating to __origin__) without the conflation.
#
#     isinstance([], typing.List)              True
#     isinstance([], typing.List | typing.Tuple)   True
#     issubclass(typing.List, typing.List | typing.Tuple)   True
#
# The stubs BELOW this block stay stubs on purpose: Callable / Optional / Union
# / IO and the ABC names have no builtin to alias, and Grail's abc module is
# itself a stub, so a name is all they can be.  `Type` stays `type` because
# Grail's `type` is a BoundMethod rather than a class, so there is no origin to
# wrap.


def _type_repr(obj):
    """CPython's typing._type_repr: a type prints as its name rather than
    ``<class 'int'>``, so ``typing.List[int]`` reads the way CPython prints it.
    Everything else falls back on repr().

    GRAIL: some builtins referenced as a VALUE are a BoundMethod standing in for
    the class rather than the class itself -- ``str`` and ``type`` are, ``int``
    and ``list`` are not -- so an ``isinstance(obj, type)`` test alone printed
    ``typing.Dict[<BoundMethod object at 0x...>, int]``.  The stand-in carries
    the same ``__name__`` / ``__module__`` the class does, so naming it is only
    a matter of recognising it.  Deliberately NOT a bare "has __name__" test:
    a plain function has one too, and CPython prints functions with repr().
    """
    if obj is Ellipsis:
        return '...'
    if isinstance(obj, type) or type(obj).__name__ == 'BoundMethod':
        name = getattr(obj, '__qualname__', None) or getattr(obj, '__name__', None)
        if name is None:
            return repr(obj)
        module = getattr(obj, '__module__', None)
        if module is None or module == 'builtins':
            return name
        return '%s.%s' % (module, name)
    return repr(obj)


class _GenericAlias:
    """What subscripting a special alias produces -- ``typing.List[int]``.

    Carries `__origin__` (the builtin) and `__args__` (the parameters), which is
    what makes it comparable and hashable INDEPENDENTLY of the builtin's own
    ``list[int]``: `__eq__` returns NotImplemented for anything that is not a
    `_GenericAlias`, so the two never compare equal and their hashes differ.
    """

    def __init__(self, origin, args, name=None):
        self.__origin__ = origin
        self.__args__ = args if isinstance(args, tuple) else (args,)
        self._name = name

    def __repr__(self):
        name = 'typing.' + self._name if self._name else _type_repr(self.__origin__)
        if not self.__args__:
            return '%s[()]' % name
        return '%s[%s]' % (name, ', '.join(_type_repr(a) for a in self.__args__))

    def __eq__(self, other):
        if not isinstance(other, _GenericAlias):
            return NotImplemented
        return (self.__origin__ == other.__origin__
                and self.__args__ == other.__args__)

    def __ne__(self, other):
        result = self.__eq__(other)
        if result is NotImplemented:
            return result
        return not result

    def __hash__(self):
        return hash((self.__origin__, self.__args__))

    def __or__(self, right):
        return _UnionGenericAlias((self, right))

    def __ror__(self, left):
        return _UnionGenericAlias((left, self))

    def __call__(self, *args, **kwargs):
        return self.__origin__(*args, **kwargs)

    def __mro_entries__(self, bases):
        """PEP 560: ``class X(typing.List[int])`` subclasses ``list``.

        A subscripted alias is an ordinary object, so without this hook it was
        rejected as a non-class base -- CPython builds the subclass on
        ``__origin__`` and drops the parameters, which are a type-checker
        concern with no runtime representation here."""
        return (self.__origin__,)

    # CPython: a SUBSCRIPTED generic is not usable in a type check at all.
    def __instancecheck__(self, obj):
        raise TypeError('Subscripted generics cannot be used with'
                        ' class and instance checks')

    def __subclasscheck__(self, cls):
        raise TypeError('Subscripted generics cannot be used with'
                        ' class and instance checks')


class _SpecialGenericAlias:
    """An unsubscripted alias -- ``typing.List``, ``typing.Dict``.

    Type checks DELEGATE to `__origin__`, which is what keeps
    ``isinstance([], typing.List)`` true now that it is no longer `list` itself.
    """

    def __init__(self, origin, nparams, name=None):
        self.__origin__ = origin
        self._nparams = nparams
        self._name = name or origin.__name__

    def __repr__(self):
        return 'typing.' + self._name

    def __getitem__(self, params):
        if not isinstance(params, tuple):
            params = (params,)
        if not self._nparams:
            raise TypeError('%s is not a generic class' % (self,))
        # _nparams < 0 means "variable number accepted" -- Tuple[int, str, ...].
        if self._nparams > 0 and len(params) != self._nparams:
            raise TypeError('Too %s arguments for %s; actual %d, expected %d'
                            % ('many' if len(params) > self._nparams else 'few',
                               self, len(params), self._nparams))
        return _GenericAlias(self.__origin__, params, name=self._name)

    def __call__(self, *args, **kwargs):
        # The deprecated container aliases are built with inst=False upstream:
        # typing.List() is refused, and points at the builtin instead.
        raise TypeError('Type %s cannot be instantiated; use %s() instead'
                        % (self._name, self.__origin__.__name__))

    def __mro_entries__(self, bases):
        """``class X(typing.List)`` subclasses ``list`` -- the unsubscripted
        spelling of the hook on `_GenericAlias`."""
        return (self.__origin__,)

    def __instancecheck__(self, obj):
        return self.__subclasscheck__(type(obj))

    def __subclasscheck__(self, cls):
        if isinstance(cls, _SpecialGenericAlias):
            return issubclass(cls.__origin__, self.__origin__)
        if isinstance(cls, _GenericAlias):
            raise TypeError('Subscripted generics cannot be used with'
                            ' class and instance checks')
        return issubclass(cls, self.__origin__)

    def __or__(self, right):
        return _UnionGenericAlias((self, right))

    def __ror__(self, left):
        return _UnionGenericAlias((left, self))

    def __eq__(self, other):
        if isinstance(other, _SpecialGenericAlias):
            return self.__origin__ == other.__origin__
        return NotImplemented

    def __ne__(self, other):
        result = self.__eq__(other)
        if result is NotImplemented:
            return result
        return not result

    def __hash__(self):
        return hash(self.__origin__)

    @property
    def __name__(self):
        return self._name

    @property
    def __qualname__(self):
        return self._name


class _UnionGenericAlias:
    """``typing.List | typing.Tuple``.

    A PEP 604 union built from operands the builtin `|` cannot handle -- at
    least one side is an alias object rather than a type, so `types.UnionType`
    is not available.  Type checks recurse per member, which is what both the
    tuple form and the builtin union do.
    """

    def __init__(self, args):
        self.__args__ = tuple(args)

    def __repr__(self):
        return ' | '.join(_type_repr(a) for a in self.__args__)

    def __or__(self, right):
        return _UnionGenericAlias(self.__args__ + (right,))

    def __ror__(self, left):
        return _UnionGenericAlias((left,) + self.__args__)

    def __eq__(self, other):
        if not isinstance(other, _UnionGenericAlias):
            return NotImplemented
        return set(self.__args__) == set(other.__args__)

    def __ne__(self, other):
        result = self.__eq__(other)
        if result is NotImplemented:
            return result
        return not result

    def __hash__(self):
        return hash(frozenset(self.__args__))

    def __instancecheck__(self, obj):
        for arg in self.__args__:
            if isinstance(obj, arg):
                return True
        return False

    def __subclasscheck__(self, cls):
        for arg in self.__args__:
            if issubclass(cls, arg):
                return True
        return False


# The name is given EXPLICITLY -- it is the typing spelling, not the builtin's.
# Defaulting it to ``origin.__name__`` printed ``typing.list``.
List = _SpecialGenericAlias(list, 1, name='List')
Dict = _SpecialGenericAlias(dict, 2, name='Dict')
Tuple = _SpecialGenericAlias(tuple, -1, name='Tuple')
Set = _SpecialGenericAlias(set, 1, name='Set')
FrozenSet = _SpecialGenericAlias(frozenset, 1, name='FrozenSet')
Type = type

# The ABC names.  Each one HAS a real class behind it -- CPython's
# ``typing.Mapping`` is an alias of ``collections.abc.Mapping``, not a separate
# thing -- so they are `_AbcAlias`, which knows how to be a base class.  They
# were plain `_StubGeneric` instances, which made every one of them unusable in
# a class header: ``class D(typing.Sequence[int])`` raised ``cannot subclass a
# non-class base``.  As annotations they behave exactly as before.
#
# ``ContextManager`` is the odd one out only in WHERE its class lives
# (contextlib, not collections.abc); ``AbstractSet`` is the odd one out in
# NAME, because ``typing.Set`` is already taken by the ``set`` alias above.
Iterable = _AbcAlias('Iterable')
Iterator = _AbcAlias('Iterator')
Generator = _AbcAlias('Generator')
Mapping = _AbcAlias('Mapping')
MutableMapping = _AbcAlias('MutableMapping')
Sequence = _AbcAlias('Sequence')
MutableSequence = _AbcAlias('MutableSequence')
Callable = _AbcAlias('Callable')
Awaitable = _AbcAlias('Awaitable')
Coroutine = _AbcAlias('Coroutine')
AsyncGenerator = _AbcAlias('AsyncGenerator')
AsyncIterable = _AbcAlias('AsyncIterable')
AsyncIterator = _AbcAlias('AsyncIterator')
Hashable = _AbcAlias('Hashable')
Sized = _AbcAlias('Sized')
Container = _AbcAlias('Container')
Collection = _AbcAlias('Collection')
Reversible = _AbcAlias('Reversible')
AbstractSet = _AbcAlias('AbstractSet', origin_name='Set')
MutableSet = _AbcAlias('MutableSet')
MappingView = _AbcAlias('MappingView')
KeysView = _AbcAlias('KeysView')
ItemsView = _AbcAlias('ItemsView')
ValuesView = _AbcAlias('ValuesView')
ByteString = _AbcAlias('ByteString')
ContextManager = _AbcAlias('ContextManager', origin_module='contextlib',
                           origin_name='AbstractContextManager')
AsyncContextManager = _AbcAlias('AsyncContextManager',
                                origin_module='contextlib',
                                origin_name='AbstractAsyncContextManager')
IO = _StubGeneric('IO')
TextIO = _StubGeneric('TextIO')
BinaryIO = _StubGeneric('BinaryIO')
Pattern = _StubGeneric('Pattern')
Match = _StubGeneric('Match')


# Forward references -----------------------------------------------------------

class ForwardRef:
    """An annotation that is still a string.

    A real class rather than one more _StubGeneric, because callers TYPE-TEST
    it and read ``__forward_arg__``: typing_extensions does both at import
    time, which is where the missing name stopped it.

    Grail never resolves the reference -- there is no get_type_hints here -- so
    ``_evaluate`` answers the string it was handed rather than the object the
    string names.  That is a deliberate silence: guessing an object would be
    worse than answering the text.
    """

    # CPython declares these as __slots__, and third-party code READS the
    # declaration rather than relying on the storage: typing_extensions decides
    # at import time whether the interpreter's ForwardRef carries is_class by
    # testing ``"__forward_is_class__" in typing.ForwardRef.__slots__``, and
    # that line was the next error after ForwardRef itself appeared.  So the
    # tuple is a published part of the type, not an optimisation, and it is
    # spelled out even though nothing here depends on slot storage.
    __slots__ = ('__forward_arg__', '__forward_code__',
                 '__forward_evaluated__', '__forward_value__',
                 '__forward_is_argument__', '__forward_is_class__',
                 '__forward_module__')

    def __init__(self, arg, is_argument=True, module=None, is_class=False):
        if not isinstance(arg, str):
            raise TypeError("Forward reference must be a string -- got " + repr(arg))
        self.__forward_arg__ = arg
        self.__forward_evaluated__ = False
        self.__forward_value__ = None
        self.__forward_is_argument__ = is_argument
        self.__forward_is_class__ = is_class
        self.__forward_module__ = module

    def _evaluate(self, globalns=None, localns=None, *args, **kwargs):
        return self.__forward_arg__

    def __eq__(self, other):
        if not isinstance(other, ForwardRef):
            return NotImplemented
        return self.__forward_arg__ == other.__forward_arg__

    def __ne__(self, other):
        result = self.__eq__(other)
        if result is NotImplemented:
            return result
        return not result

    def __hash__(self):
        return hash(self.__forward_arg__)

    def __repr__(self):
        return "ForwardRef(" + repr(self.__forward_arg__) + ")"


# TypeVar / Generic / Protocol ------------------------------------------------

class _TypeVarInstance:
    """Lightweight value that carries a name; what CPython's TypeVar
    returns from `TypeVar('T')`.  Grail's module call dispatch prefers
    `_name:kw:` varargs entries, so TypeVar is exposed as a module-
    level *function* (below) rather than a class — calling it from
    user code still looks like `t.TypeVar('T')`."""

    def __init__(self, name):
        self.__name__ = name

    def __repr__(self):
        return self.__name__


class TypeVar(_TypeVarInstance):
    def __init__(self, name, *constraints, bound=None, covariant=False,
                 contravariant=False):
        _TypeVarInstance.__init__(self, name)


class _ParamSpecInstance(_TypeVarInstance):
    """ParamSpec value.  `P.args` / `P.kwargs` appear in annotations
    (asgiref types every wrapper with them); they just need to be
    subscript-tolerant placeholders."""

    def __init__(self, name):
        _TypeVarInstance.__init__(self, name)
        self.args = _StubGeneric(name + '.args')
        self.kwargs = _StubGeneric(name + '.kwargs')


def ParamSpec(name, *, bound=None, covariant=False, contravariant=False,
              default=None):
    return _ParamSpecInstance(name)


def TypeVarTuple(name, *, default=None):
    return _TypeVarInstance(name)


Concatenate = _StubGeneric('Concatenate')
TypeAlias = _StubGeneric('TypeAlias')
Annotated = _StubGeneric('Annotated')
Never = _StubGeneric('Never')
LiteralString = _StubGeneric('LiteralString')
Unpack = _StubGeneric('Unpack')
Required = _StubGeneric('Required')
NotRequired = _StubGeneric('NotRequired')


def final(obj):
    return obj


def NewType(name, tp):
    def _identity(x):
        return x
    _identity.__name__ = name
    return _identity


def get_origin(tp):
    return None


def get_args(tp):
    return ()


class _GenericBaseAlias(_StubGeneric):
    """What ``typing.Generic[T]`` / ``typing.Protocol[T]`` answers.

    Generic used to answer ITSELF when subscripted, which is fine as long as
    it is the only base -- a class is a legal base and nothing more needs
    saying.  It is wrong the moment a second generic base is present:

        class RecentlyUsedContainer(typing.Generic[_KT, _VT],
                                    typing.MutableMapping[_KT, _VT]):

    Grail takes its Smalltalk superclass from the base list, so Generic --
    which carries no behaviour at all -- displaced ``MutableMapping`` as the
    primary base, and ``___mergeSecondaryBases___`` then copied `_StubGeneric`'s
    ``__init__`` / ``__getitem__`` / ``__call__`` DOWN OVER the mapping mixins.
    The class came out with no ``get``, no ``update``, no ``keys``, and no
    error to say so; that is urllib3's ``_collections`` module.

    CPython avoids it with the same rule implemented here: ``Generic`` drops
    out of the base list entirely when a LATER base is itself generic, because
    that base already brings Generic in behind it.  Measured against CPython
    3.14 for the header above: ``Generic[_KT, _VT].__mro_entries__`` answers
    ``()`` and ``MutableMapping[_KT, _VT].__mro_entries__`` answers
    ``(collections.abc.MutableMapping, typing.Generic)``.

    Sole-base ``class Foo(Generic[T])`` is unchanged: no later base, so the
    hook answers ``(Generic,)`` and Foo is rooted at Generic exactly as
    before.  That is the spelling every vendored package here uses.
    """

    def __init__(self, origin, name):
        _StubGeneric.__init__(self, name)
        self.__origin__ = origin

    def __repr__(self):
        return 'typing.' + self._name + '[...]'

    def __mro_entries__(self, bases):
        past_self = False
        for b in bases:
            if b is self:
                past_self = True
            elif past_self and isinstance(
                    b, (_StubGeneric, _GenericAlias, _SpecialGenericAlias)):
                return ()
        return (self.__origin__,)


class Generic(_StubGeneric):
    def __class_getitem__(cls, item):
        return _GenericBaseAlias(cls, 'Generic')


class Protocol(_StubGeneric):
    def __class_getitem__(cls, item):
        return _GenericBaseAlias(cls, 'Protocol')


def runtime_checkable(cls):
    return cls


# typing.SupportsInt / SupportsFloat / ... — runtime-checkable protocols that
# CPython implements via a metaclass __instancecheck__ doing a structural (hasattr)
# test.  Grail ignores `metaclass=`, but its isinstance() invokes
# ``aClass.__instancecheck__(obj)`` when the class advertises one, so a
# @classmethod __instancecheck__ wires the structural check directly.
class SupportsInt:
    @classmethod
    def __instancecheck__(cls, instance):
        return hasattr(instance, '__int__')


class SupportsFloat:
    @classmethod
    def __instancecheck__(cls, instance):
        return hasattr(instance, '__float__')


class SupportsComplex:
    @classmethod
    def __instancecheck__(cls, instance):
        return hasattr(instance, '__complex__')


class SupportsIndex:
    @classmethod
    def __instancecheck__(cls, instance):
        return hasattr(instance, '__index__')


class SupportsBytes:
    @classmethod
    def __instancecheck__(cls, instance):
        return hasattr(instance, '__bytes__')


class SupportsAbs:
    @classmethod
    def __instancecheck__(cls, instance):
        return hasattr(instance, '__abs__')


class SupportsRound:
    @classmethod
    def __instancecheck__(cls, instance):
        return hasattr(instance, '__round__')


def cast(typ, val):
    return val


# module -> qualname -> first line -> function.  Plain nested dicts rather
# than the defaultdict/functools.partial CPython uses: typing is imported very
# early, and this avoids taking a dependency on collections from here.
_overload_registry = {}


def overload(func):
    """Register *func* as an overload and hand it back.

    CPython returns a dummy that raises when called, on the grounds that an
    @overload body is a declaration and the real implementation follows.
    Grail returns the function itself -- the long-standing behaviour here,
    and the last (non-overloaded) def wins either way, so the difference
    only shows if something calls a declaration on purpose."""
    try:
        f = func.__func__ if isinstance(func, (staticmethod, classmethod)) else func
        by_qualname = _overload_registry.setdefault(f.__module__, {})
        by_line = by_qualname.setdefault(f.__qualname__, {})
        by_line[f.__code__.co_firstlineno] = func
    except AttributeError:
        # Not every callable carries the metadata the registry keys on; an
        # unregisterable overload is still a usable function.
        pass
    return func


def get_overloads(func):
    """The registered overloads for *func*, in definition order.

    Keyed by (module, qualname) so the several @overload declarations that
    share a name collect together, and by first line so each is kept."""
    f = func.__func__ if isinstance(func, (staticmethod, classmethod)) else func
    try:
        by_qualname = _overload_registry[f.__module__]
        by_line = by_qualname[f.__qualname__]
    except (AttributeError, KeyError):
        return []
    return [by_line[line] for line in sorted(by_line)]


def clear_overloads():
    """Drop every registered overload -- CPython exposes this so a long-lived
    process can release the functions the registry pins."""
    _overload_registry.clear()


def assert_never(arg, /):
    """Ask the type checker to prove a branch is unreachable; at run time it
    always raises, because reaching it means the proof was wrong."""
    value = repr(arg)
    if len(value) > 100:
        value = value[:100] + '...'
    raise AssertionError("Expected code to be unreachable, but got: %s" % (value,))


def assert_type(val, typ, /):
    """Type-checker assertion; a no-op at run time, as in CPython."""
    return val


def get_type_hints(obj, globalns=None, localns=None, include_extras=False):
    return {}


def no_type_check(arg):
    return arg


TYPE_CHECKING = False


# typing.NamedTuple ---------------------------------------------------------
#
# CPython supports two spellings and BOTH are in wide use:
#
#     class Foo(NamedTuple):            # the class statement
#         a: int
#         b: str = "x"
#
#     Foo = NamedTuple("Foo", [("a", int), ("b", str)])   # the functional form
#
# and both must produce a REAL tuple subclass -- ``isinstance(f, tuple)``,
# ``_fields``, ``_field_defaults``, ``_replace``, ``_asdict``, ``_make``.
#
# urllib3 uses the functional form AS A BASE, which is what forced this:
#
#     class Url(typing.NamedTuple("Url", [("scheme", ...), ...])):
#         def __new__(cls, scheme=None, ...): ...
#
# Grail's NamedTuple used to be a plain class, so the functional call built an
# INSTANCE, and inheriting from an instance raised
# ``TypeError: cannot subclass a non-class base (NamedTuple)``.
#
# So NamedTuple is not a class here.  It is a single callable object that
# answers both protocols, which is structurally what CPython does too (there
# NamedTuple is a FUNCTION carrying a ``__mro_entries__`` attribute -- Grail
# looks the hook up as a compiled method rather than as a function attribute,
# so it has to be an instance of a class that defines one):
#
#   * __call__          -> the functional form, delegating to
#                          collections.namedtuple.
#   * __mro_entries__   -> PEP 560.  A non-class base is replaced by what its
#                          hook answers, so ``class Foo(NamedTuple)`` is really
#                          ``class Foo(<the namedtuple base>)`` and Foo comes
#                          out a genuine tuple subclass.
#
# The class statement's FIELDS are not visible to __mro_entries__ (it runs
# before the body), so the layout is recovered afterwards in
# __init_subclass__ from what ClassDefAst stamps on every annotated class:
# ``___annotatedFields___`` (every annotated name in DECLARATION order) and
# ``_fields`` (only the BARE ones).  The difference between the two is exactly
# the set of fields that have defaults -- which is how ``b: str = "x"`` gets
# its default without evaluating an annotation.


# One-element cache for the base class ``__mro_entries__`` hands back.  Built
# lazily, on first use, so importing typing does not drag collections in --
# typing is imported very early and very widely, and it has no imports at all
# by design (see the module header).
_NT_BASE_CACHE = []


def _nt_base():
    """The class every ``class Foo(NamedTuple)`` is actually rooted at.

    It is itself an empty namedtuple, so the whole tuple protocol --
    ``__new__`` off ``_fields``, field access, ``_replace``, ``_asdict``,
    ``_make``, repr -- is inherited from collections rather than written
    twice.  All this adds is the __init_subclass__ that fills ``_fields``
    in for the subclass."""
    if _NT_BASE_CACHE:
        return _NT_BASE_CACHE[0]
    from collections import namedtuple as _namedtuple

    class _NamedTupleBase(_namedtuple('NamedTuple', [])):

        def __init_subclass__(cls, **kwargs):
            _nt_normalize(cls)

    _NamedTupleBase.__name__ = 'NamedTuple'
    _NamedTupleBase.__qualname__ = 'NamedTuple'
    _NamedTupleBase.__module__ = 'typing'
    _NT_BASE_CACHE.append(_NamedTupleBase)
    return _NamedTupleBase


class _nt_fieldgetter:
    """CPython's ``_tuplegetter``: the descriptor a namedtuple class binds
    each field name to.

    Needed here and not in collections because of what a BARE annotation
    does in Grail.  ``a: int`` in a class body registers a storage slot and
    a class-side accessor pair, so ``Foo.a`` is a real class attribute
    holding nil -- where CPython creates nothing at all and ``Foo.a`` raises
    AttributeError.  That nil out-ranks the ``__getattr__`` fallback
    collections' namedtuple reads fields through, so ``Foo(1).a`` answered
    nil rather than 1.  Binding a descriptor over the same name puts the
    read back on the tuple, exactly as upstream does it."""

    def __init__(self, index, name):
        self._index = index
        self._name = name

    def __get__(self, obj, objtype=None):
        if obj is None:
            return self
        return tuple.__getitem__(obj, self._index)

    def __repr__(self):
        return '_tuplegetter(' + str(self._index) + ')'


def _nt_normalize(cls):
    """Turn a just-created ``class Foo(NamedTuple)`` into a working namedtuple.

    Runs from __init_subclass__, i.e. after the class body has been stamped
    onto the class, so both field lists are readable:

        class Foo(NamedTuple):        ___annotatedFields___  ('a', 'b')
            a: int                    _fields                ('a',)
            b: str = "x"              Foo.b                  'x'

    Everything in the first list and not in the second has a default, and the
    default is the class attribute of that name."""
    # Subclassing an ALREADY-normalised NamedTuple class (``class Bar(Foo):
    # def helper(self): ...``) keeps Foo's layout; CPython ignores any new
    # annotations there rather than growing the tuple.  A non-empty _fields
    # anywhere above us is what says so -- the base from _nt_base() has ().
    mro = getattr(cls, '__mro__', None) or ()
    for base in mro:
        if base is not cls and getattr(base, '_fields', None):
            return

    all_fields = getattr(cls, '___annotatedFields___', None)
    if not all_fields:
        return
    all_fields = tuple(all_fields)
    bare = getattr(cls, '_fields', None) or ()

    defaults = {}
    seen_default = None
    for name in all_fields:
        if name in bare:
            if seen_default is not None:
                raise TypeError(
                    'Non-default namedtuple field ' + name
                    + ' cannot follow default field ' + seen_default)
        else:
            seen_default = name
            defaults[name] = getattr(cls, name)

    cls._fields = all_fields
    cls._typename = cls.__name__
    cls._field_defaults = defaults
    cls.__match_args__ = all_fields

    # Last, so the names are bound to their tuple slot rather than to the
    # nil (bare annotation) or the default value (annotated-with-value) the
    # class body left behind.  See _nt_fieldgetter.
    for index in range(len(all_fields)):
        setattr(cls, all_fields[index], _nt_fieldgetter(index, all_fields[index]))


def _nt_make(typename, fields, module=None):
    """The functional form's worker.  ``fields`` is CPython's list of
    ``(name, type)`` pairs; a bare list of names (or a space/comma-separated
    string) is accepted too, the way collections.namedtuple takes it."""
    from collections import namedtuple as _namedtuple

    if isinstance(fields, str):
        names = list(fields.replace(',', ' ').split())
        annotations = {}
    else:
        names = []
        annotations = {}
        for field in fields:
            if isinstance(field, str):
                names.append(field)
            else:
                name = str(field[0])
                names.append(name)
                if len(field) > 1:
                    annotations[name] = field[1]
    nt = _namedtuple(typename, names, module=module)
    nt.__annotations__ = annotations
    return nt


class _NamedTupleFactory:
    """The object bound to ``typing.NamedTuple``.  See the block comment
    above for why this is an instance rather than a class."""

    def __call__(self, typename, fields=None, **kwargs):
        if fields is None:
            fields = list(kwargs.items())
        elif kwargs:
            raise TypeError(
                'Either list of fields or keywords can be provided to '
                'NamedTuple, not both')
        return _nt_make(typename, fields)

    def __mro_entries__(self, bases):
        return (_nt_base(),)

    def __repr__(self):
        return '<function NamedTuple>'


NamedTuple = _NamedTupleFactory()


class TypedDict:
    """Stand-in TypedDict — same shape as NamedTuple above."""

    pass
