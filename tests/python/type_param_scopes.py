"""PEP 695 type parameters get a real scope, and the runtime pieces around them.

``class C[T]`` and ``type A[T] = V`` used to keep only the parameter NAMES:
T was unbound in the class body, a parameterised alias was a SyntaxError, and
no ``Generic[T]`` base was added -- so test_typing, which uses both, could not
even be imported.  The parser now rewrites each into the annotation scope
CPython's compiler builds (PythonParser >> ___rewriteTypeParamStatement___).

The rest are the defects test_typing hit next, each small and each in shared
machinery: an annotated attribute store that stored nothing, dir() listing
names getattr refuses, a metaclass __repr__ calling super() recursing forever,
a metaclass silently losing its class's __init_subclass__, the class __dict__
misnaming methods, a bare annotation reading as a nil class attribute,
inspect.getattr_static never raising, and calling a non-callable instance
ending the program.

Every expectation was measured against CPython 3.14.
"""

import inspect
import typing
from typing import Generic, Protocol, TypeVar, runtime_checkable

RESULTS = {}


def check(name, got, want):
    RESULTS[name] = (got == want) or ('got: ' + repr(got)[:200])


def attempt(fn):
    try:
        return ('ok', fn())
    except Exception as e:
        return (type(e).__name__, str(e))


# ----------------------------------------------------------- class C[T]

class Box[T]:
    item: T

    def get(self) -> T:
        return T


def _box():
    T, = Box.__type_params__
    return (type(T).__name__, T.__name__, T.__module__, T.__infer_variance__,
            Box().get() is T, Box.__annotations__['item'] is T)


check('class_params_are_bound_in_the_body', _box(),
      ('TypeVar', 'T', 'typing', True, True, True))
check('class_params_add_a_generic_base',
      (repr(Box.__orig_bases__), [c.__name__ for c in Box.__mro__],
       Box.__parameters__ == Box.__type_params__),
      ('(typing.Generic[T],)', ['Box', 'Generic', 'object'], True))
check('a_parameterised_class_is_subscriptable', repr(Box[int]).endswith('Box[int]'),
      True)
check('the_scope_function_is_invisible',
      (Box.__qualname__, '___generic_parameters_of_Box___' in globals()),
      ('Box', False))


class Keyed[K, V](dict, metaclass=type):
    pass


check('the_generic_base_follows_positional_bases',
      [c.__name__ for c in Keyed.__bases__], ['dict', 'Generic'])


class Bounded[T: int, U: (str, bytes), *Ts, **P]:
    # a comment line before the body, which the rewrite must see past
    pass


def _bounds():
    T, U, Ts, P = Bounded.__type_params__
    return (T.__bound__, U.__constraints__, type(Ts).__name__, type(P).__name__)


check('bounds_constraints_and_kinds', _bounds(),
      (int, (str, bytes), 'TypeVarTuple', 'ParamSpec'))


def _lazy_bound():
    class Late[T: Undefined]:
        pass
    T, = Late.__type_params__
    return attempt(lambda: T.__bound__)


check('a_bound_is_evaluated_lazily', _lazy_bound(),
      ('NameError', "name 'Undefined' is not defined"))


def _local():
    class Local[T]:
        pass
    return Local


check('a_local_class_keeps_its_qualname', _local().__qualname__,
      '_local.<locals>.Local')
check('type_params_are_not_inherited',
      (type('Sub', (Box,), {}).__type_params__, len(Box.__type_params__)),
      ((), 1))


@runtime_checkable
class HasMeth[T](Protocol):
    def meth(self) -> T: ...


class Impl:
    def meth(self):
        return 1


check('a_parameterised_protocol',
      (len(HasMeth.__parameters__), isinstance(Impl(), HasMeth),
       isinstance(object(), HasMeth)),
      (1, True, False))

# ----------------------------------------------------------- type A[T] = V

type Pair[K, V] = dict[K, V]


def _alias():
    K, V = Pair.__type_params__
    return (type(Pair).__name__, Pair.__name__, Pair.__module__ == __name__,
            Pair.__value__ == dict[K, V], repr(Pair[int, str].__args__))


