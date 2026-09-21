"""refactor_helper v2: a behaviour-preserving refactor, and the schema agrees.

`height` is now assigned by a module-level helper through a parameter named
`obj`, not through `self` in a method of Widget.  Grail's inference sees only
`self.<name> = ...` inside the class's own methods, so Widget no longer
ASSIGNS height -- but the name survives in the layout, the old instance
reads its 2, and the helper's store lands in the same position.  Same
behaviour, same schema.
"""
import gemdb
import gemdb.schema

def _size(obj):
    obj.height = 2

class Widget:
    def __init__(self):
        self.width = 1
        _size(self)

w = gemdb.root[__name__ + ":w"]
assert [r["name"] for r in gemdb.schema.layout(Widget)] == ["width", "height"]
assert w.height == 2
w2 = Widget()
assert vars(w2) == {"width": 1, "height": 2}
gemdb.commit()
print("v2: layout =", [r["name"] for r in gemdb.schema.layout(Widget)], " old w.height =", w.height,
      " new Widget(): vars =", vars(w2))
