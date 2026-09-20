"""move_in_hierarchy v2: a2 moves down from Base into Derived.

Base retires a2 (it assigns it no more), but Derived assigns it itself, so
Derived keeps the name live at the same position and the old instance reads
all three values unchanged.  A subclass never loses a position its parent
gives up.
"""
import gemdb

class Base:
    def __init__(self):
        self.a1 = 1

class Derived(Base):
    def __init__(self):
        super().__init__()
        self.a2 = 2
        self.d1 = 7

d = gemdb.root[__name__ + ":d"]
assert Base.___pySlotLayout___() == ["a1", "~a2"]
assert Derived.___pySlotLayout___() == ["a1", "a2", "d1"]
assert (d.a1, d.a2, d.d1) == (1, 2, 7)
gemdb.commit()
print("v2: Base =", Base.___pySlotLayout___(), " Derived =", Derived.___pySlotLayout___(),
      " (d.a1, d.a2, d.d1) =", (d.a1, d.a2, d.d1))