check('a_parameterised_alias', _alias(),
      ('TypeAliasType', 'Pair', True, True, "(<class 'int'>, <class 'str'>)"))


def _plain_alias_subscript():
    type Plain = int
    return attempt(lambda: typing.TypeAliasType('Plain', int)[int])


check('only_a_generic_alias_is_subscriptable', _plain_alias_subscript(),
      ('TypeError', 'Only generic type aliases are subscriptable'))


def _forward_alias():
    type Json[T] = T | list[Json[T]]
    return Json.__value__.__args__[0] is Json.__type_params__[0]


check('an_alias_value_sees_its_params_and_itself', _forward_alias(), True)

# ----------------------------------------------------------- TypeVar

T = TypeVar('T')
check('a_typevar_belongs_to_its_module', T.__module__ == __name__, True)
check('the_typing_classes_report_typing',
      (TypeVar.__module__, Generic.__module__, repr(Generic[T])),
      ('typing', 'typing', 'typing.Generic[~T]'))

# ----------------------------------------------------------- neighbours


class Plain:
    pass


def _annotated_store():
    p = Plain()
    p.x: int = 10
    return p.x


check('an_annotated_attribute_store_stores', _annotated_store(), 10)


def _dir_is_gettable():
    missing = []
    for name in dir(Plain):
        try:
            getattr(Plain, name)
        except AttributeError:
            missing.append(name)
    return missing


check('every_name_dir_lists_is_gettable', _dir_is_gettable(), [])


class ReprMeta(type):
    def __repr__(cls):
        return 'meta:' + super().__repr__()


class Shown(metaclass=ReprMeta):
    pass


check('a_metaclass_repr_may_call_super', repr(Shown).startswith("meta:<class '"),
      True)
check('a_subclass_of_any_reprs_as_a_class',
      repr(type('SubAny', (typing.Any,), {})).startswith("<class '"), True)

_SEEN = []


class Hooked:
    def __init_subclass__(cls, **kw):
        _SEEN.append(cls.__name__)


class ConstructingMeta(type):
    def __new__(mcls, name, bases, ns, **kw):
        return super().__new__(mcls, name, bases, ns, **kw)


class HookedWithMeta(Hooked, metaclass=ConstructingMeta):
    def __init_subclass__(cls, **kw):
        _SEEN.append('own:' + cls.__name__)
        super().__init_subclass__(**kw)


class Leaf(HookedWithMeta):
    pass


check('a_metaclass_keeps_its_classes_init_subclass', _SEEN,
      ['HookedWithMeta', 'own:Leaf', 'Leaf'])


class Methods:
    def __init__(self, a=1): pass
    def _under(self): pass
    def star(self, *a, **k): pass
    def plain(self, a, b): pass
    @classmethod
    def cm(cls, x): pass
    @staticmethod
    def sm(x, y=2): pass


check('the_class_dict_names_each_method_once',
      sorted(k for k in Methods.__dict__ if not k.startswith('__') or k == '__init__'),
      ['__init__', '_under', 'cm', 'plain', 'sm', 'star'])


class Annotated:
    x: int
    y: int = 2


check('a_bare_annotation_binds_nothing',
      (hasattr(Annotated, 'x'), Annotated.y, 'x' in Annotated.__dict__,
       sorted(Annotated.__annotations__)),
      (False, 2, False, ['x', 'y']))
check('getattr_static_raises_for_a_missing_name',
      (attempt(lambda: inspect.getattr_static(Plain(), 'nope')),
       inspect.getattr_static(Plain(), 'nope', 'dflt')),
      (('AttributeError', 'nope'), 'dflt'))
check('calling_a_non_callable_instance_is_a_type_error',
      attempt(lambda: Plain()())[0], 'TypeError')


if __name__ == '__main__':
    for _name in sorted(RESULTS):
        _v = RESULTS[_name]
        print('%-4s %s' % ('OK' if _v is True else 'FAIL', _name),
              '' if _v is True else _v)
