"""Fixture for NumericSubclassRebuildTestCase (#1863): revision 1 of a module
whose classes subclass a built-in VALUE type -- float and int, whose subclasses
Grail roots at a storage class (AbstractPyFloat, AbstractPyInt) rather than at
the kernel class the statement names, and, as controls, the other immutable
built-ins, whose subclasses are rooted where the statement says.

The test loads this, makes an instance of each class, rewrites the file to
v2.py and loads it again: a rebuild of the same module, which must hand back
the same classes -- and the same enum members -- so the instances made before
it are still instances of what the module names after it.
"""
import enum


class PF(float):
    def version(self):
        return 1


class PI(int):
    def version(self):
        return 1


class Size(float, enum.Enum):
    SMALL = 1.5
    LARGE = 3.0


class Rank(int, enum.Enum):
    LOW = 1
    HIGH = 2


def _version(self):
    return 1


# Built by CALLING type(), not by a class statement (#1802's path).
BF = type('BF', (float,), {'version': _version})
BI = type('BI', (int,), {'version': _version})


class PC(complex):
    pass


class PB(bytes):
    pass


class PT(tuple):
    pass


class PFS(frozenset):
    pass


class PS(str):
    pass


VERSION = 1
