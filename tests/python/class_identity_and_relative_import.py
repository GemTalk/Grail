"""Three general bugs found on pydantic's import path (docs/Support_Pydantic.md,
Phase 4), each of which stopped ``from pydantic import BaseModel``.

1. A class whose ``__eq__`` was ASSIGNED after creation -- every dataclass --
   compared equal to other classes.  ``C == x`` is ``type(C).__eq__(C, x)``;
   Grail ran C's own (instance) ``__eq__`` with the class as self.  Two routes:
   the setattr-dunder probe in object.__eq__ / __ne__ / __hash__ (class
   receiver), and the reflected-first subclass rule (Smalltalk metaclasses
   mirror the class hierarchy, so ``D class inheritsFrom: Generic class``).
   typing's ``cls in (Generic, Protocol)`` then rejected ``D[int]`` for a
   ``@dataclass`` subclass of Generic.

2. A metaclass was called with ``bases == (object,)`` for ``class A(metaclass=M)``;
   CPython passes ``()``.  pydantic's ModelMetaclass recognises the creation of
   BaseModel itself by ``if bases:``.

3. ``importlib.import_module('.x', package='p')`` stripped the dots and ignored
   ``package``, so ``'.warnings'`` answered the STDLIB warnings module.

Every expectation here was measured against CPython 3.14.
"""

import os
import sys
import tempfile
from dataclasses import dataclass
from importlib import import_module
from typing import Generic, Protocol, TypeVar

RESULTS = {}


def check(name, got, want):
    RESULTS[name] = (got == want) or ('got: ' + repr(got)[:120])


T = TypeVar('T')


# -- 1. class equality never runs an instance __eq__ -------------------------

class Assigned:
    pass


Assigned.__eq__ = lambda self, other: True
Assigned.__hash__ = object.__hash__


@dataclass
class DC(Generic[T]):
    x: int


@dataclass(slots=True)
class DS(Generic[T]):
    x: int


check('assigned_eq_class_vs_int', Assigned == int, False)
check('assigned_eq_still_governs_instances', Assigned() == 1, True)
check('dataclass_generic_eq_generic', (DC == Generic, Generic == DC), (False, False))
check('slots_dataclass_generic_eq_generic', (DS == Generic, Generic == DS), (False, False))
check('dataclass_generic_not_in_generic_protocol',
      (DC in (Generic, Protocol), DS in (Generic, Protocol)), (False, False))
check('dataclass_generic_ne', (Generic != DC, DC != Generic), (True, True))
check('dataclass_generic_subscripts', (DC[int].__origin__ is DC, DS[int].__origin__ is DS), (True, True))
check('dataclass_instances_still_compare', (DC(1) == DC(1), DC(1) == DC(2)), (True, False))
check('class_hash_is_identity_hash', hash(Assigned) == object.__hash__(Assigned), True)


# -- 2. a metaclass sees the bases the statement wrote ------------------------

seen = {}


class Meta(type):
    def __new__(mcs, name, bases, ns, **kw):
        seen[name] = bases
        return super().__new__(mcs, name, bases, ns, **kw)


class NoBases(metaclass=Meta):
    pass


class OneBase(NoBases):
    pass


check('metaclass_sees_empty_bases', seen['NoBases'], ())
check('metaclass_sees_written_base', seen['OneBase'], (NoBases,))
check('bases_attribute_still_object', NoBases.__bases__, (object,))


# -- 3. relative import_module -------------------------------------------------

def _relative_imports():
    root = tempfile.mkdtemp()
    pkg = os.path.join(root, 'relpkg_cirt')
    os.mkdir(pkg)
    with open(os.path.join(pkg, '__init__.py'), 'w') as f:
        f.write('')
    with open(os.path.join(pkg, 'warnings.py'), 'w') as f:
        f.write("MARK = 'relpkg_cirt.warnings'\n")
    with open(os.path.join(pkg, 'other.py'), 'w') as f:
        f.write("MARK = 'relpkg_cirt.other'\n")
    sys.path.insert(0, root)
    try:
        a = import_module('.other', package='relpkg_cirt')
        b = import_module('.warnings', package='relpkg_cirt')
        try:
            import_module('.other')
            no_pkg = 'no error'
        except TypeError:
            no_pkg = 'TypeError'
        try:
            import_module('...x', package='relpkg_cirt')
            beyond = 'no error'
        except ImportError:
            beyond = 'ImportError'
        return (a.MARK, b.MARK, no_pkg, beyond)
    finally:
        sys.path.remove(root)


check('relative_import_module', _relative_imports(),
      ('relpkg_cirt.other', 'relpkg_cirt.warnings', 'TypeError', 'ImportError'))


if __name__ == '__main__':
    for _name in sorted(RESULTS):
        _v = RESULTS[_name]
        print('%-4s %s' % ('OK' if _v is True else 'FAIL', _name),
              '' if _v is True else _v)
