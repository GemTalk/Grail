"""compact v3: `raw` comes back AFTER the drop and compaction.

There is no hole to revive, so raw is a new position appended after
value, and the old instance's old 1 is gone -- the drop freed it.
"""
import gemdb
import gemdb.schema


class Reading:
    def __init__(self):
        self.raw = 1
        self.value = 2


r = gemdb.root[__name__ + ":r"]
assert [row["name"] for row in gemdb.schema.layout(Reading)] == ["value", "raw"]
assert not hasattr(r, "raw"), "the drop freed the old value"
assert r.value == 2
print("v3: layout =", [row["name"] for row in gemdb.schema.layout(Reading)],
      " r.raw ->", getattr(r, "raw", "AttributeError"), " (gone: the drop freed it)")
