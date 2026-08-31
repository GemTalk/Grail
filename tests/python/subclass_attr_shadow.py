"""Fixture: a MULTIPLE-INHERITANCE subclass must see a secondary base's CURRENT
class-attribute value, not a stale copy of the value its own base declared.

Every expectation below was measured under CPython 3.14.6, not recalled.

THE SHAPE THAT MATTERS, and why it is not the obvious one.  Grail implements
multiple inheritance by COPY-DOWN: ``class C(S1, B)'' inherits ONE base through
Smalltalk single inheritance (the storage base, chosen by chain depth) and
importlib >> ___mergeSecondaryBases___ copies the other bases' methods and class
attributes onto C.  The class-attribute copy walked each secondary base's chain
looking for the ancestor whose METACLASS declares the accessor, then read the
value from THAT ancestor.

A Grail class attribute compiled from ``x = 'from-A''' is an accessor pair over a
CLASSINSTVAR, and classInstVars are PER-CLASS storage: one compiled accessor on
``A class'' serves every subclass, but each subclass reads its own slot.  So
after a later ``B.x = 'from-B''' the two reads differ --

    A.x  -> 'from-A'      (A's slot, never reassigned)
    B.x  -> 'from-B'      (B's own slot)

-- and the merge, asking A, copied 'from-A' onto C.  Being on C itself, the copy
was nearer than anything on B and won every subsequent read: ``C.x'' answered
'from-A' where CPython answers 'from-B'.  Silently wrong data, not an error.

THE DISCRIMINATOR IS WHICH BASE BECOMES THE STORAGE BASE.  If B is the deepest
base in the header it becomes C's Smalltalk superclass, no copy is made at all,
and the read walks the real chain -- correct.  ``shallow_first_base_is_correct''
below is exactly that shape, and it is the one four earlier attempts at a
minimal repro all had; all four passed and the bug looked absent.  Putting a
base of EQUAL OR GREATER depth ahead of B is what pushes B off the primary chain
and makes the copy happen.

Found in pyyaml 6.0.3: ``BaseResolver'' declares ``yaml_implicit_resolvers = {}'',
``Resolver.add_implicit_resolver'' fills Resolver's slot with 30 entries at import
time, and ``class SafeLoader(Reader, Scanner, Parser, Composer, SafeConstructor,
Resolver)'' copied BaseResolver's EMPTY dict down.  Every YAML scalar then
resolved to ``tag:yaml.org,2002:str'': ``yaml.safe_load('a: 1')'' answered
``{'a': '1'}''.  The ``yaml_shape_*'' checks below are that hierarchy reduced to
its load-bearing parts, with no dependency on pyyaml being installed.
"""

RESULTS = {}


def check(name, fn, expected):
    try:
        actual = fn()
    except BaseException as exc:
        RESULTS[name] = 'raised %s: %s' % (type(exc).__name__, exc)
        return
    RESULTS[name] = True if actual == expected else 'got %r, want %r' % (actual, expected)


# --- the defect, minimally -------------------------------------------------
class A:
    x = 'from-A'


class B(A):
    pass


B.x = 'from-B'          # B's OWN storage; A's is untouched


class S0:
    pass


class S1(S0):
    pass                # depth 2 -- ties with B and is listed FIRST, so it,
                        # not B, becomes Grail's storage base


class C(S1, B):
    pass


check('base_keeps_its_own_value', lambda: A.x, 'from-A')
check('subclass_sees_reassignment', lambda: B.x, 'from-B')
check('mi_child_sees_nearest_base', lambda: C.x, 'from-B')


# --- the shape four earlier guesses had: B is the deepest base, so it becomes
#     the storage base, nothing is copied, and the read was already correct.
class T0:
    pass


class D(T0, B):
    pass


check('shallow_first_base_is_correct', lambda: D.x, 'from-B')


# --- control: never reassigned, so the declaring class IS the right source ---
class A2:
    y = 'from-A2'


class B2(A2):
    pass


class C2(S1, B2):
    pass


check('unreassigned_attr_still_inherits', lambda: C2.y, 'from-A2')


# --- control: a value on the STORAGE base still wins where it should --------
class S1v(S0):
    z = 'from-storage'


class Bz(A):
    pass


Bz.z = 'from-secondary'


class Cz(S1v, Bz):
    pass


check('leftmost_base_wins', lambda: Cz.z, 'from-storage')


# --- control: the child's OWN class body outranks every base ----------------
class Cown(S1, B):
    x = 'from-own-body'


check('own_body_outranks_bases', lambda: Cown.x, 'from-own-body')


# --- pyyaml's shape: a classmethod that mutates ``cls`` at import time ------
class BaseR:
    tbl = {}

    @classmethod
    def add(cls, key):
        if 'tbl' not in cls.__dict__:
            cls.tbl = dict(cls.tbl)
        cls.tbl[key] = 1


class Res(BaseR):
    pass


Res.add('a')
Res.add('b')


class Rd0:
    pass


class Rd1(Rd0):
    pass


class Loader(Rd1, Res):
    pass


check('yaml_shape_base_untouched', lambda: len(BaseR.tbl), 0)
check('yaml_shape_middle_populated', lambda: len(Res.tbl), 2)
check('yaml_shape_loader_sees_middle', lambda: len(Loader.tbl), 2)
check('yaml_shape_loader_contents',
      lambda: sorted(Loader.tbl), ['a', 'b'])


# --- a THREE-deep chain: the value must come from the base named in the
#     header, not from the class that declares the attribute.  Only ``E2'' is a
#     merged case: in ``E3'' the named base G2 is the deepest in the header, so
#     it becomes Grail's storage base and is inherited rather than copied -- the
#     same distinction ``shallow_first_base_is_correct'' draws, kept here so the
#     pair reads honestly.
class G0:
    v = 0


class G1(G0):
    pass


class G2(G1):
    pass


G1.v = 1
G2.v = 2


class E3(S1, G2):
    pass


check('deepest_named_base_wins', lambda: E3.v, 2)


class E2(S1, G1):
    pass


check('middle_named_base_wins', lambda: E2.v, 1)


# --- a mutable value must be the SAME OBJECT, not a copy --------------------
class M:
    items = []


class M2(M):
    pass


M2.items = ['seed']


class MC(S1, M2):
    pass


MC.items.append('added')

check('mutable_attr_is_shared_not_copied', lambda: M2.items, ['seed', 'added'])


if __name__ == '__main__':
    for _name in sorted(RESULTS):
        _v = RESULTS[_name]
        print('%-4s %s' % ('OK' if _v is True else 'FAIL', _name),
              '' if _v is True else _v)
