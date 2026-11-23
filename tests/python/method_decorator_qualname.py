"""Fixture: the __qualname__ a METHOD decorator sees in a nested class (#2291).

A class-body decorator is applied at its def, while the class body runs.  The
function it is handed must already carry the method's full qualified name --
``f.<locals>.C.m'' for a class defined inside a function, not ``C.m'' -- and a
``functools.wraps'' wrapper copies that name onto the decorated method, so a
short name there is also what ``C.m.__qualname__'' reports afterwards.

Grail used to stamp a nested class's own qualname only after the body had
run, so every decorator in the body read the bare class name.  Each check
here is one shape of that; every expectation is CPython 3.14's, verified by
running this file directly.

* ``module_class``: the control -- a module-level class was always right.
* ``plain_and_decorated``: in a method-local class, a plain method beside a
  decorated one, both what the decorator saw and what is read afterwards.
* ``wraps``: a functools.wraps wrapper, alone and under a further decorator.
* ``class_and_static``: a custom wraps decorator over @classmethod and
  @staticmethod.
* ``property_getter``: a custom wraps decorator under @property.
* ``dunder_init``: ``__init__``, which Grail compiles specially.
* ``nested_class``: a class nested in a method-local class
  (``f.<locals>.Outer.Inner.m``).
* ``class_in_a_method``: a class inside a METHOD
  (``Host.meth.<locals>.C.m``).
* ``two_functions_deep``: ``g.<locals>.h.<locals>.K.m``.
* ``global_class``: a class the function declares ``global`` has the bare
  qualname, and so do its methods.
* ``metaclass_namespace``: the metaclass sees the full qualname in the
  namespace it is handed, and so do the decorators before it runs.
* ``enum_member_method``: a decorated method of a method-local Enum.
"""

import enum
import functools

r = {}


def recorder():
    seen = []

    def d(fn):
        seen.append(fn.__qualname__)
        return fn
    return seen, d


def wrapping(seen):
    def w(fn):
        @functools.wraps(fn)
        def wrapper(*args, **kwargs):
            return fn(*args, **kwargs)
        seen.append((fn.__qualname__, wrapper.__qualname__))
        return wrapper
    return w


_seen_m, _d_m = recorder()


class Top:
    @_d_m
    def m(self):
        pass


r['module_class'] = (_seen_m, Top.m.__qualname__)


def plain_and_decorated():
    seen, d = recorder()

    class C:
        @d
        def m(self):
            pass

        def plain(self):
            pass
    return seen, C.m.__qualname__, C.plain.__qualname__, C().m.__qualname__


r['plain_and_decorated'] = plain_and_decorated()


def wraps():
    seen, d = recorder()
    w = wrapping(seen)

    class C:
        @w
        def one(self):
            return 1

        @d
        @w
        def two(self):
            return 2
    return seen, C.one.__qualname__, C.two.__qualname__, C().one(), C().two()


r['wraps'] = wraps()


def class_and_static():
    seen = []
    w = wrapping(seen)

    class C:
        @w
        @classmethod
        def cm(cls):
            return cls.__name__

        @w
        @staticmethod
        def sm():
            return 'sm'
    return seen, C.cm.__qualname__, C.sm.__qualname__


r['class_and_static'] = class_and_static()


def property_getter():
    seen = []
    w = wrapping(seen)

    class C:
        @property
        @w
        def p(self):
            return 3
    return seen, C.p.fget.__qualname__, C().p


r['property_getter'] = property_getter()


def dunder_init():
    seen, d = recorder()

    class C:
        @d
        def __init__(self):
            self.x = 1
    return seen, C.__init__.__qualname__, C().x


r['dunder_init'] = dunder_init()


def nested_class():
    seen, d = recorder()

    class Outer:
        class Inner:
            @d
            def m(self):
                pass

            def plain(self):
                pass
    return (seen, Outer.Inner.m.__qualname__, Outer.Inner.plain.__qualname__,
            Outer.Inner.__qualname__)


r['nested_class'] = nested_class()


