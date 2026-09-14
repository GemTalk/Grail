# Inferred instance slots (GRAIL_INFERRED_SLOTS=1).
#
# With the flag on, Grail infers a GemStone named instVar for every attribute a
# class's own methods assign through ``self`` and compiles ``self.x`` in those
# methods to an accessor SEND.  None of that is visible from Python: every check
# below is plain attribute semantics, so this fixture is SELF-RUNNING
# (scripts/check_python_fixtures.sh) and its expectations are measured against
# CPython.  Each probe is a module-level function answering True; the Smalltalk
# side (InferredSlotsTestCase) calls them with the flag forced on and off.

import copy
import pickle


class Point:
    def __init__(self, x, y):
        self.x = x
        self.y = y

    def total(self):
        return self.x + self.y

    def move(self, dx):
        self.x += dx           # augmented assignment on an inferred slot

    def swap(self):
        self.x, self.y = self.y, self.x   # tuple target

    def forget_y(self):
        del self.y


def plain_read_write_del():
    p = Point(3, 4)
    ok = p.x == 3 and p.y == 4 and p.total() == 7
    p.x = 10
    ok = ok and p.x == 10 and p.total() == 14
    p.move(5)
    ok = ok and p.x == 15
    p.swap()
    ok = ok and (p.x, p.y) == (4, 15)
    p.forget_y()
    try:
        p.y
        return False
    except AttributeError:
        pass
    try:
        del p.y                 # deleting again raises
        return False
    except AttributeError:
        pass
    p.y = 1                     # re-assignable after del
    return ok and p.y == 1 and hasattr(p, 'y')


class Lazy:
    def __init__(self):
        pass                    # never assigns .value here

    def set_value(self, v):
        self.value = v          # ...but here, so ``value'' is inferred

    def read(self):
        return self.value


def unassigned_read_raises():
    o = Lazy()
    try:
        o.read()
        return False
    except AttributeError as e:
        ok = 'value' in str(e)
    try:
        o.value
        return False
    except AttributeError:
        pass
    ok = ok and not hasattr(o, 'value')
    o.set_value(9)
    return ok and o.read() == 9 and hasattr(o, 'value')


class Counter:
    count = 0                   # class-level default...

    def bump(self):
        self.count += 1         # ...read through the inferred slot's fallback


def class_default_then_instance():
    c = Counter()
    c.bump()
    c.bump()
    return c.count == 2 and Counter.count == 0 and Counter().count == 0


class Base:
    def __init__(self):
        self.x = 1              # inferred in Base

    def double(self):
        return self.x * 2       # compiled in Base against the inferred slot


class Sub(Base):
    @property
    def x(self):
        return 100

    @x.setter
    def x(self, v):
        self._x = v             # Base.__init__'s ``self.x = 1'' lands here


def subclass_property_override():
    s = Sub()
    return s.double() == 200 and s.x == 100 and s._x == 1 and Base().double() == 2


class ReadOnlyBase:
    def set_name(self, n):
        self.name = n


class ReadOnlySub(ReadOnlyBase):
    @property
    def name(self):
        return 'fixed'


def subclass_readonly_property_blocks_parent_store():
    s = ReadOnlySub()
    try:
        s.set_name('other')     # CPython: AttributeError, property has no setter
        return False
    except AttributeError:
        return s.name == 'fixed'


class WithGetattr:
    def __init__(self):
        self.real = 1

    def __getattr__(self, name):
        return ('fallback', name)

    def read_missing(self):
        return self.missing

    def read_real(self):
        return self.real


def getattr_fallback():
    o = WithGetattr()
    return (o.read_real() == 1 and o.real == 1
            and o.read_missing() == ('fallback', 'missing')
            and o.missing == ('fallback', 'missing'))


class SubGetattr(Point):
    def __getattr__(self, name):
        return 'missing:' + name


def getattr_for_unset_inherited_slot():
    # ``y'' is an inferred slot of Point; deleting it makes the read fall to
    # __getattr__, exactly as an absent instance attribute does in CPython.
    o = SubGetattr(1, 2)
    del o.y
    return o.y == 'missing:y' and o.x == 1 and o.total.__self__ is o


def dynamic_attribute_not_inferred():
    p = Point(1, 2)
    p.extra = 'e'               # never assigned in a method: not inferred
    setattr(p, 'other', 5)
    ok = p.extra == 'e' and p.other == 5 and getattr(p, 'other') == 5
    del p.extra
    return ok and not hasattr(p, 'extra') and p.other == 5


def dict_shows_slot_values():
    p = Point(1, 2)
    p.extra = 3
    d = p.__dict__
    ok = d['x'] == 1 and d['y'] == 2 and d['extra'] == 3 and len(d) == 3
    ok = ok and set(vars(p)) == {'x', 'y', 'extra'}
    ok = ok and 'x' in d and 'nope' not in d and 'x' in dir(p)
    d['x'] = 7                  # writes through the view
    ok = ok and p.x == 7
    del p.y
    ok = ok and 'y' not in p.__dict__ and set(p.__dict__) == {'x', 'extra'}
    return ok


