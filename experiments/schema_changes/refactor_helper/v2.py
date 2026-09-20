"""refactor_helper v2: a behaviour-preserving refactor that changes the schema.

`height` is now assigned by a module-level helper through a parameter named
`obj`, not through `self` in a method of Widget.  Grail's inference sees only
`self.<name> = ...` inside the class's own methods, so height is RETIRED: the
old instance's 2 is hidden, and a new Widget stores height in per-object
(dynamic) storage instead of a position.  Same behaviour, different schema.
"""
import gemdb

def _size(obj):
    obj.height = 2

class Widget:
    def __init__(self):
        self.width = 1
        _size(self)

w = gemdb.root[__name__ + ":w"]
assert Widget.___pySlotLayout___() == ["width", "~height"]
assert not hasattr(w, "height"), "hidden by a refactor that meant to change nothing"
w2 = Widget()
assert vars(w2) == {"width": 1, "height": 2}, "the new instance still works -- height is per-object now"
gemdb.commit()
print("v2: layout =", Widget.___pySlotLayout___(), " old w.height ->",
      getattr(w, "height", "AttributeError"), " new Widget(): vars =", vars(w2))
