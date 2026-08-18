# A metaclass runs over EVERY class it governs, not just the one that named it.
#
#     class A(metaclass=M): pass
#     class B(A): pass            # M.__new__ runs for B as well
#
# Grail recorded the metaclass and inherited the RECORD -- type(B) already
# answered M -- but only the class that wrote the ``metaclass='' keyword ever
# reached the dispatch.  So M.__new__ ran for A and never for B.
#
# That is invisible while a metaclass only adds behaviour for its classes to
# inherit, and wrong the moment it STAMPS the class it builds: ``cls.tag =
# 'seen-' + name'' left B reading A's tag through ordinary inheritance -- the
# right answer for the wrong reason -- and left nothing at all behind for a name
# A never set.
#
# The fix asks ___grailMetaclass___ (which already walks the superclass chain)
# at the point the namespace decision is taken, and routes an inherited
# metaclass through the same path as a named one.

import abc

r = {}
log = []


class M(type):
    def __new__(metacls, name, bases, ns, **kw):
        log.append('new:' + name)
        cls = super().__new__(metacls, name, bases, ns, **kw)
        cls.tag = 'seen-' + name
        return cls

    def __init__(cls, name, bases, ns, **kw):
        log.append('init:' + name)
        super().__init__(name, bases, ns, **kw)


class A(metaclass=M):
    pass


class B(A):
    pass


class C(B):
    pass


# --- the metaclass reaches every class in the chain ---------------------------
r['tags'] = repr([A.tag, B.tag, C.tag])
r['types'] = repr([type(A).__name__, type(B).__name__, type(C).__name__])

# __new__ AND __init__ both run, for each class, in that order.
r['log'] = repr(log)


# --- a name the base never set --------------------------------------------------
# The sharpest form: inheritance cannot fake this one, because there is nothing
# on A to inherit.
class Stamper(type):
    def __new__(metacls, name, bases, ns, **kw):
        cls = super().__new__(metacls, name, bases, ns, **kw)
        cls.registry = []           # a FRESH list per class
        return cls


class Base(metaclass=Stamper):
    pass


class Sub(Base):
    pass


# Asserted by IDENTITY, not by mutating one and reading the other. Both spell
# the same property -- if the metaclass never ran for Sub, Sub.registry simply
# IS Base.registry, reached by inheritance -- but only this one is idempotent.
# The mutating form appends on every module load, and the class is reused across
# loads when canonical classes are enabled, so it read [[], ['x', 'x', 'x', 'x']]
# in the sharded SUnit run and [[], ['x']] on its own.
r['registries_are_distinct'] = repr(
    [Base.registry is not Sub.registry, Base.registry == [], Sub.registry == []])


# --- and a metaclass that does not construct is still left alone ---------------
# The guard that keeps this from firing across the whole corpus: a metaclass
# overriding neither __new__ nor __init__ is not dispatched and gets no
# namespace.  ABCMeta is the one that matters -- it is everywhere.
class Quiet(type):
    pass


class QA(metaclass=Quiet):
    pass


class QB(QA):
    pass


r['quiet_types'] = repr([type(QA).__name__, type(QB).__name__])


class Abstract(abc.ABC):
    @abc.abstractmethod
    def f(self): ...


class Concrete(Abstract):
    def f(self):
        return 'f'


r['abc_concrete_works'] = repr(Concrete().f())

# ABCMeta specifically: it overrides NEITHER __new__ nor __init__, so
# ___grailMetaclassConstructs___: answers false and it is never dispatched. That
# guard is the reason this change costs the corpus nothing -- ABCMeta is
# everywhere.
#
# The two entries below are a PRE-EXISTING, DELIBERATE Grail gap, recorded here
# as a guard rather than as a claim: src/python/stdlib/abc.py spells the marker
# ``class ABC:'' and not ``class ABC(metaclass=ABCMeta)'', with a comment saying
# why -- routing every ABC subclass's isinstance/issubclass miss through
# ABCMeta.__instancecheck__ is a performance and semantic change worth measuring
# on its own. So an ABC subclass has no metaclass record to inherit, abstract
# instantiation is not refused, and type(Abstract) is type. Verified unchanged
# by this commit: identical before and after, in both spellings.
#
# ``metaclass=ABCMeta'' written directly DOES enforce, and is asserted below so
# the two spellings cannot silently converge.
try:
    Abstract()
    r['abc_base_refuses'] = 'instantiated'