class A:
    def __init__(self):
        self.a = 1

    def read_b(self):
        return self.b           # b is assigned only by the subclass


class B(A):
    def __init__(self):
        super().__init__()
        self.b = 2              # inferred in B
        self.a = self.a + 10    # parent's inferred slot, written from B


def inheritance_across_two_classes():
    b = B()
    ok = b.a == 11 and b.b == 2 and b.read_b() == 2
    a = A()
    try:
        a.read_b()
        return False
    except AttributeError:
        pass
    return ok and a.a == 1 and vars(b) == {'a': 11, 'b': 2}


class Mixed:
    __slots__ = ('declared', '__dict__')

    def __init__(self):
        self.declared = 1
        self.inferred = 2


def slots_and_inferred_together():
    m = Mixed()
    m.dyn = 3
    return (m.declared == 1 and m.inferred == 2 and m.dyn == 3
            and 'inferred' in vars(m) and 'dyn' in vars(m)
            and 'declared' not in vars(m))


def setattr_getattr_hasattr():
    p = Point(1, 2)
    setattr(p, 'x', 42)
    ok = p.x == 42 and getattr(p, 'x') == 42 and hasattr(p, 'x')
    ok = ok and getattr(p, 'zzz', 'dflt') == 'dflt' and not hasattr(p, 'zzz')
    delattr(p, 'x')
    return ok and not hasattr(p, 'x') and p.y == 2


def copy_and_pickle_round_trip():
    p = Point(5, 6)
    p.extra = 'e'
    c = copy.copy(p)
    ok = c is not p and c.x == 5 and c.y == 6 and c.extra == 'e' and c.total() == 11
    c.x = 50
    ok = ok and p.x == 5
    q = pickle.loads(pickle.dumps(p))
    ok = ok and q.x == 5 and q.y == 6 and q.extra == 'e' and q.total() == 11
    d = copy.deepcopy(p)
    return ok and d.x == 5 and d.total() == 11


class Hooked:
    def __init__(self):
        self.log = []
        self.v = 1

    def __setattr__(self, name, value):
        if name != 'log':
            self.log.append(name)
        object.__setattr__(self, name, value)


def own_setattr_hook_still_fires():
    h = Hooked()
    h.v = 2
    return h.log == ['v', 'v'] and h.v == 2


class HookedSub(Point):
    def __setattr__(self, name, value):
        object.__setattr__(self, name, value * 10)


def subclass_setattr_hook_intercepts_parent_store():
    h = HookedSub(1, 2)         # Point.__init__'s stores go through the hook
    return h.x == 10 and h.y == 20


def subclass_setattr_hook_intercepts_parent_augassign():
    # Point.move does ``self.x += dx``: CPython routes the store through the
    # subclass hook too.  Grail's flag-OFF codegen writes an augmented
    # self-store straight to dynamic-instVar storage (a pre-existing gap the
    # SUnit control test lists as known); with inferred slots the accessor
    # forwarder makes it reach __setattr__.
    h = HookedSub(1, 2)
    h.move(1)                   # (10 + 1) * 10
    return h.x == 110


CHECKS = [
    plain_read_write_del,
    unassigned_read_raises,
    class_default_then_instance,
    subclass_property_override,
    subclass_readonly_property_blocks_parent_store,
    getattr_fallback,
    getattr_for_unset_inherited_slot,
    dynamic_attribute_not_inferred,
    dict_shows_slot_values,
    inheritance_across_two_classes,
    slots_and_inferred_together,
    setattr_getattr_hasattr,
    copy_and_pickle_round_trip,
    own_setattr_hook_still_fires,
    subclass_setattr_hook_intercepts_parent_store,
    subclass_setattr_hook_intercepts_parent_augassign,
]


def run_all():
    """Every check name that did not answer True (a raised exception counts as
    a failure and is reported with its class name)."""
    failed = []
    for fn in CHECKS:
        try:
            r = fn()
        except Exception as e:  # noqa: BLE001 -- report, do not hide
            r = type(e).__name__ + ': ' + str(e)
        if r is not True:
            failed.append(fn.__name__ + (' -> ' + repr(r) if r is not False else ''))
    return failed


if __name__ == '__main__':
    for fn in CHECKS:
        try:
            r = fn()
        except Exception as e:  # noqa: BLE001
            r = type(e).__name__ + ': ' + str(e)
        print('%-4s %s%s' % ('OK' if r is True else 'FAIL', fn.__name__,
                             '' if r in (True, False) else '  (' + str(r) + ')'))
