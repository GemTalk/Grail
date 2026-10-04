"""test_abc's class-building shapes, each a separate defect it surfaced.

test.test_abc went from 64 errors to 66 of 72 passing on these:

* a class statement inside a METHOD whose base, metaclass= or decorator names
  a free variable of a function beyond that method's class -- test_abc's
  ``class A(metaclass=abc_ABCMeta)'' inside ``test_factory'' -- compiled to an
  undefined symbol and the method became a codegen-gap stub;
* super() handed a classmethod / staticmethod / property OBJECT from a base's
  class attributes back as a bound method instead of asking it for __get__;
* a Python subclass's class attribute lost to a built-in's computed value
  attribute (abstractproperty's ``__isabstractmethod__ = True'');
* a metaclass saw each decorated def UNDECORATED in its namespace;
* class keywords forwarded by a ``**kwargs'' metaclass __new__ (abc.ABCMeta)
  never reached __init_subclass__, and ``super().__new__(..., **kw)'' was
  refused as four arguments;
* with a Python metaclass, a subclass's own @classmethod/@staticmethod resolved
  to a base's instance-side def;
* ``del Cls.m'' on a DECORATED def left the compiled def to resurface;
* inspect.isabstract was a stub answering False.

Every expectation was measured against CPython 3.14.6.
"""

import abc
import inspect

RESULTS = {}


def check(name, got, want):
    RESULTS[name] = (got == want) or ('got: ' + repr(got)[:200])


def attempt(fn):
    try:
        return ('ok', fn())
    except Exception as e:
        return (type(e).__name__, str(e))


# ------------------------------------------- header names beyond the class
# The nesting is test_abc's on purpose: a class statement inside a METHOD of a
# class inside a FUNCTION, reading the function's parameters.

def _deco_factory(tag):
    def deco(obj):
        obj.tag = tag
        return obj
    return deco


def _header_factory(M, B, deco):
    class T:
        def meta_kw(self):
            class A(metaclass=M):
                pass
            return type(A).__name__

        def base(self):
            class A(B):
                pass
            return A.__mro__[1].__name__

        def class_deco(self):
            @deco
            class A:
                pass
            return A.tag

        def method_deco(self):
            class A:
                @deco
                def m(self):
                    pass
            return A.m.tag

        def method_local(self):
            L = M
            class A(metaclass=L):
                pass
            return type(A).__name__

        def nested_two(self):
            class U:
                def inner(self):
                    class A(B, metaclass=M):
                        pass
                    return type(A).__name__ + '/' + A.__mro__[1].__name__
            return U().inner()
    return T


class _Meta(type):
    pass


class _Base:
    pass


_t = _header_factory(_Meta, _Base, _deco_factory('tagged'))()
check('header_metaclass_beyond_the_class', attempt(_t.meta_kw), ('ok', '_Meta'))
check('header_base_beyond_the_class', attempt(_t.base), ('ok', '_Base'))
check('class_decorator_beyond_the_class', attempt(_t.class_deco), ('ok', 'tagged'))
check('method_decorator_beyond_the_class', attempt(_t.method_deco), ('ok', 'tagged'))
check('header_local_of_the_method', attempt(_t.method_local), ('ok', '_Meta'))
check('header_two_classes_deep', attempt(_t.nested_two), ('ok', '_Meta/_Base'))


# ------------------------------------------- super() over descriptor objects

class _mycm(classmethod):
    pass


def _mark(f):
    f.marked = True
    return f


class _CmParent:
    @classmethod
    @_mark
    def foo(cls):
        return cls.__name__


class _CmChild(_CmParent):
    @classmethod
    def foo(cls):
        return 'via ' + super().foo()


class _SubCmParent:
    @_mycm
    def foo(cls):
        return cls.__name__


class _SubCmChild(_SubCmParent):
    @classmethod
    def foo(cls):
        return 'via ' + super().foo()


class _PropParent(metaclass=abc.ABCMeta):
    @abc.abstractproperty
    def foo(self):
        return 3


class _PropChild(_PropParent):
    @property
    def foo(self):
        return super().foo


check('super_binds_a_classmethod_object', attempt(_CmChild.foo), ('ok', 'via _CmChild'))
check('super_binds_a_classmethod_subclass', attempt(lambda: _SubCmChild().foo()),
      ('ok', 'via _SubCmChild'))
check('super_gets_a_property_value', attempt(lambda: _PropChild().foo), ('ok', 3))


# ------------------------------------------- abstractproperty is abstract

class _myprop(property):
    __isabstractmethod__ = True


