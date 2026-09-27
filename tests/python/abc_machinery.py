"""abc, collections.abc and types.GenericAlias are CPython's, and behave so.

Grail's abc was a stub (no ABCMeta class creation, no abstract-instantiation
check outside an explicit ``metaclass=abc.ABCMeta``), its collections.abc a
hand-written stand-in (``Callable[...]`` answered the class itself), and its
types.GenericAlias knew nothing of substitution.  abc and collections.abc are
now CPython 3.14.6's, with three recorded deviations (abc.py's GRAIL DEVIATION
notes), and the generic alias and union types delegate their rules to
_grail_generic_alias, a port of the C.

The checks below are the behaviours that change made observable, and the
shared-machinery defects it exposed on the way: builtin class dicts that
listed none of their methods, protocol-refusing stand-ins that read as real
methods, a strict-slots base displaced by a deeper one, a class-attribute
overlay whose walk let an ancestor's session store shadow a class's own value,
and more.

Every expectation was measured against CPython 3.14.
"""

import abc
import collections
import collections.abc as cabc
import functools
import pickle
import types
import typing

RESULTS = {}


def check(name, got, want):
    RESULTS[name] = (got == want) or ('got: ' + repr(got)[:200])


def attempt(fn):
    try:
        return ('ok', fn())
    except Exception as e:
        return (type(e).__name__, str(e))


# ----------------------------------------------------------- abc


class Shape(abc.ABC):
    @abc.abstractmethod
    def area(self): ...

    @abc.abstractmethod
    def name(self): ...


class Square(Shape):
    def area(self):
        return 4

    def name(self):
        return 'square'


check('abstract_methods_are_computed',
      (sorted(Shape.__abstractmethods__), Square.__abstractmethods__),
      (['area', 'name'], frozenset()))
check('an_abstract_class_refuses_instantiation', attempt(Shape),
      ('TypeError', "Can't instantiate abstract class Shape without an "
                    "implementation for abstract methods 'area', 'name'"))
check('a_concrete_subclass_instantiates', Square().area(), 4)
check('abc_is_declared_with_abcmeta', type(abc.ABC) is abc.ABCMeta, True)


class Plain:
    @abc.abstractmethod
    def f(self): ...


check('a_plain_class_is_not_checked', type(Plain()).__name__, 'Plain')


class Virtual:
    pass


Shape.register(Virtual)
check('register_makes_a_virtual_subclass',
      (issubclass(Virtual, Shape), isinstance(Virtual(), Shape),
       Virtual in Shape.__subclasses__()),
      (True, True, False))


class Duck:
    def quack(self): pass


class Quacker(abc.ABC):
    @classmethod
    def __subclasshook__(cls, C):
        return True if hasattr(C, 'quack') else NotImplemented


check('a_subclasshook_decides', (isinstance(Duck(), Quacker), isinstance(3, Quacker)),
      (True, False))

# ----------------------------------------------------------- collections.abc

check('builtins_are_their_abcs',
      (isinstance([], cabc.MutableSequence), isinstance({}, cabc.MutableMapping),
       isinstance((), cabc.Sequence), isinstance('', cabc.Sequence),
       isinstance(frozenset(), cabc.Set), isinstance({}.keys(), cabc.KeysView),
       isinstance(range(3), cabc.Sequence)),
      (True, True, True, True, True, True, True))
check('structural_checks_read_the_class_dict',
      (isinstance(None, cabc.Iterable), isinstance(3, cabc.Iterable),
       isinstance([], cabc.Hashable), isinstance(1, cabc.Hashable),
       isinstance(int, cabc.Callable), isinstance(len, cabc.Callable),
       isinstance(iter([]), cabc.Iterator), isinstance(object(), cabc.Sized)),
      (False, False, False, True, True, True, True, False))


class SeqClass:
    def __getitem__(self, i):
        if i < 2:
            return i
        raise IndexError


check('every_builtin_iterator_is_an_iterator',
      (isinstance(iter(SeqClass()), cabc.Iterator),
       isinstance(iter(lambda: 1, 1), cabc.Iterator)),
      (True, True))
check('a_builtin_iterator_type_cannot_be_constructed',
      attempt(type(iter([]))),
      ('TypeError', "cannot create 'list_iterator' instances"))


class OneMapping(cabc.Mapping):
    def __getitem__(self, k):
        return 1

    def __iter__(self):
        return iter('a')

    def __len__(self):
        return 1


