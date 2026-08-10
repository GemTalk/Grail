# ``len(flag_member)'' is the number of single-bit flags set (CPython 3.11+):
# len(Color.BLACK) == 0, len(Color.WHITE) == 3.  Grail's flag members had no
# __len__ at all, so len(member) raised ``object of type 'Color' has no len()''.
#
# The failing assertion in test_enum reaches it the unbound way --
# ``Color.__len__(Color.PURPLE)'' -- which is also the part that shows WHY the
# method has to live on the class: the class's own __len__ shadows the metaclass
# one that counts MEMBERS, exactly as CPython's Flag.__len__ shadows
# EnumType.__len__.  Without it the unbound handle found the unary metaclass
# method and reported ``__len__() takes a different number of arguments''.
#
# IntFlag needs its own copy: it is AbstractPyInt-rooted and does not inherit
# Flag.  Both now share one decomposition helper with __iter__, which had the
# same walk written out twice already.

from enum import Flag, IntFlag

r = {}


class Color(Flag):
    BLACK = 0
    RED = 1
    ROJO = 1
    GREEN = 2
    BLUE = 4
    PURPLE = RED | BLUE
    WHITE = RED | GREEN | BLUE
    BLANCO = RED | GREEN | BLUE


class IColor(IntFlag):
    BLACK = 0
    RED = 1
    GREEN = 2
    BLUE = 4
    PURPLE = RED | BLUE
    WHITE = RED | GREEN | BLUE


# --- len(member), directly ----------------------------------------------------

r['flag_lens'] = ','.join(
    str(len(m)) for m in (Color.BLACK, Color.GREEN, Color.PURPLE, Color.WHITE))
r['intflag_lens'] = ','.join(
    str(len(m)) for m in (IColor.BLACK, IColor.GREEN, IColor.PURPLE, IColor.WHITE))

# --- and unbound off the class, which is what test_member_length does ---------

r['unbound'] = ','.join(str(Color.__len__(m)) for m in
                        (Color.BLACK, Color.GREEN, Color.PURPLE, Color.BLANCO))
r['unbound_int'] = ','.join(str(IColor.__len__(m)) for m in
                            (IColor.BLACK, IColor.GREEN, IColor.PURPLE, IColor.WHITE))

# --- len(CLASS) still counts canonical members, not bits ----------------------
# The metaclass __len__ must keep working; only instance access is shadowed.

r['class_lens'] = '%d/%d' % (len(Color), len(IColor))

# --- __iter__ still decomposes the same way (shared helper) -------------------

r['iter'] = ';'.join(
    ','.join(c.name for c in m) or '-'
    for m in (Color.BLACK, Color.GREEN, Color.PURPLE, Color.WHITE))
r['iter_int'] = ';'.join(
    ','.join(c.name for c in m) or '-'
    for m in (IColor.BLACK, IColor.GREEN, IColor.PURPLE, IColor.WHITE))

# --- len() agrees with iteration ----------------------------------------------

r['agree'] = all(
    len(m) == len(list(m))
    for m in (Color.BLACK, Color.RED, Color.PURPLE, Color.WHITE,
              IColor.BLACK, IColor.RED, IColor.PURPLE, IColor.WHITE))