check('subclass_attr_shadows_a_value_attr',
      attempt(lambda: _myprop(lambda s: 1).__isabstractmethod__), ('ok', True))
check('abstractproperty_makes_a_class_abstract',
      attempt(lambda: sorted(_PropParent.__abstractmethods__)), ('ok', ['foo']))
check('abstractproperty_refuses_instantiation', attempt(_PropParent)[0], 'TypeError')


# ------------------------------------------- the metaclass sees decorated defs

_seen = {}


class _ShowNs(type):
    def __new__(mcls, name, bases, ns):
        for key in ('a', 'b'):
            if key in ns:
                _seen[key] = getattr(ns[key], '__isabstractmethod__', False)
        return super().__new__(mcls, name, bases, ns)


class _NsProbe(metaclass=_ShowNs):
    @abc.abstractproperty
    def a(self):
        return 1

    def b(self):
        return 2


check('namespace_holds_the_decorated_object', _seen, {'a': True, 'b': False})


# The namespace rebind above must not count as a SECOND binding: an enum's
# namespace refuses one, so a decorated method in an enum body raised
# "'describe' already defined" and the enum could not be built.
def _build_enum_with_a_decorated_method():
    import enum

    def logged(f):
        def w(*a, **k):
            return f(*a, **k)
        return w

    class Color(enum.Enum):
        RED = 1
        GREEN = 2

        @logged
        def describe(self):
            return self.name

    return [m.name for m in Color]


# Only that the class BUILDS: which names become members is a separate,
# pre-existing defect (the decorated method is also made a member, on main too).
check('enum_body_takes_a_decorated_method',
      attempt(_build_enum_with_a_decorated_method)[0], 'ok')


# ------------------------------------------- class keywords through a metaclass

_kwargs_seen = {}


class _Receives:
    def __init_subclass__(cls, **kwargs):
        super().__init_subclass__()
        _kwargs_seen.update(kwargs)


class _ForwardingMeta(type):
    def __new__(mcls, name, bases, ns, /, **kwargs):
        return super().__new__(mcls, name, bases, ns, **kwargs)


class _KwForwarded(_Receives, metaclass=_ForwardingMeta, flavour='x'):
    pass


check('forwarded_keywords_reach_init_subclass', dict(_kwargs_seen), {'flavour': 'x'})
_kwargs_seen.clear()


class _KwAbc(_Receives, metaclass=abc.ABCMeta, name='test'):
    pass


check('abcmeta_forwards_keywords', dict(_kwargs_seen), {'name': 'test'})
check('type_new_counts_after_cls',
      attempt(lambda: type.__new__(type, name='X', bases=(), dict={})),
      ('TypeError', 'type.__new__() takes exactly 3 arguments (0 given)'))


# ------------------------------------------- own classmethod under a metaclass

class _M(type):
    pass


class _StaticParent(metaclass=_M):
    @abc.abstractstaticmethod
    def foo():
        return 3


class _StaticChild(_StaticParent):
    @staticmethod
    def foo():
        return 4


class _ClassParent(metaclass=_M):
    @abc.abstractclassmethod
    def foo(cls):
        return cls.__name__


class _ClassChild(_ClassParent):
    @classmethod
    def foo(cls):
        return 'own ' + super().foo()


check('own_staticmethod_under_a_metaclass', attempt(_StaticChild.foo), ('ok', 4))
check('own_classmethod_under_a_metaclass', attempt(_ClassChild.foo),
      ('ok', 'own _ClassChild'))


# ------------------------------------------- del of a decorated def

class _DelAbstract(metaclass=abc.ABCMeta):
    @abc.abstractmethod
    def foo(self):
        pass


del _DelAbstract.foo
check('del_removes_a_decorated_def', hasattr(_DelAbstract, 'foo'), False)
abc.update_abstractmethods(_DelAbstract)
check('update_after_del_clears_abstracts', set(_DelAbstract.__abstractmethods__), set())


# ------------------------------------------- inspect.isabstract

class _Abstract(metaclass=abc.ABCMeta):
    @abc.abstractmethod
    def foo(self):
        pass


class _Concrete(_Abstract):
    def foo(self):
        pass


check('isabstract_true_for_an_abstract_class', inspect.isabstract(_Abstract), True)
check('isabstract_false_for_a_concrete_class', inspect.isabstract(_Concrete), False)
check('isabstract_false_for_a_non_class', inspect.isabstract(_Concrete()), False)


if __name__ == '__main__':
    for _name in sorted(RESULTS):
        _v = RESULTS[_name]
        print('%-4s %s' % ('OK' if _v is True else 'FAIL', _name),
              '' if _v is True else _v)
