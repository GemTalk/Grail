"""schema_demo, version 1 -- the module BEFORE the schema change.

Run this first, in its own session:

    PYTHONPATH=experiments/schema/v1 ./grail -c 'import schema_demo'

It defines the classes, makes one instance of B, fills in both attributes,
and commits.  Nothing here is persistence-aware except the two lines that
put the object in `gemdb.root`: there is no schema, no table, no mapping.
"""

import gemdb


class A:
    def __init__(self, x):
        self.x = x


class B(A):
    def __init__(self, x, y):
        super().__init__(x)
        self.y = y


b = B(1, 2)

gemdb.root["b"] = b
# Recorded so version 2 can prove it is looking at the SAME class object and
# not at a look-alike minted by the second session.  In Grail, id() is
# GemStone's identityHash -- the object's OOP, unshifted -- and it is stable
# for the life of the object.
gemdb.root["B_id"] = id(B)
gemdb.root["A_id"] = id(A)
# The first two positions, so version 2 can show that its edit APPENDED.
gemdb.root["B_layout"] = B.___pySlotLayout___()[:2]
gemdb.commit()

print("v1: committed B(x=%r, y=%r)" % (b.x, b.y))
print("v1: id(A) = %d, id(B) = %d" % (id(A), id(B)))
print("v1: b.__dict__ = %r" % (b.__dict__,))

# x and y are POSITIONS in the instance's indexed part, not dynamic instance
# variables: since 2026-09-16 a user class's inferred attributes are slots by
# default (GRAIL_INFERRED_SLOTS=0 turns that off).  The layout is what version
# 2's edit has to extend without disturbing.
print("v1: A slot layout = %r" % (A.___pySlotLayout___(),))
print("v1: B slot layout = %r" % (B.___pySlotLayout___(),))
if any(n.startswith("~") for n in B.___pySlotLayout___()):
    print("v1: (a '~name' is a TOMBSTONE: this extent has already run v2, and")
    print("v1:  the retired position is kept so a re-added z regains its offset)")
