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
Iterable = _StubGeneric('Iterable')
Iterator = _StubGeneric('Iterator')
Generator = _StubGeneric('Generator')
Mapping = _StubGeneric('Mapping')
MutableMapping = _StubGeneric('MutableMapping')
Sequence = _StubGeneric('Sequence')
MutableSequence = _StubGeneric('MutableSequence')
Callable = _StubGeneric('Callable')
Awaitable = _StubGeneric('Awaitable')
Coroutine = _StubGeneric('Coroutine')
AsyncGenerator = _StubGeneric('AsyncGenerator')
AsyncIterable = _StubGeneric('AsyncIterable')
AsyncIterator = _StubGeneric('AsyncIterator')
ContextManager = _StubGeneric('ContextManager')
IO = _StubGeneric('IO')
TextIO = _StubGeneric('TextIO')
BinaryIO = _StubGeneric('BinaryIO')
Pattern = _StubGeneric('Pattern')
Match = _StubGeneric('Match')


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


def TypeVar(name, *constraints, bound=None, covariant=False,
            contravariant=False):
    return _TypeVarInstance(name)


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


class Generic(_StubGeneric):
    pass


class Protocol(_StubGeneric):
    pass


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


# typing.NamedTuple — CPython supports both the class-statement
# form (``class T(NamedTuple): name: str``) and the functional
# constructor (``NamedTuple('T', [('name', str)])``).  Grail's
# class-statement codegen doesn't honor metaclass kwargs, so the
# class form here just produces a plain class; instance fields
# stay attribute-readable through the normal ``self.x = ...``
# path.  Adequate for jinja2's compile-time uses (lexer.Token,
# compiler._FinalizeInfo) where instances are constructed via
# positional args and then read by attribute.
class NamedTuple:
    """Stand-in NamedTuple base.  ClassDefAst emits a ``_fields``
    tuple of bare-annotation names in declaration order for any
    subclass, so positional args bind to attribute names and the
    sequence protocol below (``__iter__``, ``__getitem__``, ``__len__``)
    yields values in that same order — enough for jinja2's tuple-
    unpacking ``for regex, tokens, new_state in rule:`` idiom."""

    def __init__(self, *args, **kwargs):
        for k, v in kwargs.items():
            setattr(self, k, v)
        # Positional args bind to declared field names if available.
        # Also store the ordered tuple of values on ``_values`` for
        # constant-time __iter__ / __getitem__ — Grail's
        # ``self.__dict__[name]`` lookup fails when ``name`` is a
        # Python str (the underlying IdentityKeyValueDictionary keys
        # are Smalltalk Symbols), so we keep a parallel positional
        # store rather than translating string<->symbol per call.
        fields = getattr(type(self), '_fields', None)
        if fields is None:
            for i, v in enumerate(args):
                setattr(self, 'f' + str(i), v)
            self._values = tuple(args)
        else:
            for name, v in zip(fields, args):
                setattr(self, name, v)
            self._values = tuple(args)

    def __iter__(self):
        return iter(self._values)

    def __getitem__(self, index):
        return self._values[index]

    def __len__(self):
        return len(self._values)

    # Rich comparison: a NamedTuple compares as the tuple of its values
    # (CPython inherits tuple's lexicographic ordering).  Grail's base
    # Object only stubs these, so without delegating here a sort of
    # NamedTuple instances raises "Not yet implemented: __lt__".  This is
    # load-bearing for werkzeug's routing matcher, which sorts rules by a
    # ``Weighting`` NamedTuple.
    def _cmp_other(self, other):
        # Compare against another NamedTuple's values, or a raw sequence.
        if isinstance(other, NamedTuple):
            return other._values
        return other

    def __eq__(self, other):
        return self._values == self._cmp_other(other)

    def __ne__(self, other):
        return self._values != self._cmp_other(other)

    def __lt__(self, other):
        return self._values < self._cmp_other(other)

    def __le__(self, other):
        return self._values <= self._cmp_other(other)

    def __gt__(self, other):
        return self._values > self._cmp_other(other)

    def __ge__(self, other):
        return self._values >= self._cmp_other(other)


class TypedDict:
    """Stand-in TypedDict — same shape as NamedTuple above."""

    pass
