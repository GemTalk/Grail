"""Pure-Python stand-in for CPython's ``_typing`` C accelerator.

Grail vendors CPython 3.14's real ``typing.py`` byte-for-byte.  That file
opens with ``from _typing import ...``, and ``_typing`` is a C extension
module (``Modules/_typingmodule.c`` plus ``Objects/typevarobject.c``) that
Grail cannot load.  This module supplies the same ten names in Python.

**Why this is thin rather than a reimplementation of typing.**  The C types
are not self-contained: for every decision that needs to know what a *type*
is, they call back out to module-level functions in ``typing`` --
``_typevar_subst``, ``_paramspec_subst``, ``_paramspec_prepare_subst``,
``_typevartuple_prepare_subst``, ``_generic_class_getitem``,
``_generic_init_subclass``.  CPython does this so the type-checking rules
live in one place, in Python, where they can be read.  So the accelerator's
real job is only to hold attributes and route those six calls, and that is
what is written here.  The substitution rules are NOT re-derived; they are
whatever the vendored ``typing.py`` says they are.

Consequences worth knowing before editing:

* The callbacks are looked up LAZILY, inside the methods, never at import
  time.  ``typing`` imports ``_typing`` on its line 32, so at the moment
  this module executes there is no ``typing`` yet to import -- a top-level
  ``import typing`` here is a circular-import failure, not a style choice.
* ``TypeVar`` and friends here are ordinary classes, so unlike the C ones
  they are subclassable and their instances have a ``__dict__``.  Nothing
  in ``typing.py`` depends on either being false.
* PEP 695's ``type X = ...`` statement and the ``class C[T]`` /
  ``def f[T]()`` syntax are compiler features, not library ones.  Grail's
  parser does not implement them, so ``TypeAliasType`` here is reachable
  only by direct construction -- which is exactly how ``typing.TypeAliasType``
  and ``typing_extensions`` use it.
* PEP 649's lazy annotations (``evaluate_bound`` and the other
  ``evaluate_*`` hooks) are likewise a compiler feature.  The versions here
  answer the already-evaluated value, which is correct for every
  eagerly-constructed type variable and is all the vendored ``typing.py``
  asks of them.
"""

__all__ = [
    '_idfunc',
    'TypeVar',
    'ParamSpec',
    'TypeVarTuple',
    'ParamSpecArgs',
    'ParamSpecKwargs',
    'TypeAliasType',
    'Generic',
    'Union',
    'NoDefault',
]


def _idfunc(_, x):
    """The identity, used by ``typing`` as ``NewType.__call__``.

    Two arguments, not one: ``typing.NewType`` installs it as
    ``__call__ = _idfunc``, so it is invoked as a bound method and the
    first argument is the ``NewType`` instance itself.
    """
    return x


def _typing_module():
    """Answer the ``typing`` module, imported on demand.

    See the module docstring: ``typing`` is mid-import when this module is
    created, so this can only ever run later, from inside a method.
    """
    import typing
    return typing


def _make_union(parameters):
    """Build a union directly, without going through ``|``.

    This is the base case that stops typing's ``|`` from recursing.  CPython's
    typing.py defines ``__or__`` on ``_GenericAlias``, ``_SpecialForm`` and
    each type-variable kind as ``Union[self, other]``, so if ``Union[...]``
    were in turn built by folding ``|`` the two would call each other forever.
    They do not merely loop: the failure surfaces as a RecursionError raised
    inside an unrelated package's import, naming neither typing nor the
    operator, which is most of what made it expensive to find.

    Arguments have already been through ``typing._type_check`` by the time
    they reach here, so ``___grailUnionFrom___`` applies no further gate.
    """
    import types
    return types.UnionType.___grailUnionFrom___(list(parameters))


def _union_getitem(parameters):
    """``Union[X, Y]``.

    Answers the same kind of object ``X | Y`` does -- Grail's
    ``PyUnionType`` -- so the two spellings compare equal instead of being
    two representations of one idea.  It gets there through
    ``_make_union`` and NOT by folding ``|``: see that function.
    """
    if not isinstance(parameters, tuple):
        parameters = (parameters,)
    if len(parameters) == 0:
        raise TypeError("Cannot take a Union of no types.")
    typing = _typing_module()
    parameters = tuple(
        typing._type_check(p, "Union[arg, ...]: each arg must be a type.")
        for p in parameters)
    parameters = tuple(typing._deduplicate(parameters,
                                           unhashable_fallback=True))
    return _make_union(parameters)


class _NoDefaultType:
    """The type of the ``NoDefault`` sentinel."""

    _instance = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = object.__new__(cls)
        return cls._instance

    def __repr__(self):
        return 'typing.NoDefault'

    def __reduce__(self):
        return 'NoDefault'


