# Two ways a tuple reaches an enum, both of which Grail got wrong.
#
# (1) ``class SomeTuple(tuple, Enum)'' -- the member IS a tuple.  Grail built it
#     with basicNew, which leaves the INDEXED content empty, so every member was
#     a zero-length tuple: len() 0, indexing raised IndexError, iteration yielded
#     nothing, and ``SomeTuple.third == (3, 'for the music')'' was False even
#     though _value_ held exactly that.  The str-rooted branch already gave its
#     members the value's characters; this is the same fix for elements.
#
# (2) A member VALUE that is a namedtuple has to SPREAD into __new__ / __init__ /
#     member_type(*args) -- CPython's ``args = value if isinstance(value, tuple)
#     else (value,)'', and a namedtuple is a tuple there.  Grail's namedtuple
#     classes are not tuple-ROOTED (the collections factory's ``_NT'' chain runs
#     straight to Enum, never through Array), so the isKindOf: test missed them
#     and the whole namedtuple arrived as ONE argument: ``missing required
#     argument: a''.
#
# test_enum test_tuple_subclass and test_namedtuple_as_value.

import pickle
from enum import Enum
from collections import namedtuple

r = {}

# --- (1) a tuple-ROOTED enum ---------------------------------------------------


class SomeTuple(tuple, Enum):
    first = (1, 'for the money')
    second = (2, 'for the show')
    third = (3, 'for the music')


r['type_is_enum'] = type(SomeTuple.first) is SomeTuple
r['is_tuple'] = isinstance(SomeTuple.second, tuple)
r['equals'] = SomeTuple.third == (3, 'for the music')
r['len'] = len(SomeTuple.third)
r['index'] = repr(SomeTuple.third[0])
r['iterate'] = repr(list(SomeTuple.third))
r['value'] = repr(SomeTuple.third.value)
r['repr'] = repr(SomeTuple.third)
r['roundtrip'] = pickle.loads(pickle.dumps(SomeTuple.first)) is SomeTuple.first

# The members stay distinct objects with distinct contents.
r['contents'] = ';'.join(repr(tuple(m)) for m in SomeTuple)

# --- (2) a namedtuple as the member VALUE --------------------------------------

TTuple = namedtuple('TTuple', 'id a blist')


class NTEnum(Enum):
    NONE = TTuple(0, 0, [])
    A = TTuple(1, 2, [4])
    B = TTuple(2, 4, [0, 1, 2])


r['nt_repr'] = repr(NTEnum.NONE)
r['nt_value'] = NTEnum.NONE.value == TTuple(id=0, a=0, blist=[])
r['nt_values'] = ';'.join(repr(m.value) for m in NTEnum)
try:
    NTEnum.NONE.id
    r['nt_attr'] = 'NOT RAISED'
except AttributeError:
    r['nt_attr'] = 'AttributeError'

# The namedtuple as the DATA TYPE rather than the value.


class NTCEnum(TTuple, Enum):
    NONE = 0, 0, []
    A = 1, 2, [4]


r['ntc_repr'] = repr(NTCEnum.NONE)
r['ntc_fields'] = '%s/%s/%s' % (NTCEnum.NONE.id, NTCEnum.A.a, NTCEnum.A.blist)

# And a user __new__ taking the namedtuple's fields as separate arguments --
# the shape that needed the spread.


class NTDEnum(Enum):
    def __new__(cls, id, a, blist):
        member = object.__new__(cls)
        member.id = id
        member.a = a
        member.blist = blist
        return member

    NONE = TTuple(0, 0, [])
    A = TTuple(1, 2, [4])


r['ntd_repr'] = repr(NTDEnum.NONE)
r['ntd_fields'] = '%s/%s/%s' % (NTDEnum.NONE.id, NTDEnum.A.a, NTDEnum.A.blist)

# --- plain tuple values on a plain Enum are unchanged --------------------------


class Planet(Enum):
    MERCURY = (3.303e+23, 2.4397e6)
    VENUS = (4.869e+24, 6.0518e6)

    def __init__(self, mass, radius):
        self.mass = mass
        self.radius = radius


r['plain_tuple_init'] = '%g/%g' % (Planet.VENUS.mass, Planet.VENUS.radius)


class Scalar(Enum):
    A = 1
    B = 'two'


r['scalar'] = ';'.join(repr(m.value) for m in Scalar)
