"""move_in_hierarchy v1: Base assigns a1 and a2; Derived adds d1."""
import gemdb

class Base:
    def __init__(self):
        self.a1 = 1
        self.a2 = 2

class Derived(Base):
    def __init__(self):
        super().__init__()
        self.d1 = 7

d = Derived()
gemdb.root[__name__ + ":d"] = d
gemdb.commit()
assert Base.___pySlotLayout___() == ["a1", "a2"]
assert Derived.___pySlotLayout___() == ["a1", "a2", "d1"]
print("v1: Base =", Base.___pySlotLayout___(), " Derived =", Derived.___pySlotLayout___())
