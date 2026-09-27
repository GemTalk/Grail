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
* PEP 695's ``class C[T]`` and ``type X[T] = ...`` are compiler features.
  Grail's parser rewrites each into a call of a hidden function that binds
  the type params, as CPython's annotation scope does, and that function
  calls the three ``_grail_*`` helpers at the foot of the TypeAliasType
  section to build them.  Nothing else in this module knows about the
  syntax.
* PEP 649's lazy annotations (``evaluate_bound`` and the other
  ``evaluate_*`` hooks) are likewise a compiler feature.  The versions here
  answer the value (evaluating a PEP 695 thunk first, if there is one),
  which is all the vendored ``typing.py`` asks of them.
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


def _caller_module(depth):
    """The ``__name__`` of the module whose code is ``depth`` frames up.

    CPython's C type variables record where they were CREATED as their
    ``__module__`` -- ``T = TypeVar('T')`` in ``test.test_typing`` answers
    ``'test.test_typing'`` -- read from the calling frame's globals, and None
    when those globals have no ``__name__`` (code run by ``exec`` with a bare
    dict).  A class defined in this file would otherwise report ``'_typing'``
    for every one of them.
    """
    import sys
    try:
        return sys._getframe(depth + 1).f_globals.get('__name__')
    except (AttributeError, ValueError):
        return None


def _typing_module():
    """Answer the ``typing`` module, imported on demand.

    See the module docstring: ``typing`` is mid-import when this module is
    created, so this can only ever run later, from inside a method.
    """
    import typing
    return typing


def _make_union(parameters):
    """``Union[parameters]`` -- CPython's spelling of a type variable's ``|``.

    It used to build the union straight from the Smalltalk side, because
    ``Union[...]`` here was a Python shim whose subscript folded ``|`` and so
    recursed back into this.  Union IS the union type now, as in 3.14, and its
    subscript builds without ``|`` -- converting a string member to a
    ForwardRef on the way, which ``T | 'x'`` needs (TypeVarTests.test_or).
    """
    return Union[tuple(parameters)]


def _not_a_base(name):
    """``__init_subclass__`` for a type CPython implements in C without
    Py_TPFLAGS_BASETYPE -- ``class V(TypeVar)'' is refused there with
    ``type 'typing.TypeVar' is not an acceptable base type''.  Grail's
    stand-ins are ordinary Python classes, so the refusal is spelled out;
    PEP 487 runs it on the parent as the subclass is created."""
    def __init_subclass__(cls, *args, **kwargs):
        raise TypeError(f"type '{name}' is not an acceptable base type")
    return classmethod(__init_subclass__)


def _cannot_subclass_instance(obj):
    """``class W(T)'' for a type variable is CPython's ``Cannot subclass an
    instance of TypeVar'', raised from the variable's ``__mro_entries__''."""
    return f"Cannot subclass an instance of {type(obj).__name__}"


