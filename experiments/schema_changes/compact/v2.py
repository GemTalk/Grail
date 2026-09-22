"""compact v2: stop assigning `raw`, then DROP it, then COMPACT.

Two explicit steps, both run by name through `gemdb.schema`, never an
import side effect:

* the drop nils `raw` on every instance of Reading and its subclasses and
  turns its position into a hole; the name is then unknown to the class;
* the compaction rewrites the layout without holes and moves every
  instance's values to the new positions.

Both scan the repository, which needs a clean transaction, and both
commit their own work.  The drop is refused while a method still assigns
the name, so the assignment goes first.
"""
import gemdb
import gemdb.schema


class Reading:
    def __init__(self):
        self.value = 2


r = gemdb.root[__name__ + ":r"]
kinds = {row["name"]: row["kind"] for row in gemdb.schema.layout(Reading)}
assert kinds == {"raw": "unassigned", "value": "assigned"}, "the edit alone changes nothing"
assert r.raw == 1
print("v2: layout =", kinds)

gemdb.commit()                                       # clean transaction first
res = gemdb.schema.drop(Reading, "raw")
assert res == {"classes": 1, "instances": 1}
kinds = {row["name"]: row["kind"] for row in gemdb.schema.layout(Reading)}
assert kinds == {"raw": "hole", "value": "assigned"}
assert not hasattr(r, "raw") and vars(r) == {"value": 2}
print("v2: dropped raw ->", res, " layout =", kinds)

res = gemdb.schema.compact(Reading)
assert res == {"classes": 1, "instances": 1}
assert [row["name"] for row in gemdb.schema.layout(Reading)] == ["value"]
assert vars(r) == {"value": 2}
print("v2: compacted ->", res, " layout =",
      [row["name"] for row in gemdb.schema.layout(Reading)], " vars(r) =", vars(r))
