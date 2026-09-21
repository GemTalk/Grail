"""move_in_hierarchy v2: a2 moves down from Base into Derived.

Base stops assigning a2 (it survives in Base's layout, unassigned) and
Derived assigns it at the same position it always had, so the old instance
reads all three values unchanged and no layout changes at all.
"""
import gemdb
import gemdb.schema

class Base:
    def __init__(self):
        self.a1 = 1

class Derived(Base):
    def __init__(self):
        super().__init__()
        self.a2 = 2
        self.d1 = 7

d = gemdb.root[__name__ + ":d"]
assert [r["name"] for r in gemdb.schema.layout(Base)] == ["a1", "a2"]
assert [r["name"] for r in gemdb.schema.layout(Derived)] == ["a1", "a2", "d1"]
assert (d.a1, d.a2, d.d1) == (1, 2, 7)
assert not hasattr(Base(), "a2")
gemdb.commit()
print("v2: Base =", [r["name"] for r in gemdb.schema.layout(Base)], " Derived =", [r["name"] for r in gemdb.schema.layout(Derived)],
      " (d.a1, d.a2, d.d1) =", (d.a1, d.a2, d.d1))
