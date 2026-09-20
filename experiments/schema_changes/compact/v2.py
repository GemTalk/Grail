"""compact v2: drop `raw`, then COMPACT.

Compaction is the one explicit, lossy step: it rewrites the layout without
tombstones, moves every instance's values to the new positions, and frees the
retired position for good.  It scans the repository, which needs a clean
transaction, so: commit, compact, commit.
"""
import gemdb

class Reading:
    def __init__(self):
        self.value = 2

r = gemdb.root[__name__ + ":r"]
assert Reading.___pySlotLayout___() == ["~raw", "value"]
gemdb.commit()                                       # clean transaction first
classes, instances = Reading.___grailCompactSlots___()
gemdb.commit()
assert (classes, instances) == (1, 1)
assert Reading.___pySlotLayout___() == ["value"]
assert vars(r) == {"value": 2}
print("v2: compacted", classes, "class,", instances, "instance; layout =",
      Reading.___pySlotLayout___(), " vars(r) =", vars(r))
