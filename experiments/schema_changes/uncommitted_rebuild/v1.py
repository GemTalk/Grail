"""uncommitted_rebuild v1: one attribute, one committed instance."""
import gemdb

class Note:
    def __init__(self):
        self.text = "hi"

n = Note()
gemdb.root[__name__ + ":n"] = n
gemdb.commit()
assert Note.___pySlotLayout___() == ["text"]
print("v1: layout =", Note.___pySlotLayout___())
