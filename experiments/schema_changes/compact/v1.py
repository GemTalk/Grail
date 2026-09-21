"""compact v1: two attributes, one committed instance."""
import gemdb
import gemdb.schema

class Reading:
    def __init__(self):
        self.raw = 1
        self.value = 2

r = Reading()
gemdb.root[__name__ + ":r"] = r
gemdb.commit()
assert [r["name"] for r in gemdb.schema.layout(Reading)] == ["raw", "value"]
print("v1: layout =", [r["name"] for r in gemdb.schema.layout(Reading)], " vars(r) =", vars(r))
