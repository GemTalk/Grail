"""What CPython's ``typing`` module offers, measured rather than assumed.

Grail used to answer ``import typing`` with a hand-written 975-line stub of 84
names.  It now answers with CPython 3.14's own typing.py, unmodified, over a
pure-Python stand-in for the ``_typing`` C accelerator (src/python/stdlib/
_typing.py).  These checks are the acceptance test for that swap, and every one
of them also passes under CPython 3.14 -- which is the point: a fixture written
from a Grail session pins Grail's behaviour, bug and all.

Grouped by what each group would tell you if it broke:

  * THE SURFACE -- the names exist.  A missing name is how this began: seven
    of the fifty most-downloaded pip packages stopped on ``typing._Final`` or
    ``typing.AnyStr`` (docs/Package_Census.md).
  * THE UNIONS -- ``Union[...]`` and ``|`` agree, and both accept typing's own
    objects.  This is where the vendoring nearly came apart; see
    ``_typing._make_union``.
  * THE MACHINERY -- Generic, Protocol, NamedTuple, TypedDict, NewType and
    get_type_hints do their jobs.  A name that exists but does nothing is worse
    than a missing one, because it fails later and somewhere else.
  * PEP 562 -- five typing names are served by a module-level ``__getattr__``,
    which Grail did not implement.  Testing them here tests the general
    feature through the stdlib's own use of it.
"""

import typing


# ---------------------------------------------------------------- the surface

def every_public_name_is_present():
    """``typing.__all__`` is not a wish list -- every name in it resolves.

    Under the old stub 22 of the 105 did not, ``AnyStr`` among them.
    """
    return all(hasattr(typing, name) for name in typing.__all__)


def the_private_names_packages_reach_for_are_present():
    """"Public API only" is not a sufficient target.

    typing_extensions -- a dependency of much of the modern ecosystem -- imports
    these directly, and a subset that omitted them was the top-ranked gap in the
    package census.  ``_Final`` is the one that showed up in the error message.
    """
    return all(hasattr(typing, name) for name in (
        '_Final', '_SpecialForm', '_GenericAlias', '_type_check', '_eval_type',
        '_ProtocolMeta', '_TypedDictMeta', '_collect_type_parameters',
        '_strip_annotations', '_tp_cache'))


def anystr_is_a_constrained_typevar():
    """Not merely present -- the right SHAPE.

    ``AnyStr`` is a TypeVar constrained to (str, bytes), and anyio, h11 and
    httpcore all do ``from typing import AnyStr``.
    """
    return (isinstance(typing.AnyStr, typing.TypeVar)
            and set(typing.AnyStr.__constraints__) == {str, bytes})


def text_is_str():
    return typing.Text is str


def the_collection_aliases_carry_their_origins():
    """``ChainMap``/``Counter``/``Deque``/``DefaultDict``/``OrderedDict``.

    All five were absent.  Checking ``__origin__`` and not just the name is
    what distinguishes a real alias from a placeholder that answers to it.
    """
    import collections
    pairs = [
        (typing.ChainMap, collections.ChainMap),
        (typing.Counter, collections.Counter),
        (typing.Deque, collections.deque),
        (typing.DefaultDict, collections.defaultdict),
        (typing.OrderedDict, collections.OrderedDict),
    ]
    return all(alias.__origin__ is origin for alias, origin in pairs)


def the_type_narrowing_forms_are_present():
    """PEP 647/742 ``TypeGuard`` and ``TypeIs``, plus PEP 705 ``ReadOnly``."""
    return all(getattr(typing, n, None) is not None
               for n in ('TypeGuard', 'TypeIs', 'ReadOnly', 'NoDefault',
                         'TypeAliasType', 'ParamSpecArgs', 'ParamSpecKwargs'))


def the_helper_functions_are_callable():
    return all(callable(getattr(typing, n)) for n in (
        'override', 'reveal_type', 'is_typeddict', 'is_protocol',
        'get_protocol_members', 'dataclass_transform', 'assert_type',
        'assert_never', 'get_origin', 'get_args', 'get_type_hints'))


