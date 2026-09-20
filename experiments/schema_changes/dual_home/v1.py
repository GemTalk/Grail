"""dual_home v1: two instances that will each end up with a value in TWO homes.

`p.x` is assigned from OUTSIDE the class, so it is a per-object (dynamic)
attribute.  `q.x` and `q.y` are ordinary positions.
"""
import gemdb

class Point:
    def __init__(self):
        pass

class Q:
    def __init__(self):
        self.x = 10
        self.y = 20

p = Point()
p.x = 1
q = Q()
gemdb.root[__name__ + ":p"] = p
gemdb.root[__name__ + ":q"] = q
gemdb.commit()
print("v1: vars(p) =", vars(p), "(per-object)   Q layout =", Q.___pySlotLayout___())
