# PRIVATE-NAME MANGLING for class-body BINDINGS.
#
# An identifier written in a class body with two or more leading underscores and
# not two trailing ones is rewritten to _<Class><name>, so ``__x'' in class C is
# _C__x.  Grail mangled every READ of such a name -- ``self.__x'' (AttributeAst)
# and ``def __helper'' (FunctionDefAst) -- but not the class-body ASSIGNMENT that
# declares it, so
#
#     class C:
#         __x = 1
#         def get(self): return self.__x
#
# declared __x and then looked for _C__x: AttributeError, for the plain Python
# idiom of a private attribute with a class-level default.
#
# The declaration missed because mangling asked the AMBIENT
# ``classBeingCompiled'', which ClassDefAst deliberately CLEARS around the
# class-body name scans (isModuleScopeClassDef reads it as its "nested inside
# another class" test) -- and those scans are exactly where the attribute names
# are decided.  Mangling is lexical now: the nearest enclosing ClassDefAst.
#
# In an Enum the same names must stay NORMAL ATTRIBUTES rather than members, and
# must not trip the reserved-sunder check -- CPython tests _is_private before
# _is_sunder, and _Private__major_ passes for a sunder without it
# (test_enum test_private_variable_is_normal_attribute).

from enum import Enum

r = {}


class C:
    __x = 1
    __y = __x + 1
    _single = 3
    __dunder__ = 4

    def get_x(self):
        return self.__x

    def get_y(self):
        return self.__y

    def __helper(self):
        return 'helped'

    def call_helper(self):
        return self.__helper()


r['mangled'] = getattr(C, '_C__x', 'MISSING')
r['unmangled'] = getattr(C, '__x', 'MISSING')
r['prior_ref'] = getattr(C, '_C__y', 'MISSING')
r['single_underscore'] = getattr(C, '_single', 'MISSING')
r['dunder'] = getattr(C, '__dunder__', 'MISSING')
r['via_method'] = C().get_x()
r['via_method_y'] = C().get_y()
r['private_method'] = C().call_helper()

# --- per-class, which is the whole point of mangling --------------------------


class Base:
    __slot = 'base'

    def whose(self):
        return self.__slot


class Derived(Base):
    __slot = 'derived'

    def whose_derived(self):
        return self.__slot


d = Derived()
r['base_sees_base'] = d.whose()
r['derived_sees_derived'] = d.whose_derived()
r['both_slots'] = '%s/%s' % (Derived._Base__slot, Derived._Derived__slot)

# --- an instance store from a method, read back through the class default -----


class Counter:
    __n = 0

    def bump(self):
        self.__n = self.__n + 1
        return self.__n


c = Counter()
r['bump'] = '%d,%d' % (c.bump(), c.bump())
r['class_default_intact'] = Counter._Counter__n

# --- annotated assignment declares the mangled name too -----------------------


class Annotated:
    __a: int = 5

    def get(self):
        return self.__a


r['annotated'] = '%s/%s' % (Annotated._Annotated__a, Annotated().get())

# --- an Enum: private names are normal attributes, not members ----------------


class Private(Enum):
    ONE = 1
    __corporal = 'Radar'
    __major_ = 'Hoolihan'


r['enum_corporal'] = Private._Private__corporal
r['enum_major'] = Private._Private__major_
r['enum_members'] = ','.join(Private.__members__)

# --- and a real sunder is still rejected --------------------------------------

try:
    class Bad(Enum):
        _bad_ = 1
    r['sunder_rejected'] = 'NOT RAISED'
except ValueError as e:
    r['sunder_rejected'] = 'ValueError'