check('mixin_methods_work',
      (OneMapping().get('a'), list(OneMapping().keys()), dict(OneMapping().items())),
      (1, ['a'], {'a': 1}))
check('an_abc_refuses_instantiation', attempt(cabc.Mapping)[0], 'TypeError')
check('a_dict_view_does_not_pickle', attempt(lambda: pickle.dumps({}.keys())),
      ('TypeError', "cannot pickle 'dict_keys' object"))

# ----------------------------------------------------------- GenericAlias

T = typing.TypeVar('T')
K = typing.TypeVar('K')
check('a_generic_alias_names_itself',
      (types.GenericAlias.__name__, types.GenericAlias.__module__,
       type(list[int]) is types.GenericAlias),
      ('GenericAlias', 'types', True))
check('parameters_are_found_nested',
      (dict[K, list[T]].__parameters__, list[int].__parameters__),
      ((K, T), ()))
check('substitution', (repr(dict[K, list[T]][str, int]), repr(list[T][int])),
      ('dict[str, list[int]]', 'list[int]'))
check('a_non_generic_alias_refuses_a_subscript', attempt(lambda: list[int][str]),
      ('TypeError', 'list[int] is not a generic class'))
check('aliases_print_as_cpython_prints_them',
      (repr(tuple[()]), repr(tuple[int, ...]), repr(cabc.Callable[[int], str])),
      ('tuple[()]', 'tuple[int, ...]', 'collections.abc.Callable[[int], str]'))
check('an_alias_is_not_a_type_check_target',
      attempt(lambda: isinstance([], list[int])),
      ('TypeError', 'isinstance() argument 2 cannot be a parameterized generic'))
check('an_alias_pickles_and_hashes',
      (pickle.loads(pickle.dumps(list[int])) == list[int],
       hash(list[int]) == hash(list[int]), list[int] != set[int]),
      (True, True, True))

# ----------------------------------------------------------- Union

check('union_is_the_union_type',
      (typing.Union is types.UnionType, repr(typing.Union),
       type(int | str) is typing.Union, (int | str).__origin__ is typing.Union),
      (True, "<class 'typing.Union'>", True, True))
check('a_union_deduplicates_and_collapses',
      (repr(int | int), repr(int | str | int), repr(typing.Union[int])),
      ("<class 'int'>", 'int | str', "<class 'int'>"))
check('a_union_substitutes', repr((T | None)[int]), 'int | None')
check('a_union_pickles', pickle.loads(pickle.dumps(int | str)) == (int | str), True)
check('the_union_type_is_not_constructible', attempt(typing.Union),
      ('TypeError', "cannot create 'typing.Union' instances"))

# ----------------------------------------------------------- neighbours


def _single_dispatch():
    g = functools.singledispatch(lambda o: 'base')
    g.register(cabc.Sized, lambda o: 'sized')
    first = g(frozenset())
    g.register(cabc.Set, lambda o: 'set')
    return first, g(frozenset()), g([])


check('singledispatch_follows_abc_registrations', _single_dispatch(),
      ('sized', 'set', 'sized'))
check('builtin_class_dicts_list_their_methods',
      ('__len__' in dict.__dict__, '__iter__' in list.__dict__,
       '__contains__' in set.__dict__, dict.__dict__.get('__hash__', 0) is None,
       '__iter__' in int.__dict__),
      (True, True, True, True, False))


class Meta(type):
    def __new__(mcls, name, bases, ns, **kw):
        return super().__new__(mcls, name, bases, ns, **kw)


class Rooted(metaclass=Meta):
    pass


class Leaf(Rooted):
    pass


check('a_metaclass_class_lists_its_subclasses', Rooted.__subclasses__(), [Leaf])


class SlotBase:
    __slots__ = ()


class Deeper(SlotBase):
    __slots__ = ()


class DeepestMixin(Deeper):
    __slots__ = ()


class Slotted(SlotBase):
    __slots__ = '_x'

    def __init__(self, x):
        self._x = x


class Both(Slotted, DeepestMixin):
    __slots__ = ()


check('a_slot_bearing_base_keeps_its_slots', Both(5)._x, 5)
check('a_generator_lambda', (type((lambda: (yield))()).__name__,
                             list((lambda x: (yield x))(3))),
      ('generator', [3]))


if __name__ == '__main__':
    for _name in sorted(RESULTS):
        _v = RESULTS[_name]
        print('%-4s %s' % ('OK' if _v is True else 'FAIL', _name),
              '' if _v is True else _v)
