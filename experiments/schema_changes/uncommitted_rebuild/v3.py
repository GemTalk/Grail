"""uncommitted_rebuild v3: v1's source again, in a new session.

Had v2's rebuild been committed, this import would find `body` in the layout
and retire it: ['text', '~body'].  It finds only ['text'] -- the repository
never saw v2's session, so its rebuild left no trace.  A schema change is an
ordinary part of the transaction that imported it: commit it or lose it.
"""
import gemdb
import gemdb.schema

class Note:
    def __init__(self):
        self.text = "hi"

n = gemdb.root[__name__ + ":n"]
assert [r["name"] for r in gemdb.schema.layout(Note)] == ["text"], "no '~body': v2's uncommitted rebuild left no trace"
assert n.text == "hi"
print("v3: layout =", [r["name"] for r in gemdb.schema.layout(Note)], " (no '~body': v2's uncommitted rebuild left no trace)")