NoDefault = _NoDefaultType()


class _Common:
    """Attribute-holding behaviour shared by the three type-variable kinds.

    PEP 696 gives every one of them a default, and ``typing.py`` asks about
    it through exactly two names -- ``has_default()`` and ``__default__`` --
    so both live here rather than three times over.
    """

    def has_default(self):
        return self.__default__ is not NoDefault

    def evaluate_default(self):
        # PEP 649 lazy form.  Grail evaluates defaults eagerly, so the
        # "evaluate" step is already done; answer the value.
        return self.__default__

    def __or__(self, right):
        """``T | None``, PEP 604.

        Built with ``_make_union`` rather than as CPython's ``Union[self,
        right]``, which is a cycle here -- see ``_make_union``.  Defining it at
        all is what makes a type variable usable on the LEFT of ``|``: Grail
        dispatches ``x | y`` on the left operand's own ``__or__``, and a type
        variable is a plain object with no builtin one.
        """
        return _make_union((self, right))

    def __ror__(self, left):
        return _make_union((left, self))

    def __copy__(self):
        return self

    def __deepcopy__(self, memo):
        return self

    def __reduce__(self):
        return self.__name__


class TypeVar(_Common):
    """Type variable.

    Constructed either the old way, ``T = TypeVar('T')``, or by the PEP 695
    ``class C[T]`` syntax, which Grail's parser does not have.  Only the
    first form can occur here.
    """

    def __init__(self, name, *constraints, bound=None, covariant=False,
                 contravariant=False, default=NoDefault, infer_variance=False):
        self.__name__ = name
        if covariant and contravariant:
            raise ValueError("Bivariant types are not supported.")
        if infer_variance and (covariant or contravariant):
            raise ValueError("Variance cannot be specified with infer_variance.")
        self.__covariant__ = bool(covariant)
        self.__contravariant__ = bool(contravariant)
        self.__infer_variance__ = bool(infer_variance)
        self.__default__ = default
        if constraints and bound is not None:
            raise TypeError("Constraints cannot be combined with bound=...")
        if constraints and len(constraints) == 1:
            raise TypeError("A single constraint is not allowed")
        self.__constraints__ = tuple(constraints)
        self.__bound__ = bound

    def __typing_subst__(self, arg):
        return _typing_module()._typevar_subst(self, arg)

    def evaluate_bound(self):
        return self.__bound__

    def evaluate_constraints(self):
        return self.__constraints__

    def __repr__(self):
        if self.__covariant__:
            prefix = '+'
        elif self.__contravariant__:
            prefix = '-'
        elif self.__infer_variance__:
            prefix = ''
        else:
            prefix = '~'
        return prefix + self.__name__



class ParamSpecArgs:
    """The args for a ParamSpec object -- ``P.args``."""

    def __init__(self, origin):
        self.__origin__ = origin

    def __repr__(self):
        return f"{self.__origin__.__name__}.args"

    def __eq__(self, other):
        if not isinstance(other, ParamSpecArgs):
            return NotImplemented
        return self.__origin__ == other.__origin__

    def __hash__(self):
        return hash(('args', id(self.__origin__)))


class ParamSpecKwargs:
    """The kwargs for a ParamSpec object -- ``P.kwargs``."""

    def __init__(self, origin):
        self.__origin__ = origin

    def __repr__(self):
        return f"{self.__origin__.__name__}.kwargs"

    def __eq__(self, other):
        if not isinstance(other, ParamSpecKwargs):
            return NotImplemented
        return self.__origin__ == other.__origin__

    def __hash__(self):
        return hash(('kwargs', id(self.__origin__)))


class ParamSpec(_Common):
    """Parameter specification variable (PEP 612)."""

    def __init__(self, name, *, bound=None, covariant=False,
                 contravariant=False, default=NoDefault, infer_variance=False):
        self.__name__ = name
        self.__covariant__ = bool(covariant)
        self.__contravariant__ = bool(contravariant)
        self.__infer_variance__ = bool(infer_variance)
        self.__default__ = default
        self.__bound__ = bound

    @property
    def args(self):
        return ParamSpecArgs(self)

    @property
    def kwargs(self):
        return ParamSpecKwargs(self)

    def __typing_subst__(self, arg):
        return _typing_module()._paramspec_subst(self, arg)

    def __typing_prepare_subst__(self, alias, args):
        return _typing_module()._paramspec_prepare_subst(self, alias, args)

    def __repr__(self):
        if self.__covariant__:
            prefix = '+'
        elif self.__contravariant__:
            prefix = '-'
        else:
            prefix = '~'
        return prefix + self.__name__



