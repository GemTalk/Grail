"""refactor_helper v1: two attributes assigned in __init__."""
import gemdb

class Widget:
    def __init__(self):
        self.width = 1
        self.height = 2

w = Widget()
gemdb.root[__name__ + ":w"] = w
gemdb.commit()
assert Widget.___pySlotLayout___() == ["width", "height"]
print("v1: layout =", Widget.___pySlotLayout___(), " vars(w) =", vars(w))
