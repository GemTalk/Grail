"""move_in_hierarchy v2: a2 moves down from Base into Derived.

Base stops assigning a2 (it survives in Base's layout, unassigned) and
Derived assigns it at the same position it always had, so the old instance
reads all three values unchanged and no layout changes at all.
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
assert Base.___pySlotLayout___() == ["a1", "a2"]
assert Derived.___pySlotLayout___() == ["a1", "a2", "d1"]
assert (d.a1, d.a2, d.d1) == (1, 2, 7)
assert not hasattr(Base(), "a2")
gemdb.commit()
print("v2: Base =", Base.___pySlotLayout___(), " Derived =", Derived.___pySlotLayout___(),
      " (d.a1, d.a2, d.d1) =", (d.a1, d.a2, d.d1))