# ----------------------------------------------------------------- the unions

def a_typevar_can_stand_on_either_side_of_a_bar():
    """PEP 604 over a type variable -- ``def f(x: T | None)``.

    Both directions, because they take different paths: the left-hand form
    reaches the type variable's own ``__or__``, the right-hand one only its
    reflected ``__ror__``.
    """
    T = typing.TypeVar('T')
    left = T | None
    right = None | T
    return (typing.get_args(left) == (T, type(None))
            and typing.get_args(right) == (type(None), T))


def a_generic_alias_can_stand_on_either_side_of_a_bar():
    left = typing.List[int] | None
    right = None | typing.List[int]
    return (len(typing.get_args(left)) == 2
            and len(typing.get_args(right)) == 2)


def the_subscript_and_the_operator_agree():
    """``Union[int, str]`` and ``int | str`` are one object, not two.

    They compare equal in CPython because they ARE the same class as of 3.14.
    A Union built by a separate route would satisfy every isinstance check and
    still fail this one.
    """
    return typing.Union[int, str] == (int | str)


def optional_is_a_union_with_none():
    return typing.get_args(typing.Optional[int]) == (int, type(None))


def a_union_of_one_collapses():
    return typing.Union[int] is int


def a_nested_union_is_flattened():
    return set(typing.get_args(typing.Union[int, typing.Union[str, bytes]])) \
        == {int, str, bytes}


def a_union_is_a_types_uniontype():
    """``isinstance(int | str, types.UnionType)``.

    The one thing the name is used for: it is how a library asks "is this
    annotation a union?" before reading ``__args__``.
    """
    import types
    return isinstance(int | str, types.UnionType)


def a_union_of_no_types_is_refused():
    """A guard rail -- the constructor must still say no."""
    try:
        typing.Union[()]
    except TypeError:
        return True
    return False


# -------------------------------------------------------------- the machinery

def a_generic_class_parameterises():
    T = typing.TypeVar('T')

    class Box(typing.Generic[T]):
        def __init__(self, value):
            self.value = value

    return (Box[int].__origin__ is Box
            and Box[int].__args__ == (int,)
            and Box(3).value == 3)


def a_runtime_checkable_protocol_checks_at_runtime():
    @typing.runtime_checkable
    class Closeable(typing.Protocol):
        def close(self): ...

    class WithClose:
        def close(self):
            return None

    class WithoutClose:
        pass

    return (isinstance(WithClose(), Closeable)
            and not isinstance(WithoutClose(), Closeable))


def a_namedtuple_is_a_tuple():
    NT = typing.NamedTuple('NT', [('a', int), ('b', str)])
    value = NT(1, 'x')
    return value.a == 1 and value.b == 'x' and tuple(value) == (1, 'x')


def a_typeddict_reports_itself():
    TD = typing.TypedDict('TD', {'a': int})
    return typing.is_typeddict(TD) and not typing.is_typeddict(dict)


def a_newtype_is_callable_and_is_the_identity():
    """``NewType.__call__ = _idfunc`` -- a dunder ASSIGNED, not defined.

    CPython's typing.py writes it that way verbatim.  Grail compiled a
    class-body assignment to an accessor on the metaclass and found no
    ``__call__`` among the class's own methods, so ``UserId(5)`` died on an
    uncatchable MessageNotUnderstood.
    """
    UserId = typing.NewType('UserId', int)
    return callable(UserId) and UserId(5) == 5


def get_type_hints_resolves_a_string_annotation():
    """The single most common thing anyone asks typing to do.

    A quoted annotation is the ordinary way to write a forward reference, and
    resolving one goes through ``annotationlib.ForwardRef.evaluate``.
    """
    def f(a: 'int', b: 'str') -> 'bool':
        return True

    hints = typing.get_type_hints(f)
    return (hints['a'] is int and hints['b'] is str
            and hints['return'] is bool)