except TypeError:
    r['abc_base_refuses'] = 'TypeError'
r['abc_base_type'] = repr(type(Abstract).__name__)


class ViaMeta(metaclass=abc.ABCMeta):
    @abc.abstractmethod
    def g(self): ...


try:
    ViaMeta()
    r['abc_keyword_refuses'] = 'instantiated'
except TypeError:
    r['abc_keyword_refuses'] = 'TypeError'


# --- KNOWN GAP, recorded rather than endorsed ----------------------------------
# A metaclass deriving from EnumMeta is still not dispatched, so this is only
# PART of the way to test_enum's test_extra_member_creation.  Three things stand
# between here and there:
#
# ONE thing now stands in the way, down from three: ORDERING.
# ___pyClassDefined___ builds the enum's members before
# ___grailDispatchMetaclass___ runs, so the entries the metaclass adds to the
# classdict arrive after the member pass. The metaclass IS dispatched now, and
# it does receive a real EnumDict with member_names -- it is simply too late.
#
# ``class IDEnumMeta(EnumMeta)'' still does not inherit EnumMeta's behaviour:
# Grail's EnumMeta IS the Smalltalk metaclass ``Enum class'', which a Python
# class cannot inherit from, so ___subclass___: roots it at type instead. That
# is what CPython's own base for a metaclass is, and it is what makes
# super().__new__ reach a __new__ that answers the class under construction --
# but the mro is (IDEnumMeta, type, ...) where CPython has
# (IDEnumMeta, EnumType, type, object).
from enum import EnumMeta, StrEnum


class IDEnumMeta(EnumMeta):
    def __new__(metacls, cls, bases, classdict, **kwds):
        for name in list(classdict.member_names):
            classdict['%s_DESC' % name] = '-%s' % classdict[name]
        return super().__new__(metacls, cls, bases, classdict, **kwds)


class IDEnum(StrEnum, metaclass=IDEnumMeta):
    pass


class MyEnum(IDEnum):
    ID = 'id'
    NAME = 'name'


r['enum_metaclass_members'] = repr([m.name for m in MyEnum])
r['enum_metaclass_mro'] = repr([c.__name__ for c in IDEnumMeta.__mro__])


EXPECTED = {
    'abc_concrete_works': "'f'",
    'abc_keyword_refuses': 'TypeError',
    'log': "['new:A', 'init:A', 'new:B', 'init:B', 'new:C', 'init:C']",
    'quiet_types': "['Quiet', 'Quiet']",
    'registries_are_distinct': '[True, True, True]',
    'tags': "['seen-A', 'seen-B', 'seen-C']",
    'types': "['M', 'M', 'M']",
}

GRAIL_ONLY = {
    'abc_base_refuses': 'instantiated',
    'abc_base_type': "'type'",
    'enum_metaclass_members': "['ID', 'NAME']",
    'enum_metaclass_mro': "['IDEnumMeta', 'type', 'PythonInstance', 'object']",
}


if __name__ == '__main__':
    for k in sorted(EXPECTED):
        actual = r[k]
        print('%-32s %s %s' % (k, 'OK ' if actual == EXPECTED[k] else 'DIFF', actual))
    for k in sorted(GRAIL_ONLY):
        actual = r[k]
        print('%-32s %s %s' % (k, 'XPASS' if actual == GRAIL_ONLY[k] else 'XFAIL', actual))
