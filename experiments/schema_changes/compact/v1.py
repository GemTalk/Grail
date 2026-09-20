"""compact v1: two attributes, one committed instance."""
import gemdb

class Reading:
    def __init__(self):
        self.raw = 1
        self.value = 2

r = Reading()
gemdb.root[__name__ + ":r"] = r
gemdb.commit()
assert Reading.___pySlotLayout___() == ["raw", "value"]
print("v1: layout =", Reading.___pySlotLayout___(), " vars(r) =", vars(r))