def get_type_hints_resolves_a_forward_reference_to_a_later_class():
    """A class naming ITSELF in an annotation -- the reason quoting exists.

    ``_Node`` is module-level, not nested: a forward reference resolves
    against the defining module's globals, so a class defined inside this
    function is unresolvable under CPython too, and a check that failed on
    both would be measuring nothing.
    """
    return typing.get_type_hints(_Node.child)['other'] is _Node


def a_forwardref_declares_its_slots():
    """``"__forward_is_class__" in typing.ForwardRef.__slots__``.

    typing_extensions line 161, and pydantic_core reaches it the same way:
    the slot names are read as a version-detection API.
    """
    return ('__forward_is_class__' in typing.ForwardRef.__slots__
            and '__arg__' in typing.ForwardRef.__slots__)


def a_forwardref_reports_its_argument():
    return typing.ForwardRef('int').__forward_arg__ == 'int'


def a_generic_alias_reprs_as_itself():
    """Needs ``annotationlib.type_repr``, which Grail did not have.

    Without it ``get_origin``/``get_args`` on an alias worked and ``repr`` of
    the same object raised -- a shape that reads as "generics are broken".
    """
    return repr(typing.Dict[str, int]) == 'typing.Dict[str, int]'


class _Node:
    """Module-level, for the forward-reference check above."""

    def child(self, other: '_Node') -> '_Node':
        return other


# ------------------------------------------------------------------- PEP 562

def the_soft_deprecated_names_resolve():
    """Five names typing serves from a module-level ``__getattr__``.

    CPython moved them behind PEP 562 purely so ``import typing`` does not pay
    to build them.  Grail did not consult a module ``__getattr__`` at all, so
    the five were simply unreachable -- and the stub typing they replaced HAD
    them, so vendoring without PEP 562 would have been a regression.
    """
    return all(getattr(typing, n, None) is not None for n in (
        'ForwardRef', 'Pattern', 'Match', 'ContextManager',
        'AsyncContextManager'))


def a_module_getattr_does_not_shadow_a_real_name():
    """The hook is consulted only AFTER the ordinary lookup fails.

    ``typing.List`` is a real module-level name; a hook consulted first would
    answer for it too, and typing's raises AttributeError for anything outside
    its five.
    """
    return typing.List.__origin__ is list


def an_unknown_name_still_raises_attributeerror():
    """And the message names the module.

    It used to read ``module '?' has no attribute ...`` for every module: the
    name was probed in the wrong place and could only ever come back nil.  An
    error naming no module names nothing, and it cost real time in the census.
    """
    try:
        typing.no_such_name_at_all
    except AttributeError as exc:
        return 'typing' in str(exc)
    return False


# scripts/check_python_fixtures.sh runs this under CPython in CI.
if __name__ == '__main__':
    checks = [
        every_public_name_is_present,
        the_private_names_packages_reach_for_are_present,
        anystr_is_a_constrained_typevar,
        text_is_str,
        the_collection_aliases_carry_their_origins,
        the_type_narrowing_forms_are_present,
        the_helper_functions_are_callable,
        a_typevar_can_stand_on_either_side_of_a_bar,
        a_generic_alias_can_stand_on_either_side_of_a_bar,
        the_subscript_and_the_operator_agree,
        optional_is_a_union_with_none,
        a_union_of_one_collapses,
        a_nested_union_is_flattened,
        a_union_is_a_types_uniontype,
        a_union_of_no_types_is_refused,
        a_generic_class_parameterises,
        a_runtime_checkable_protocol_checks_at_runtime,
        a_namedtuple_is_a_tuple,
        a_typeddict_reports_itself,
        a_newtype_is_callable_and_is_the_identity,
        get_type_hints_resolves_a_string_annotation,
        get_type_hints_resolves_a_forward_reference_to_a_later_class,
        a_forwardref_declares_its_slots,
        a_forwardref_reports_its_argument,
        a_generic_alias_reprs_as_itself,
        the_soft_deprecated_names_resolve,
        a_module_getattr_does_not_shadow_a_real_name,
        an_unknown_name_still_raises_attributeerror,
    ]
    for fn in checks:
        print('%-4s %s' % ('OK' if fn() is True else 'FAIL', fn.__name__))
