"""uncommitted_rebuild v2: an edit that is imported but NOT committed.

The import rebuilds the class in this session -- body is appended -- but the
session ends without a commit, so the rebuilt layout is rolled back with
everything else.  A schema change is an ordinary part of the transaction
that imported it.
"""
import gemdb
import gemdb.schema

class Note:
    def __init__(self):
        self.body = "hi"

assert [r["name"] for r in gemdb.schema.layout(Note)] == ["text", "body"]
print("v2: layout in this session =", [r["name"] for r in gemdb.schema.layout(Note)], " -- and no commit")
