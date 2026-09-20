"""schema_demo, version 2 -- the SAME module after a schema change.

`A` grew a second instance attribute, `z`, and a method that uses it.  The
source is otherwise unchanged, and nothing anywhere mentions migration.

Run this second, in a SEPARATE session:

    PYTHONPATH=experiments/schema/v2 ./grail -c 'import schema_demo'

Importing it finds `schema_demo` already deployed in this repository but with
a stale source hash, so Grail recompiles the module's methods IN PLACE,
reusing the registered class objects.  The instance version 1 committed keeps
pointing at the very same `B`, and therefore sees the new code.

`x`, `y` and `z` are POSITIONS in the instance's indexed part (the default
since 2026-09-16; `GRAIL_INFERRED_SLOTS=0` restores dynamic instance
variables).  Adding `z` APPENDS to the class's slot layout, which is why the
class identity survives and no instance has to be migrated.
"""

import gemdb


class A:
    # A default on the class is how a plain Python program answers "what does
    # z mean for an object that predates z?"  It is also the whole migration
    # story: instances made before the edit read the default until something
    # assigns to them.
    z = 0

    def __init__(self, x, z=0):
        self.x = x
        self.z = z

    def total(self):
        return self.x + self.z


class B(A):
    def __init__(self, x, y, z=0):
        super().__init__(x, z)
        self.y = y


b = gemdb.root["b"]

# 1. The class is the same class -- GemDB did not mint a second B.
assert type(b) is B, "expected the persisted instance's class to BE this B"
assert A in type(b).__mro__, "expected A to still be in B's MRO"
assert id(B) == gemdb.root["B_id"], "expected B to keep its identity across the edit"
assert id(A) == gemdb.root["A_id"], "expected A to keep its identity across the edit"
print("v2: type(b) is B         -> %r" % (type(b) is B,))
print("v2: id(B) now %d, was %d -> same? %r"
      % (id(B), gemdb.root["B_id"], id(B) == gemdb.root["B_id"]))

# 2. The slot layout GREW; it was not rebuilt.  z is appended, and every
#    position version 1 allocated keeps the offset it had, which is what lets
#    the class stay the same class.  (B carries its own merged layout, so z
#    sits after y for a B and right after x for an A.)
assert A.___pySlotLayout___() == ["x", "z"]
assert B.___pySlotLayout___() == ["x", "y", "z"]
assert B.___pySlotLayout___()[:2] == gemdb.root["B_layout"]
print("v2: A slot layout = %r" % (A.___pySlotLayout___(),))
print("v2: B slot layout = %r  (z appended, x and y unmoved)"
      % (B.___pySlotLayout___(),))

# 3. The data version 1 wrote is untouched.
assert (b.x, b.y) == (1, 2)
print("v2: b.x = %r, b.y = %r    (unchanged)" % (b.x, b.y))
print("v2: b.__dict__ = %r  (still only what v1 stored)" % (b.__dict__,))

# 4. The object answers to the new schema anyway.  b was allocated under the
#    two-slot layout, so it is SHORTER than the class now is; the accessor's
#    bounds guard reads that as "absent", and the lookup falls through to the
#    class-level default.  The new method -- which did not exist when b was
#    created -- runs against it.
assert b.z == 0
assert b.total() == 1
print("v2: b.z = %r               (new attribute, from A's default)" % (b.z,))
print("v2: b.total() = %r         (method added by this version)" % (b.total(),))

# 5. And it is writable like any other attribute: the assignment grows this
#    instance's indexed part from 2 slots to 3, in place.  No ALTER TABLE, no
#    migration script, no versioned record format -- just an assignment.
b.z = 99
gemdb.commit()
assert b.z == 99 and b.total() == 100
print("v2: after b.z = 99 -> b.__dict__ = %r, b.total() = %r"
      % (b.__dict__, b.total()))

# 6. A brand-new instance gets all three from the start.
b2 = B(10, 20, z=30)
print("v2: fresh B(10, 20, z=30).__dict__ = %r" % (b2.__dict__,))
assert type(b2) is type(b), "a new instance must share the persisted one's class"
print("v2: new instance shares b's class -> True")