class _NoDefaultType:
    """The type of the ``NoDefault`` sentinel."""

    __slots__ = ()
    __init_subclass__ = _not_a_base('NoDefaultType')

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

    def __getattr__(self, name):
        """Evaluate a PEP 695 bound, constraint tuple or default on first read.

        ``class C[T: Undefined]`` is legal: CPython evaluates the bound lazily,
        in the scope the class was written in, only when ``T.__bound__`` is
        asked for.  _grail_type_param stores the unevaluated form as a thunk
        under ``_lazy`` and leaves the attribute itself unset, so the first
        read arrives here, runs the thunk once, and keeps the answer.
        """
        lazy = self.__dict__.get('_lazy')
        if lazy is not None and name in lazy:
            value = lazy.pop(name)()
            if name == '__constraints__':
                value = tuple(value)
            self.__dict__[name] = value
            return value
        raise AttributeError(
            f"{type(self).__name__!r} object has no attribute {name!r}")

    def evaluate_default(self):
        # PEP 649 lazy form.  Grail evaluates defaults eagerly, so the
        # "evaluate" step is already done; answer the value.
        return self.__default__

    def __or__(self, right):
        """``T | None``, PEP 604.

        CPython's ``Union[self, right]`` (see ``_make_union``).  Defining it at
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
    ``class C[T]`` syntax, through _grail_type_param.
    """

    __init_subclass__ = _not_a_base('typing.TypeVar')

    def __mro_entries__(self, bases):
        raise TypeError(_cannot_subclass_instance(self))

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
        self.__module__ = _caller_module(1)

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

    __init_subclass__ = _not_a_base('typing.ParamSpecArgs')

    def __mro_entries__(self, bases):
        raise TypeError(_cannot_subclass_instance(self))

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

    __init_subclass__ = _not_a_base('typing.ParamSpecKwargs')

    def __mro_entries__(self, bases):
        raise TypeError(_cannot_subclass_instance(self))

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

    __init_subclass__ = _not_a_base('typing.ParamSpec')

    def __mro_entries__(self, bases):
        raise TypeError(_cannot_subclass_instance(self))

    def __init__(self, name, *, bound=None, covariant=False,
                 contravariant=False, default=NoDefault, infer_variance=False):
        self.__name__ = name
        self.__covariant__ = bool(covariant)
        self.__contravariant__ = bool(contravariant)
        self.__infer_variance__ = bool(infer_variance)
        self.__default__ = default
        self.__bound__ = bound
        self.__module__ = _caller_module(1)

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
        # infer_variance drops the prefix, as for TypeVar: it is how every PEP
        # 695 ``**P'' is minted, and CPython prints it as a bare ``P''.
        if self.__covariant__:
            prefix = '+'
        elif self.__contravariant__:
            prefix = '-'
        elif self.__infer_variance__:
            prefix = ''
        else:
            prefix = '~'
        return prefix + self.__name__



class TypeVarTuple(_Common):
    """Type variable tuple (PEP 646)."""

    __init_subclass__ = _not_a_base('typing.TypeVarTuple')

    def __mro_entries__(self, bases):
        raise TypeError(_cannot_subclass_instance(self))

    def __init__(self, name, *, default=NoDefault):
        self.__name__ = name
        self.__default__ = default
        self.__module__ = _caller_module(1)

    def __iter__(self):
        yield _typing_module().Unpack[self]

    def __typing_subst__(self, arg):
        raise TypeError("Substitution of bare TypeVarTuple is not supported")

    def __typing_prepare_subst__(self, alias, args):
        return _typing_module()._typevartuple_prepare_subst(self, alias, args)

    def __repr__(self):
        return self.__name__


class TypeAliasType:
    """Type alias (PEP 695).

    Built either by an explicit call -- which is what ``typing_extensions``
    does -- or by the ``type X[T] = ...`` statement, which the parser rewrites
    into a call of ``_grail_type_alias`` (see PythonParser >>
    ___rewriteTypeParamStatement___).  The statement's value is LAZY: it is
    evaluated on the first read of ``__value__``, which is what lets an alias
    name something defined later, or itself.  An explicit call passes the
    value itself, so there is nothing left to evaluate.
    """

    def __init__(self, name, value, *, type_params=()):
        if not isinstance(name, str):
            raise TypeError("TypeAliasType.__new__() argument 'name' must be "
                            f"str, not {type(name).__name__}")
        if not isinstance(type_params, tuple):
            raise TypeError("type_params must be a tuple")
        for p in type_params:
            if not isinstance(p, (TypeVar, ParamSpec, TypeVarTuple)):
                raise TypeError(f"Expected a type param, got {p!r}")
        self.__name__ = name
        self.__value__ = value
        self.__type_params__ = type_params
        self.__module__ = _caller_module(1)

    def __getattr__(self, name):
        # The lazy value of a ``type`` statement: see _grail_type_alias.
        if name == '__value__':
            thunk = self.__dict__.pop('_value_thunk', None)
            if thunk is not None:
                value = thunk()
                self.__dict__['__value__'] = value
                return value
        raise AttributeError(
            f"'typing.TypeAliasType' object has no attribute {name!r}")

    @property
    def __parameters__(self):
        # The type params with each TypeVarTuple unpacked, as CPython's
        # typealias_parameters builds it -- ``type A[*Ts] = ...`` has
        # __parameters__ ``(*Ts,)``, not ``(Ts,)``.
        return tuple(_typing_module().Unpack[p] if isinstance(p, TypeVarTuple)
                     else p for p in self.__type_params__)

    def evaluate_value(self):
        return self.__value__

    def __repr__(self):
        return self.__name__

    def __reduce__(self):
        return self.__name__

    def __getitem__(self, args):
        if not self.__type_params__:
            raise TypeError("Only generic type aliases are subscriptable")
        import types
        return types.GenericAlias(self, args if isinstance(args, tuple)
                                  else (args,))

    def __init_subclass__(cls, *args, **kwargs):
        raise TypeError(
            "type 'typing.TypeAliasType' is not an acceptable base type")

    def __or__(self, right):
        return _make_union((self, right))

    def __ror__(self, left):
        return _make_union((left, self))