class TypeVarTuple(_Common):
    """Type variable tuple (PEP 646)."""

    def __init__(self, name, *, default=NoDefault):
        self.__name__ = name
        self.__default__ = default

    def __iter__(self):
        yield _typing_module().Unpack[self]

    def __typing_subst__(self, arg):
        raise TypeError("Substitution of bare TypeVarTuple is not supported")

    def __typing_prepare_subst__(self, alias, args):
        return _typing_module()._typevartuple_prepare_subst(self, alias, args)

    def __repr__(self):
        return self.__name__


class TypeAliasType:
    """Type alias (PEP 695), as produced by ``type X = int``.

    Grail's parser has no ``type`` statement, so instances are only ever
    built by an explicit call -- which is what ``typing_extensions`` does.
    """

    def __init__(self, name, value, *, type_params=()):
        self.__name__ = name
        self.__value__ = value
        self.__type_params__ = tuple(type_params)
        self.__parameters__ = tuple(type_params)
        self.__module__ = None

    def evaluate_value(self):
        return self.__value__

    def __repr__(self):
        return self.__name__

    def __getitem__(self, args):
        return _typing_module()._GenericAlias(self, args
                                              if isinstance(args, tuple)
                                              else (args,))

    def __or__(self, right):
        return _make_union((self, right))

    def __ror__(self, left):
        return _make_union((left, self))



class Generic:
    """Abstract base class for generic types.

    Both hooks are one line each: the parameterisation and subclass rules
    live in ``typing``, and this only routes to them.  See the module
    docstring.

    NO ``__slots__``, where CPython's C type has ``()``.  Grail enforces a
    slots declaration on every subclass; CPython only does when EVERY base is
    slotted.  So an empty tuple here silently took ``__dict__`` away from
    classes that plainly need one:

        class RecentlyUsedContainer(Generic[K, V], MutableMapping[K, V]):
            def __init__(self):
                self._d = {}

    ran its ``__init__``, and then ``self._d`` did not exist.  urllib3 is
    written that way, and so is a large fraction of every annotated container
    class.
    """

    _is_protocol = False

    def __class_getitem__(cls, args):
        return _typing_module()._generic_class_getitem(cls, args)

    def __init_subclass__(cls, *args, **kwargs):
        return _typing_module()._generic_init_subclass(cls, *args, **kwargs)


class _UnionMeta(type):
    """Makes ``Union`` answer for the objects ``int | str`` actually creates.

    In 3.14 ``typing.Union`` IS ``types.UnionType``: the C code made the
    special form and the ``|`` operator's result the same class, so
    ``typing.py`` now asks ``isinstance(t, Union)`` in a dozen places and
    expects ``int | str`` to say yes.  Grail builds ``int | str`` as its own
    ``PyUnionType``, which is not this class and cannot be made to be, so
    the identity is faked at the only two places typing looks: instance and
    subclass checks.
    """

    def _union_class(cls):
        u = cls.__dict__.get('_grail_union_class')
        if u is None:
            u = type(int | str)
            cls._grail_union_class = u
        return u

    def __instancecheck__(cls, obj):
        return isinstance(obj, cls._union_class())

    def __subclasscheck__(cls, other):
        return other is cls or issubclass(other, cls._union_class())

    def __repr__(cls):
        return 'typing.Union'


class Union(metaclass=_UnionMeta):
    """``Union[X, Y]``, and the type of ``X | Y``.

    Unified with ``types.UnionType`` in 3.14.  Here it is a shim -- see
    ``_UnionMeta`` for why the unification cannot be literal under Grail.
    No ``__slots__``, for the reason given on ``Generic``.
    """

    def __class_getitem__(cls, parameters):
        """``Union[X, Y]``.

        Spelled as ``__class_getitem__`` rather than as ``__getitem__`` on the
        metaclass, which is where CPython's equivalent lives.  Grail does not
        consult a metaclass ``__getitem__`` for ``Cls[...]`` and -- the part
        that cost the time -- does not raise either: it answers the CLASS.
        ``Union[int, str]`` came back as ``Union`` itself and flowed onwards as
        a well-formed value meaning nothing, so ``Optional[int]`` reprd as
        ``typing.Union``.  See docs/Issues.md.

        The work is a module-level function and not a method on ``_UnionMeta``
        for a second reason from the same family: Grail records a ``metaclass=``
        only when the metaclass takes part in class CREATION (it must define
        ``__new__`` or ``__init__`` -- see ___grailMetaclassConstructs___:), and
        ``_UnionMeta`` defines neither.  So ``type(Union)`` is plain ``type``
        here, and reaching the metaclass through it fails.
        """
        return _union_getitem(parameters)
