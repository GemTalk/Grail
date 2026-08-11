# ``first = T(auto(), 'for the money')'' -- auto() markers inside a NAMEDTUPLE
# member value.
#
# Grail resolved markers inside a plain tuple value, gated on
# ``rawValue isKindOf: tuple''.  Its namedtuple classes are not tuple-ROOTED --
# the factory's ``_NT'' chain runs straight to Enum, never through Array -- so a
# namedtuple never reached that branch and the marker survived into the member:
#
#     T(index=<GrailEnumAuto object>, desc='for the music')
#
# The value is now unwrapped to a plain tuple, resolved by the existing
# left-to-right walk, and rebuilt as the namedtuple -- so the resolution logic
# (feeding genValues between markers so the default generator advances, holding
# ``count'' constant within a member) stays in one place.

from enum import Enum, auto
from collections import namedtuple

r = {}

T = namedtuple('T', 'index desc')


class SomeEnum(Enum):
    first = T(auto(), 'for the money')
    second = T(auto(), 'for the show')
    third = T(auto(), 'for the music')


r['values'] = ';'.join(repr(m.value) for m in SomeEnum)
r['third_index'] = SomeEnum.third.value.index
r['second_desc'] = SomeEnum.second.value.desc
r['is_namedtuple'] = isinstance(SomeEnum.third.value, T)
r['equals_tuple'] = SomeEnum.third.value == (3, 'for the music')

# --- a namedtuple value with NO auto() is untouched ---------------------------

TT = namedtuple('TT', 'id a blist')


class NTEnum(Enum):
    NONE = TT(0, 0, [])
    A = TT(1, 2, [4])


r['plain_nt'] = ';'.join(repr(m.value) for m in NTEnum)

# --- a namedtuple MIXIN still builds its members ------------------------------


class NTCEnum(TT, Enum):
    NONE = 0, 0, []
    A = 1, 2, [4]


r['mixin_repr'] = repr(NTCEnum.NONE)
r['mixin_field'] = NTCEnum.A.id

# --- plain tuples with auto() are unchanged -----------------------------------


class Plain(Enum):
    one = auto(), 'a'
    two = auto(), 'b'


r['plain_tuple'] = ';'.join(repr(m.value) for m in Plain)

# --- and a bare auto() is unchanged -------------------------------------------


class Bare(Enum):
    x = auto()
    y = auto()


r['bare'] = ','.join('%s=%d' % (m.name, m.value) for m in Bare)