def _grail_type_alias(name, value_thunk, type_params):
    """``type name[type_params] = value``, with the value left unevaluated.

    The parser rewrites the statement into a call of this function from a
    hidden ``___generic_parameters_of_<name>___`` function that binds the type
    params (see PythonParser >> ___rewriteTypeParamStatement___).  value_thunk
    is a lambda over that function's scope, so the value sees every type
    param and is not evaluated until ``__value__`` is read.
    """
    alias = TypeAliasType.__new__(TypeAliasType)
    alias.__name__ = name
    alias.__type_params__ = tuple(type_params)
    alias.__module__ = _caller_module(1)
    alias._value_thunk = value_thunk
    return alias


def _grail_type_param(kind, name, bound=None, constraints=None, default=None):
    """One PEP 695 type parameter: ``T``, ``T: bound``, ``T: (A, B)``,
    ``*Ts``, ``**P``, each optionally ``= default``.

    kind is 0 for a TypeVar, 1 for a TypeVarTuple, 2 for a ParamSpec.  bound,
    constraints and default are zero-argument lambdas, or None when absent:
    CPython evaluates all three lazily, in the scope that declared the
    parameter (see _Common.__getattr__).  A parameter made this way infers its
    variance, as CPython's does.
    """
    # CPython's typevarobject.c makes these with ``__module__`` 'typing', not
    # the declaring module: the intrinsic runs with no Python caller of its own.
    module = 'typing'
    if kind == 1:
        param = TypeVarTuple(name)
    elif kind == 2:
        param = ParamSpec(name, infer_variance=True)
    else:
        param = TypeVar(name, infer_variance=True)
    lazy = {}
    if bound is not None:
        lazy['__bound__'] = bound
        del param.__bound__
    if constraints is not None:
        lazy['__constraints__'] = constraints
        del param.__constraints__
    if default is not None:
        lazy['__default__'] = default
        del param.__default__
    if lazy:
        param._lazy = lazy
    param.__module__ = module
    return param


def _grail_generic_base(type_params):
    """The ``Generic[...]`` base CPython's compiler appends to ``class C[T]``.

    ``_Py_subscript_generic`` builds it as ``typing._GenericAlias(Generic,
    params)`` directly -- not through ``Generic.__class_getitem__``, which
    would refuse a bare TypeVarTuple -- after unpacking each TypeVarTuple.
    """
    typing = _typing_module()
    params = tuple(typing.Unpack[p] if isinstance(p, TypeVarTuple) else p
                   for p in type_params)
    return typing._GenericAlias(Generic, params)



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


# ``typing.Union`` IS the union type in 3.14 -- ``int | str`` and
# ``Union[int, str]`` build one kind of object, and ``isinstance(t, Union)`` is
# how typing.py asks whether it has one.  Grail's union type is the Smalltalk
# PyUnionType, which reports itself as ``typing.Union``; this used to be a
# Python class faking that identity with a metaclass's instance and subclass
# checks, and pickling a union found it out ("typing.Union is a different
# object").
Union = type(int | str)


# The C types report themselves as typing's -- ``typing.Generic[~T]'',
# ``<class 'typing.TypeVar'>'' -- because that is where they are published.
# Classes defined in this file would otherwise print as ``_typing.Generic``.
for _cls in (TypeVar, ParamSpec, TypeVarTuple, ParamSpecArgs, ParamSpecKwargs,
             TypeAliasType, Generic, _NoDefaultType):
    _cls.__module__ = 'typing'
del _cls
