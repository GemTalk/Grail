"""dual_home v3: Q assigns x again, so the tombstone revives.

The revived position wins over the per-object 99: q.x answers the v1 10,
vars() shows the 99, and `del q.x` clears the position so the 99 resurfaces.
"""
import gemdb

class Point:
    def __init__(self):
        self.x = 0

class Q:
    def __init__(self):
        self.x = 11
        self.y = 20

q = gemdb.root[__name__ + ":q"]
print("v3 Q: layout =", Q.___pySlotLayout___(), " q.x =", q.x, " vars(q) =", vars(q),
      "  <-- DEFECT: the read and the dict disagree")
del q.x
print("v3 Q: after del q.x: hasattr =", hasattr(q, "x"), " q.x =", getattr(q, "x", "AttributeError"),
      "  <-- DEFECT: the 99 resurfaces")
