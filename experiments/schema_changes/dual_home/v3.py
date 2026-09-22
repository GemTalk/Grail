"""dual_home v3: Q assigns x again.  Nothing changes: the layout never
retired x, so the 99 the caller stored is what q.x answers, and del removes
it for good."""
import gemdb
import gemdb.schema

class Point:
    def __init__(self):
        self.x = 0

class Q:
    def __init__(self):
        self.x = 11
        self.y = 20

q = gemdb.root[__name__ + ":q"]
assert [r["name"] for r in gemdb.schema.layout(Q)] == ["x", "y"]
assert q.x == 99 and vars(q) == {"x": 99, "y": 20}
del q.x
assert not hasattr(q, "x")
assert Q().x == 11
print("v3 Q: layout =", [r["name"] for r in gemdb.schema.layout(Q)], " q.x was 99; after del q.x: hasattr =", hasattr(q, "x"))
