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

List = _StubGeneric('List')
Dict = _StubGeneric('Dict')
Tuple = _StubGeneric('Tuple')
Set = _StubGeneric('Set')
FrozenSet = _StubGeneric('FrozenSet')
Type = _StubGeneric('Type')
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


class Generic(_StubGeneric):
    pass


class Protocol(_StubGeneric):
    pass


def runtime_checkable(cls):
    return cls


def cast(typ, val):
    return val


def overload(func):
    return func


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
    """Stand-in NamedTuple base — instances behave like regular
    Python objects.  ``__init_subclass__`` is not implemented;
    subclasses inherit ``__init__`` from this stub which accepts
    any positional + keyword args and stores them on
    ``__dict__``-style attributes."""

    def __init__(self, *args, **kwargs):
        for k, v in kwargs.items():
            setattr(self, k, v)
        # Positional args are recorded under their declared field
        # names if the subclass exposes ``_fields``; otherwise as
        # ``f0``, ``f1``, ... fallbacks.
        fields = getattr(type(self), '_fields', None)
        if fields is None:
            for i, v in enumerate(args):
                setattr(self, 'f' + str(i), v)
        else:
            for name, v in zip(fields, args):
                setattr(self, name, v)


class TypedDict:
    """Stand-in TypedDict — same shape as NamedTuple above."""

    pass
