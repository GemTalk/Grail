"""dual_home v2: Point PROMOTES x to a position; a caller stores Q's unassigned x.

Point: the old per-object 1 still reads.  Storing 2 moves x into its
position and drops the per-object copy, so vars() and p.x agree, and after
`del p.x` the name is gone -- AttributeError, as CPython.

Q: x is no longer assigned by Q but survives; a foreign `q.x = 99` writes
the position.  One name, one home.
"""
import gemdb

class Point:
    def __init__(self):
        self.x = 0

class Q:
    def __init__(self):
        self.y = 20

p = gemdb.root[__name__ + ":p"]
assert Point.___pySlotLayout___() == ["x"]
assert p.x == 1, "the old per-object value still reads"
p.x = 2
assert p.x == 2 and vars(p) == {"x": 2}, "one home: the store moved it"
del p.x
assert not hasattr(p, "x"), "gone, not uncovered"
print("v2 Point: layout =", Point.___pySlotLayout___(), " after p.x = 2: vars(p) =", {"x": 2},
      " after del p.x: hasattr =", hasattr(p, "x"))

q = gemdb.root[__name__ + ":q"]
assert Q.___pySlotLayout___() == ["x", "y"]
assert q.x == 10
q.x = 99
assert q.x == 99 and vars(q) == {"x": 99, "y": 20}
gemdb.commit()
print("v2 Q: layout =", Q.___pySlotLayout___(), " after q.x = 99: vars(q) =", vars(q))
