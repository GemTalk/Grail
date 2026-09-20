"""dual_home v2: Point PROMOTES x to a position; Q RETIRES x and a caller stores it.

Point: the old dynamic 1 still reads (the position is empty, the loader falls
through).  Storing 2 writes the position and leaves the dynamic 1 in place;
vars() now disagrees with p.x, and `del p.x` clears the position only, so the
1 comes back.  CPython raises AttributeError after the del.

Q: x is retired, and a foreign `q.x = 99` goes to per-object storage while
the position silently keeps the v1 10.
"""
import gemdb

class Point:
    def __init__(self):
        self.x = 0

class Q:
    def __init__(self):
        self.y = 20

p = gemdb.root[__name__ + ":p"]
print("v2 Point: layout =", Point.___pySlotLayout___(), " p.x =", p.x, "(the old per-object value)")
p.x = 2
print("v2 Point: after p.x = 2: p.x =", p.x, " but vars(p) =", vars(p), "  <-- DEFECT: two homes")
del p.x
print("v2 Point: after del p.x: hasattr =", hasattr(p, "x"), " p.x =", getattr(p, "x", "AttributeError"),
      "  <-- DEFECT: CPython raises AttributeError")

q = gemdb.root[__name__ + ":q"]
q.x = 99
print("v2 Q: layout =", Q.___pySlotLayout___(), " after q.x = 99: q.x =", q.x, " vars(q) =", vars(q))
gemdb.commit()
