# A pickled enum member must come back as the SAME object.  It did for a plain
# Enum, for a Flag, and for a user's ``class E(int, Enum)'' -- but not for the
# three storage-rooted roots Grail SHIPS:
#
#     IntEnum   DIFFERENT
#     IntFlag   DIFFERENT
#     StrEnum   DIFFERENT
#
# Enum's __reduce__ / __reduce_ex__ live on Enum, and those three are rooted on
# AbstractPyInt / AbstractPyStr instead -- they do not inherit Enum on the
# Smalltalk chain.  A USER's ``class E(int, Enum)'' does get them, because the
# multiple-inheritance merge copies Enum's instance methods down, which is
# exactly why the shipped roots were the ones that went wrong: with no
# __reduce__ and no __reduce_ex__ to answer with, pickle fell through to
# newobj(cls) and rebuilt a member-shaped object that was EQUAL to the canonical
# member but not it.
#
# test_enum OldTestFlag.test_pickle and TestSpecial.test_subclassing.

import pickle
from enum import Enum, IntEnum, IntFlag, StrEnum, Flag

r = {}


class IE(IntEnum):
    A = 1
    B = 2


class IF(IntFlag):
    LARRY = 1
    CURLY = 2
    MOE = 4


class SE(StrEnum):
    A = 'a'
    B = 'b'


class FL(Flag):
    A = 1
    B = 2


class EN(Enum):
    A = 1


class MixInt(int, Enum):
    A = 1


class MixStr(str, Enum):
    A = 'a'


CASES = (
    ('IntEnum', IE.B),
    ('IntFlag', IF.CURLY),
    ('StrEnum', SE.B),
    ('Flag', FL.B),
    ('Enum', EN.A),
    ('int,Enum', MixInt.A),
    ('str,Enum', MixStr.A),
)


def _identity(member):
    """Identical across every protocol, or the first protocol that isn't."""
    for proto in range(3):
        got = pickle.loads(pickle.dumps(member, protocol=proto))
        if got is not member:
            return 'proto%d' % proto
    return 'ok'


r['identity'] = ';'.join('%s=%s' % (n, _identity(m)) for n, m in CASES)

# The class itself round-trips too.
r['classes'] = ';'.join(
        '%s=%s' % (n, pickle.loads(pickle.dumps(type(m))) is type(m))
        for n, m in CASES)

# --- what __reduce__ actually answers -----------------------------------------

r['reduce'] = repr(IF.CURLY.__reduce__())
r['reduce_ex'] = repr(IF.CURLY.__reduce_ex__(2))
r['reduce_agrees'] = IE.B.__reduce__() == IE.B.__reduce_ex__(0)

# --- a COMPOSITE flag value ---------------------------------------------------

both = IF.LARRY | IF.CURLY
r['composite'] = pickle.loads(pickle.dumps(both)) is both
r['composite_value'] = pickle.loads(pickle.dumps(both)).value

# --- the value survives with its type -----------------------------------------

r['int_value'] = repr(pickle.loads(pickle.dumps(IE.B)).value)
r['str_value'] = repr(pickle.loads(pickle.dumps(SE.B)).value)

# --- a mixin's OWN __reduce__ still wins by MRO -------------------------------
# The reason Enum's had to be spelled __reduce_ex__ as well: a data type nearer
# in the MRO that defines __reduce__ keeps it, and pickle asks for __reduce_ex__
# first, so Enum's answer is the one that decides.


class NamedInt(int):
    def __new__(cls, *args):
        _args = args
        name, *args = args
        self = int.__new__(cls, *args)
        self._intname = name
        self._args = _args
        return self

    def __reduce__(self):
        return self.__class__, self._args


class NEI(NamedInt, Enum):
    x = ('the-x', 1)
    y = ('the-y', 2)


r['mixin_member'] = pickle.loads(pickle.dumps(NEI.y)) is NEI.y
r['mixin_plain'] = repr(pickle.loads(pickle.dumps(NamedInt('five', 5))))
