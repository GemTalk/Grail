# A composite flag pseudo-member is NAMED after the members it subsumes
# (CPython 3.11+): ``(Color.RED | Color.GREEN).name`` is 'RED|GREEN'.
#
# Grail stored None.  The built-in repr looked right anyway, because it computes
# the same join separately -- so the gap only showed where the name is REACHABLE:
#
#     class NewPerm(IntFlag):
#         R = 1 << 2; W = 1 << 1; X = 1 << 0
#         def __str__(self):
#             return self._name_
#
#     format(NewPerm.R | NewPerm.X, '')      # 'None'
#
# which is test_enum OldTestIntFlag.test_format.
#
# The name comes from the decomposition the repr already uses, so a KEEP
# composite carrying uncovered bits is named the way it is printed (R|8), and a
# value that decomposes to nothing -- zero, with no zero-valued member -- keeps
# None.
#
# One consumer must still DECOMPOSE rather than read the name: a @global_enum's
# repr prefixes each named piece with the module, and it used the absent name as
# its "is this a composite?" test.  Composites now carry an explicit marker.

import enum
from enum import Flag, IntFlag, auto

r = {}


class Color(Flag):
    RED = 1
    GREEN = 2
    BLUE = 4


composite = Color.RED | Color.GREEN

r['name'] = composite.name
r['sunder_name'] = composite._name_
r['repr'] = repr(composite)
r['str'] = str(composite)
r['single_name'] = Color.RED.name
r['three'] = (Color.RED | Color.GREEN | Color.BLUE).name

# The same object every time, so the name is not recomputed per read.
r['cached'] = (Color.RED | Color.GREEN) is composite

# --- the name is reachable through a user __str__ ------------------------------


class NewPerm(IntFlag):
    R = 1 << 2
    W = 1 << 1
    X = 1 << 0

    def __str__(self):
        return self._name_


r['user_str_single'] = format(NewPerm.R, '')
r['user_str_composite'] = format(NewPerm.R | NewPerm.X, '')

# --- a KEEP composite carrying uncovered bits ----------------------------------


class Keep(IntFlag, boundary=enum.KEEP):
    R = 4
    W = 2


r['keep'] = (Keep.R | 8).name
r['keep_repr'] = repr(Keep.R | 8)

# --- zero keeps None -----------------------------------------------------------

r['zero'] = Color(0).name
r['zero_repr'] = repr(Color(0))

# --- an explicitly-defined composite keeps its class-body name -----------------


class Named(Flag):
    A = 1
    B = 2
    BOTH = 3


r['explicit'] = Named.BOTH.name
r['explicit_repr'] = repr(Named.BOTH)
r['explicit_is_lookup'] = Named(3) is Named.BOTH

# --- a @global_enum still prefixes EVERY piece with the module -----------------


@enum.global_enum
class Head(IntFlag, boundary=enum.KEEP):
    LOW = 1
    HIGH = 2


globals().update(Head.__members__)

def _mod_neutral(text):
    """The module name differs between a script run and the test harness."""
    return text.replace(__name__, 'MOD')


r['global_single'] = _mod_neutral(repr(Head.LOW))
r['global_composite'] = _mod_neutral(repr(Head.LOW | Head.HIGH))
r['global_keep'] = _mod_neutral(repr(Head(5)))
r['global_nameless'] = _mod_neutral(repr(Head(8)))
