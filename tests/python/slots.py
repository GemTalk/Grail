# Fixture for SlotsTestCase.
#
# Python __slots__ maps to GemStone named instance variables on the
# backing class.  A class that declares __slots__ (without a __dict__
# member) stores those attributes in fixed named instVars, forbids any
# other attribute (AttributeError), and has no __dict__.
#
# Each module global below records a value or a boolean that the SUnit
# test reads back via ___pyAttrLoad___.


def _raises_attr(fn):
    """Run fn(); return True iff it raised AttributeError."""
    try:
        fn()
        return False
    except AttributeError:
        return True


# --- Basic slot set / read / update, plus a method using slots ---
class Point:
    __slots__ = ('x', 'y')

    def __init__(self, x, y):
        self.x = x
        self.y = y

    def total(self):
        return self.x + self.y


p = Point(3, 4)
p_x = p.x                # 3
p_y = p.y                # 4
p_total = p.total()      # 7
p.x = 10
p_x_after = p.x          # 10


# --- Reading an unset slot raises AttributeError ---
class Bare:
    __slots__ = ('a', 'b')


_bare = Bare()
_bare.a = 1
unset_slot_raises = _raises_attr(lambda: _bare.b)   # True


# --- Strict: assigning a non-slot attribute raises AttributeError ---
def _set_nonslot(o):
    o.z = 5


nonslot_assign_raises = _raises_attr(lambda: _set_nonslot(Point(1, 2)))   # True


# --- Strict: a slotted instance has no __dict__ ---
dict_access_raises = _raises_attr(lambda: Point(1, 2).__dict__)          # True


# --- cls.__slots__ is still a readable class attribute ---
slots_value = Point.__slots__
slots_is_tuple = isinstance(slots_value, tuple)
slots_len = len(slots_value)                 # 2


# --- Single-string __slots__ form ---
class Single:
    __slots__ = 'only'

    def __init__(self, v):
        self.only = v


single_val = Single(42).only                 # 42


# --- Empty __slots__ still forbids attributes ---
class Empty:
    __slots__ = ()


empty_assign_raises = _raises_attr(lambda: _set_nonslot(Empty()))        # True


# --- Inheritance: subclass adds slots; base slot is reused ---
class Base:
    __slots__ = ('base_v',)

    def set_base(self, v):
        self.base_v = v


class Derived(Base):
    __slots__ = ('deriv_v',)

    def read_base(self):
        return self.base_v


_d = Derived()
_d.set_base(99)
derived_reads_base = _d.read_base()          # 99 (inherited slot, runtime probe)
_d.deriv_v = 7
derived_own_slot = _d.deriv_v                # 7


# --- del obj.slot resets it; a later read raises AttributeError ---
class DelBox:
    __slots__ = ('q',)

    def __init__(self):
        self.q = 1


_db = DelBox()
del _db.q
del_then_read_raises = _raises_attr(lambda: _db.q)   # True


# --- Augmented assignment to a slot ---
class Counter:
    __slots__ = ('n',)

    def __init__(self):
        self.n = 0

    def bump(self):
        self.n += 1


_c = Counter()
_c.bump()
_c.bump()
counter_after_bumps = _c.n                   # 2
