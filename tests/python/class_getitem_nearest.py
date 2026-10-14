"""C[x] calls the NEAREST __class_getitem__, whichever way it is written.

A class's hook can be a plain ``def'' (an implicit classmethod) or an explicit
``@classmethod''.  Grail asked for a plain def first, anywhere in the chain,
and a @classmethod that overrides an inherited def also compiles an
instance-side forwarder -- so ``C[x]'' ran the forwarder with the class as
receiver and died with an uncatchable MessageNotUnderstood.  sqlalchemy's
``cython.const'' is that shape (``class const(Generic[_T])'' with a
@classmethod hook, subscripted as the module imports): none of sqlalchemy's
tests could be collected.

Every expectation was measured against CPython 3.14.
"""

from typing import Generic, TypeVar

RESULTS = {}


def check(name, got, want):
    RESULTS[name] = (got == want) or ('got: ' + repr(got)[:200])


_T = TypeVar('_T')


class Const(Generic[_T]):
    @classmethod
    def __class_getitem__(cls, item):
        return ('Const', cls.__name__, item)


class ConstChild(Const):
    pass


class DefBase:
    def __class_getitem__(cls, item):
        return ('DefBase', cls.__name__, item)


class ClassmethodOverDef(DefBase):
    @classmethod
    def __class_getitem__(cls, item):
        return ('ClassmethodOverDef', cls.__name__, item)


class ClassmethodBase:
    @classmethod
    def __class_getitem__(cls, item):
        return ('ClassmethodBase', cls.__name__, item)


class DefOverClassmethod(ClassmethodBase):
    def __class_getitem__(cls, item):
        return ('DefOverClassmethod', cls.__name__, item)


class InheritsClassmethod(ClassmethodBase):
    pass


class PlainGeneric(Generic[_T]):
    pass


check('a_classmethod_over_generics_def', Const[int], ('Const', 'Const', int))
check('inherited_by_a_subclass_with_its_own_cls', ConstChild[str],
      ('Const', 'ConstChild', str))
check('a_classmethod_over_an_inherited_def', ClassmethodOverDef[int],
      ('ClassmethodOverDef', 'ClassmethodOverDef', int))
check('a_def_over_an_inherited_classmethod', DefOverClassmethod[int],
      ('DefOverClassmethod', 'DefOverClassmethod', int))
check('an_inherited_classmethod', InheritsClassmethod[bytes],
      ('ClassmethodBase', 'InheritsClassmethod', bytes))
check('the_plain_def_alone', DefBase[float], ('DefBase', 'DefBase', float))
check('the_instance_side_still_reaches_the_classmethod',
      Const().__class_getitem__(int), ('Const', 'Const', int))
check('a_plain_generic_still_parameterises',
      (PlainGeneric[int].__origin__ is PlainGeneric, PlainGeneric[int].__args__),
      (True, (int,)))

SUMMARY = '%d checks, %d disagreeing' % (len(RESULTS), sum(1 for v in RESULTS.values() if v is not True))

if __name__ == '__main__':
    for _name in sorted(RESULTS):
        _v = RESULTS[_name]
        print('%-4s %s' % ('OK' if _v is True else 'FAIL', _name),
              '' if _v is True else _v)
