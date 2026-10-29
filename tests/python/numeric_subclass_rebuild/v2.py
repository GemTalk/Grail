"""Revision 2 of tests/python/numeric_subclass_rebuild/v1.py: the methods
answer 2."""
import enum


class PF(float):
    def version(self):
        return 2


class PI(int):
    def version(self):
        return 2


class Size(float, enum.Enum):
    SMALL = 1.5
    LARGE = 3.0


class Rank(int, enum.Enum):
    LOW = 1
    HIGH = 2


def _version(self):
    return 2


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


VERSION = 2
