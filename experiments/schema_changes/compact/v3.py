"""compact v3: `raw` comes back AFTER the compaction.

There is no tombstone to revive, so raw is a new position appended after
value, and the old instance's old 1 is gone -- the compaction freed it.
"""
import gemdb

class Reading:
    def __init__(self):
        self.raw = 1
        self.value = 2

r = gemdb.root[__name__ + ":r"]
assert Reading.___pySlotLayout___() == ["value", "raw"]
assert not hasattr(r, "raw"), "compaction freed the old value"
assert r.value == 2
print("v3: layout =", Reading.___pySlotLayout___(), " r.raw ->",
      getattr(r, "raw", "AttributeError"), " (gone: compaction freed it)")