class Host:
    def meth(self):
        seen, d = recorder()

        class C:
            @d
            def m(self):
                pass
        return seen, C.m.__qualname__


r['class_in_a_method'] = Host().meth()


def two_functions_deep():
    seen, d = recorder()

    def h():
        class K:
            @d
            def m(self):
                pass
        return K
    return seen, h().m.__qualname__


r['two_functions_deep'] = two_functions_deep()


_seen_g, _d_g = recorder()


def make_global():
    global GlobalClass

    class GlobalClass:
        @_d_g
        def m(self):
            pass


make_global()
r['global_class'] = (_seen_g, GlobalClass.__qualname__, GlobalClass.m.__qualname__)


def metaclass_namespace():
    seen, d = recorder()

    class Meta(type):
        def __new__(mcls, name, bases, ns):
            seen.append(('namespace', ns.get('__qualname__')))
            return super().__new__(mcls, name, bases, ns)

    class C(metaclass=Meta):
        @d
        def m(self):
            pass
    return seen, C.__qualname__


r['metaclass_namespace'] = metaclass_namespace()


def enum_member_method():
    seen, d = recorder()

    class Color(enum.Enum):
        RED = 1

        @d
        def describe(self):
            return self.name
    return seen, Color.describe.__qualname__, Color.RED.describe()


r['enum_member_method'] = enum_member_method()


EXPECTED = {
    'module_class': (['Top.m'], 'Top.m'),
    'plain_and_decorated': (['plain_and_decorated.<locals>.C.m'],
                            'plain_and_decorated.<locals>.C.m',
                            'plain_and_decorated.<locals>.C.plain',
                            'plain_and_decorated.<locals>.C.m'),
    'wraps': ([('wraps.<locals>.C.one', 'wraps.<locals>.C.one'),
               ('wraps.<locals>.C.two', 'wraps.<locals>.C.two'),
               'wraps.<locals>.C.two'],
              'wraps.<locals>.C.one', 'wraps.<locals>.C.two', 1, 2),
    'class_and_static': ([('class_and_static.<locals>.C.cm',
                           'class_and_static.<locals>.C.cm'),
                          ('class_and_static.<locals>.C.sm',
                           'class_and_static.<locals>.C.sm')],
                         'class_and_static.<locals>.C.cm',
                         'class_and_static.<locals>.C.sm'),
    'property_getter': ([('property_getter.<locals>.C.p',
                          'property_getter.<locals>.C.p')],
                        'property_getter.<locals>.C.p', 3),
    'dunder_init': (['dunder_init.<locals>.C.__init__'],
                    'dunder_init.<locals>.C.__init__', 1),
    'nested_class': (['nested_class.<locals>.Outer.Inner.m'],
                     'nested_class.<locals>.Outer.Inner.m',
                     'nested_class.<locals>.Outer.Inner.plain',
                     'nested_class.<locals>.Outer.Inner'),
    'class_in_a_method': (['Host.meth.<locals>.C.m'], 'Host.meth.<locals>.C.m'),
    'two_functions_deep': (['two_functions_deep.<locals>.h.<locals>.K.m'],
                           'two_functions_deep.<locals>.h.<locals>.K.m'),
    'global_class': (['GlobalClass.m'], 'GlobalClass', 'GlobalClass.m'),
    'metaclass_namespace': (['metaclass_namespace.<locals>.C.m',
                             ('namespace', 'metaclass_namespace.<locals>.C')],
                            'metaclass_namespace.<locals>.C'),
    'enum_member_method': (['enum_member_method.<locals>.Color.describe'],
                           'enum_member_method.<locals>.Color.describe', 'RED'),
}


KEYS = sorted(EXPECTED)


if __name__ == '__main__':
    for key in KEYS:
        print('%-5s %-22s -> %r' % ('OK' if r[key] == EXPECTED[key] else 'FAIL', key, r[key]))
    for extra in sorted(set(r) - set(EXPECTED)):
        print('%-5s %-22s is not in EXPECTED' % ('FAIL', extra))
