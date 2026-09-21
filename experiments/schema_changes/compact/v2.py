"""compact v2: stop assigning `raw`, then DROP it, then COMPACT.

Two explicit steps, both developer-invoked, never an import side effect:

* the drop nils `raw` on every instance of Reading and its subclasses and
  turns its position into a hole ('~raw' in the layout); the name is then
  unknown to the class;
* the compaction rewrites the layout without holes and moves every
  instance's values to the new positions.

Both scan the repository, which needs a clean transaction: commit, drop,
commit, compact, commit.  The drop is refused while a method still assigns
the name, so the assignment goes first.
"""
import gemdb

class Reading:
    def __init__(self):
        self.value = 2

r = gemdb.root[__name__ + ":r"]
assert Reading.___pySlotLayout___() == ["raw", "value"], "the edit alone changes nothing"
assert r.raw == 1
gemdb.commit()                                       # clean transaction first
classes, instances = Reading.___grailDropSlot___("raw")
gemdb.commit()
assert (classes, instances) == (1, 1)
assert Reading.___pySlotLayout___() == ["~raw", "value"]
assert not hasattr(r, "raw") and vars(r) == {"value": 2}
print("v2: dropped raw ->", classes, "class,", instances, "instance; layout =",
      Reading.___pySlotLayout___())
classes, instances = Reading.___grailCompactSlots___()
gemdb.commit()
assert (classes, instances) == (1, 1)
assert Reading.___pySlotLayout___() == ["value"]
assert vars(r) == {"value": 2}
print("v2: compacted ->", classes, "class,", instances, "instance; layout =",
      Reading.___pySlotLayout___(), " vars(r) =", vars(r))
