"""The four entries type.__new__ and the compiler add to a class __dict__.

* ``__firstlineno__`` -- the class statement's first line, its first
  decorator's when it has one (CPython 3.13);
* ``__static_attributes__`` -- the sorted names of ``self.X`` stores in the
  body's functions, nested ones included, nested classes excluded;
* ``__dict__`` / ``__weakref__`` -- a getset_descriptor in the dict of the
  class that GIVES its instances that storage: not a subclass, not a class
  whose __slots__ leaves it out, not where a built-in base already has it.

Grail's class __dict__ had none of them.  Every expectation was measured
against CPython 3.14.6.
"""

import collections
import types

RESULTS = {}


def check(name, got, want):
    RESULTS[name] = (got == want) or ('got: ' + repr(got)[:200])


_ENTRIES = ('__firstlineno__', '__static_attributes__', '__dict__', '__weakref__')


def entries(cls):
    return [k for k in cls.__dict__ if k in _ENTRIES]


def _identity(cls):
    return cls


def _decorator_line():
    with open(__file__) as f:
        for number, text in enumerate(f, 1):
            if text.startswith('@_identity'):
                return number


_FIRST = _decorator_line()


class Plain:
    def __init__(self):
        self.b = 1
        self.a = 2
        other = self
        other.z = 3

    def m(self):
        self.c = 3
        self.a += 1
        x = self.d
        def inner():
            self.e = 4
        (self.f, self.g) = (1, 2)
        self.h: int = 5
        del self.i
        for self.loop in ():
            pass
        self.x.y = 1

    @classmethod
    def cm(cls):
        cls.k = 1

    @staticmethod
    def sm(self):
        self.l = 1

    def other(this):
        this.n = 1

    def nested_class(self):
        class Inner:
            def j(self):
                self.inner = 1
        return Inner


@_identity
class Decorated:
    pass


class Sub(Plain):
    def m2(self):
        self.y = 1


class Slotted:
    __slots__ = ('x',)


class SlottedWithDict:
    __slots__ = ('x', '__dict__')


class OverInt(int):
    pass


class OverList(list):
    pass


class OverException(Exception):
    pass


class OverOrderedDict(collections.OrderedDict):
    pass


check('static_attributes', Plain.__static_attributes__,
      ('a', 'b', 'c', 'e', 'f', 'g', 'h', 'l', 'loop'))
check('static_attributes_in_the_dict', Plain.__dict__['__static_attributes__'],
      Plain.__static_attributes__)
check('nested_class_counts_for_itself', Plain().nested_class().__static_attributes__, ('inner',))
check('firstlineno_is_the_first_decorator', Decorated.__firstlineno__, _FIRST)
check('firstlineno_is_an_int', type(Plain.__firstlineno__).__name__, 'int')
check('subclass_has_its_own', (Sub.__static_attributes__, Sub.__firstlineno__ > Plain.__firstlineno__),
      (('y',), True))
check('instance_reads_through_the_class', Plain().__static_attributes__ is Plain.__static_attributes__,
      True)
check('type_class_has_neither', ['__firstlineno__' in type('T', (), {}).__dict__,
                                 '__static_attributes__' in type('T', (), {}).__dict__],
      [False, False])

check('plain_class_entries', entries(Plain), list(_ENTRIES))
check('subclass_inherits_the_storage', entries(Sub), ['__firstlineno__', '__static_attributes__'])
check('slots_leave_both_out', entries(Slotted), ['__firstlineno__', '__static_attributes__'])
check('slots_naming_dict', entries(SlottedWithDict),
      ['__firstlineno__', '__static_attributes__', '__dict__'])
check('int_has_no_weakref', entries(OverInt), ['__firstlineno__', '__static_attributes__', '__dict__'])
check('list_has_both', entries(OverList), list(_ENTRIES))
check('exception_already_has_dict', entries(OverException),
      ['__firstlineno__', '__static_attributes__', '__weakref__'])
check('ordereddict_has_both_already', entries(OverOrderedDict),
      ['__firstlineno__', '__static_attributes__'])
check('type_class_has_both', [k for k in type('T', (), {}).__dict__ if k in _ENTRIES],
      ['__dict__', '__weakref__'])

_d = Plain.__dict__['__dict__']
_w = Plain.__dict__['__weakref__']
_obj = Plain()
check('getset_type', [type(_d).__name__, type(_d) is types.GetSetDescriptorType], ['getset_descriptor', True])
check('getset_repr', [repr(_d), repr(_w)],
      ["<attribute '__dict__' of 'Plain' objects>", "<attribute '__weakref__' of 'Plain' objects>"])
check('getset_attrs', [_d.__name__, _d.__objclass__ is Plain, _d.__qualname__],
      ['__dict__', True, 'Plain.__dict__'])
check('getset_reads_vars', _d.__get__(_obj, Plain), {'b': 1, 'a': 2, 'z': 3})
check('getset_on_the_class_is_itself', _d.__get__(None, Plain) is _d, True)
check('weakref_reads_none_without_references', _w.__get__(_obj, Plain), None)
check('the_same_object_each_time', Plain.__dict__['__dict__'] is Plain.__dict__['__dict__'], True)
check('is_a_data_descriptor', [hasattr(type(_d), '__set__'), hasattr(type(_d), '__delete__')],
      [True, True])

if __name__ == '__main__':
    for _name in sorted(RESULTS):
        _v = RESULTS[_name]
        print('%-4s %s' % ('OK' if _v is True else 'FAIL', _name),
              '' if _v is True else _v)
