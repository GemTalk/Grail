"""uncommitted_rebuild v1: one attribute, one committed instance."""
import gemdb
import gemdb.schema

class Note:
    def __init__(self):
        self.text = "hi"

n = Note()
gemdb.root[__name__ + ":n"] = n
gemdb.commit()
assert [r["name"] for r in gemdb.schema.layout(Note)] == ["text"]
print("v1: layout =", [r["name"] for r in gemdb.schema.layout(Note)])
