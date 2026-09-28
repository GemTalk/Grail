"""Metaclass and class-construction protocols typing depends on.

typing.py used to replace CPython's NamedTuple and TypedDict because
``type.__new__`` could not rebuild a class with the bases a metaclass passed
it.  That, and the neighbouring protocols test_typing leans on, are pinned
here: calling a metaclass directly, an assigned metaclass ``__call__``, the
metaclass a class inherits through its second base, the namespace a
metaclass is handed, MRO order for class-level reads, and the refusals
CPython's C types make.

Every expectation was measured against CPython 3.14.
"""

import abc
import collections
import collections.abc as cabc
import pprint
import re
import types
import typing
from typing import NamedTuple, NotRequired, Protocol, TypedDict, TypeVar

RESULTS = {}


def check(name, got, want):
    RESULTS[name] = (got == want) or ('got: ' + repr(got)[:200])


def attempt(fn):
    try:
        return ('ok', fn())
    except Exception as e:
        return (type(e).__name__, str(e))


# ----------------------------------------------------------- calling a metaclass


class Meta(type):
    pass


built = Meta('Built', (), {'a': 1})
check('a_metaclass_call_builds_a_class',
      (type(built) is Meta, isinstance(built, type), built.__name__, built.a),
      (True, True, 'Built', 1))
check('a_metaclass_call_refuses_the_wrong_arity', attempt(lambda: Meta())[0],
      'TypeError')


class ListCall(type):
    __call__ = list


class Listy(metaclass=ListCall):
    pass


check('an_assigned_metaclass_call_is_not_bound', Listy('ab'), ['a', 'b'])

# ----------------------------------------------------------- rewriting the bases


class DictMeta(type):
    def __new__(mcls, name, bases, ns):
        return type.__new__(mcls, name, (dict,), ns)


class Rooted(metaclass=DictMeta):
    x = 1


check('type_new_builds_the_bases_the_metaclass_passes',
      (Rooted.__bases__, Rooted.__mro__[1:], Rooted.x),
      ((dict,), (dict, object), 1))


class Movie(TypedDict, total=False):
    name: str
    year: NotRequired[int]


check('a_typeddict_is_a_dict_subclass',
      (Movie.__bases__, Movie.__optional_keys__, type(Movie(name='x'))),
      ((dict,), frozenset({'name', 'year'}), dict))

T = TypeVar('T')


class GenericMovie(typing.Generic[T], TypedDict):
    value: T


check('a_generic_typeddict_through_its_second_base',
      (GenericMovie.__bases__, GenericMovie.__parameters__),
      ((typing.Generic, dict), (T,)))


class Token(NamedTuple):
    lineno: int
    kind: str = 'name'

    def test(self, expr):
        return self.kind == expr

    def test_any(self, *exprs):
        return any(self.test(e) for e in exprs)


check('a_namedtuple_is_a_tuple_subclass',
      (Token.__bases__, Token(1), Token._field_defaults),
      ((tuple,), Token(1, 'name'), {'kind': 'name'}))
check('a_namedtuple_method_calls_its_sibling', Token(1).test_any('x', 'name'), True)

# ----------------------------------------------------------- the namespace

seen = []


class Watch(dict):
    def __setitem__(self, k, v):
        seen.append(k)
        dict.__setitem__(self, k, v)


class WatchMeta(type):
    @classmethod
    def __prepare__(mcls, name, bases, **kw):
        return Watch()


class Watched(metaclass=WatchMeta):
    plain = 1


check('the_namespace_starts_with_module_and_qualname',
      [k for k in seen if k not in ('__firstlineno__', '__static_attributes__')],
      ['__module__', '__qualname__', 'plain'])

# ----------------------------------------------------------- inherited metaclass


class Mixin:
    pass


class Shape(Mixin, abc.ABC):
    @abc.abstractmethod
    def area(self): ...


check('a_second_base_supplies_the_metaclass',
      (type(Shape) is abc.ABCMeta, attempt(Shape)[0]), (True, 'TypeError'))


class SessionLike(dict, cabc.MutableMapping):
    pass


check('a_builtin_base_implements_the_abstract_methods',
      (SessionLike.__abstractmethods__, list(SessionLike(a=1)),
       SessionLike.__iter__ == dict.__iter__),
      (frozenset(), ['a'], True))

# ----------------------------------------------------------- class-level reads


class A:
    pass


class B(A):
    pass


check('an_inherited_method_is_the_same_object',
      (B.__init__ is A.__init__, A.__init__ is object.__init__), (True, True))


def _refuse(self, *args, **kwargs):
    raise TypeError('refused')


class Refusing:
    pass


Refusing.__init__ = _refuse


class OwnInit(Refusing):
    def __init__(self):
        self.ok = True


check('a_subclass_def_beats_a_base_assignment', OwnInit().ok, True)


class Proto(Protocol):
    def meth(self): ...


class Concrete(Proto):
    def __init__(self):
        self.value = 'OK'


check('a_protocol_refuses_and_a_subclass_constructs',
      (attempt(Proto)[0], Concrete().value), ('TypeError', 'OK'))


class CheckMeta(type):
    def __instancecheck__(cls, obj):
        return super().__instancecheck__(obj)


class Checked(metaclass=CheckMeta):
    pass


check('super_instancecheck_from_a_metaclass',
      (isinstance(Checked(), Checked), isinstance(3, Checked)), (True, False))

# A method a subclass inherits compares equal to the base's, so a table keyed
# on ``type(obj).__repr__`` (pprint's dispatch) needs defaultdict and
# OrderedDict to define their own -- borrowed, the defaultdict entry replaced
# dict's and a wrapping plain dict crashed pprint.
check('pprint_keeps_dict_and_defaultdict_apart',
      (pprint.pformat({'k%d' % i: list(range(8)) for i in range(4)},
                      width=40).splitlines()[0],
       collections.defaultdict.__repr__ == dict.__repr__,
       repr(collections.OrderedDict(a=1))),
      ("{'k0': [0, 1, 2, 3, 4, 5, 6, 7],", False, "OrderedDict({'a': 1})"))

# ----------------------------------------------------------- refusals


def _subclass(base):
    def make():
        class Sub(base):
            pass
        return Sub
    return attempt(make)


check('typing_types_refuse_subclassing',
      (_subclass(TypeVar), _subclass(TypeVar('U')), _subclass(int | str),
       _subclass(re.Pattern)),
      (('TypeError', "type 'typing.TypeVar' is not an acceptable base type"),
       ('TypeError', 'Cannot subclass an instance of TypeVar'),
       ('TypeError', 'Cannot subclass int | str'),
       ('TypeError', "type 're.Pattern' is not an acceptable base type")))
check('pattern_aliases_are_named_after_re',
      (repr(typing.Pattern), repr(typing.Match[str])),
      ('typing.Pattern', 'typing.Match[str]'))
check('a_function_type_is_callable',
      issubclass(types.FunctionType, cabc.Callable), True)


if __name__ == '__main__':
    for _name in sorted(RESULTS):
        _v = RESULTS[_name]
        print('%-4s %s' % ('OK' if _v is True else 'FAIL', _name),
              '' if _v is True else _v)
