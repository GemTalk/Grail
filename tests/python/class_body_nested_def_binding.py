"""A `def` inside a compound statement in a class body is still a METHOD.

    class A(Protocol):
        if not TYPE_CHECKING:
            def __init_subclass__(cls, **kw):
                super().__init_subclass__(**kw)

That is annotated_types' spelling, on pydantic's import path, and in Grail
`class B(A): pass` raised `super(type, obj): obj (instance of annotated_types)
is not an instance or subtype of type (Generic)`.

A def at the top of a class body compiles to a Smalltalk method.  A def inside
an `if` / `for` / `try` / `with` compiles to a block stored as a class
attribute, and four things went wrong in that form, all silently or far from
the cause:

* zero-argument `super()` bound the MODULE as its object, so `super().f()` ran
  the base method with `type(self)` answering the module;
* `__class__` raised NameError, read as if it stood in the class body itself;
* `__init_subclass__` / `__class_getitem__` did not become implicit
  classmethods, nor `__new__` an implicit staticmethod, so `A[int]` called
  `__class_getitem__(int)` and raised a missing-argument TypeError;
* a keyword bound to a named parameter stayed in `**kw` as well -- true of
  every NESTED def, not only class-body ones: `def f(tag=None, **kw)` called
  as `f(tag=1)` saw `kw == {'tag': 1}`.

Controls pin the direct-body and explicitly decorated spellings beside each.

Every expectation here was measured against CPython 3.14.
"""

from typing import Protocol, TYPE_CHECKING

RESULTS = {}


def check(name, got, want):
    RESULTS[name] = (got == want) or ('got: ' + repr(got)[:120])


# -- super() binds the method's first argument ------------------------------

class Base:
    def who(self):
        return type(self).__name__


class Nested(Base):
    if True:
        def in_if(self):
            return super().who()
    for _ in range(1):
        def in_for(self):
            return super().who()
    try:
        def in_try(self):
            return super().who()
    except Exception:
        pass
    with open(__file__) as _fh:
        def in_with(self):
            return super().who()
    def direct(self):
        return super().who()


check('super_in_if_binds_the_instance', Nested().in_if(), 'Nested')
check('super_in_for_binds_the_instance', Nested().in_for(), 'Nested')
check('super_in_try_binds_the_instance', Nested().in_try(), 'Nested')
check('super_in_with_binds_the_instance', Nested().in_with(), 'Nested')
check('super_direct_control', Nested().direct(), 'Nested')


class Sub(Nested):
    pass


check('super_in_if_from_a_subclass_instance', Sub().in_if(), 'Sub')


class Outer(Base):
    if True:
        def outer(self):
            def inner():
                return super(Outer, self).who()
            return inner()


check('explicit_super_inside_a_nested_def_still_works', Outer().outer(), 'Outer')


# -- __class__ is the defining class ----------------------------------------

class Defines:
    if True:
        def in_if(self):
            return __class__
    for _ in range(1):
        def in_for(self):
            return __class__
    def direct(self):
        return __class__


class Inherits(Defines):
    pass


check('dunder_class_in_if', Inherits().in_if() is Defines, True)
check('dunder_class_in_for', Inherits().in_for() is Defines, True)
check('dunder_class_direct_control', Inherits().direct() is Defines, True)


# -- the implicit classmethods and staticmethod ------------------------------

seen = []


class Root:
    def __init_subclass__(cls, **kw):
        seen.append(('Root', cls.__name__, kw))


class Hooks(Root):
    if True:
        def __init_subclass__(cls, tag=None, **kw):
            seen.append(('Hooks', cls.__name__, tag))
            super().__init_subclass__(**kw)

        def __class_getitem__(cls, item):
            return (cls.__name__, item)

        def __new__(cls, *args):
            instance = super().__new__(cls)
            instance.made_by = cls.__name__
            return instance


class Leaf(Hooks, tag='t'):
    pass


check('init_subclass_in_if_runs_with_the_subclass_and_consumes_its_keyword',
      seen, [('Root', 'Hooks', {}), ('Hooks', 'Leaf', 't'), ('Root', 'Leaf', {})])
check('class_getitem_in_if_is_a_classmethod', (Hooks[int], Leaf[str]),
      (('Hooks', int), ('Leaf', str)))
check('new_in_if_is_a_staticmethod', (Hooks().made_by, Leaf().made_by),
      ('Hooks', 'Leaf'))
check('the_namespace_holds_the_descriptors',
      (type(Hooks.__dict__['__init_subclass__']).__name__,
       type(Hooks.__dict__['__class_getitem__']).__name__,
       type(Hooks.__dict__['__new__']).__name__),
      ('classmethod', 'classmethod', 'staticmethod'))


class Decorated:
    for _ in range(1):
        @classmethod
        def cm(cls):
            return cls.__name__

        @staticmethod
        def sm(x):
            return x * 2


class DecoratedSub(Decorated):
    pass


check('explicit_decorators_in_for_control', (DecoratedSub.cm(), DecoratedSub().sm(3)),
      ('DecoratedSub', 6))


# -- the annotated_types shape itself ----------------------------------------

class Proto(Protocol):
    if not TYPE_CHECKING:
        def __init_subclass__(cls, *args, **kwargs):
            super().__init_subclass__(*args, **kwargs)


class Implements(Proto):
    pass


check('a_protocol_init_subclass_under_type_checking_guard',
      Implements.__name__, 'Implements')


# -- **kw holds only the keywords no named parameter took --------------------

def outer():
    def named(tag=None, **kw):
        return (tag, kw)

    def required(tag, **kw):
        return (tag, kw)

    def kwonly(*, tag=None, **kw):
        return (tag, kw)

    def posonly(tag=None, /, **kw):
        return (tag, kw)

    return (named(tag=1), required(tag=1), kwonly(tag=1), posonly(tag=1),
            named(1, x=2))


check('nested_def_kwargs_drop_named_parameters', outer(),
      ((1, {}), (1, {}), (1, {}), (None, {'tag': 1}), (1, {'x': 2})))


class KwInIf:
    if True:
        def m(self, tag=None, **kw):
            return (tag, kw)


check('class_body_if_def_kwargs_drop_named_parameters', KwInIf().m(tag=1, y=2),
      (1, {'y': 2}))


if __name__ == '__main__':
    for _name in sorted(RESULTS):
        _v = RESULTS[_name]
        print('%-4s %s' % ('OK' if _v is True else 'FAIL', _name),
              '' if _v is True else _v)
