"""refactor_helper v1: two attributes assigned in __init__."""
import gemdb
import gemdb.schema

class Widget:
    def __init__(self):
        self.width = 1
        self.height = 2

w = Widget()
gemdb.root[__name__ + ":w"] = w
gemdb.commit()
assert [r["name"] for r in gemdb.schema.layout(Widget)] == ["width", "height"]
print("v1: layout =", [r["name"] for r in gemdb.schema.layout(Widget)], " vars(w) =", vars(w))
