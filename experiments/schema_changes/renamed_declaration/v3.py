"""renamed_declaration v3: the declaration is idempotent, so it can stay.

Re-importing v2 unchanged finds no `phone` in the layout and does
nothing, which is what lets one source file deploy to a repository that
has already been migrated, one that has not, and a brand-new one.  Here
the declaration is simply dropped once every repository has caught up.
"""
import gemdb
import gemdb.schema

class Contact:
    def __init__(self, phones):
        self.phones = list(phones)

c = gemdb.root[__name__ + ":c"]
assert [r["name"] for r in gemdb.schema.layout(Contact)] == ["phones"], "still one position"
assert c.phones == "555-1234"
print("v3: layout =", [r["name"] for r in gemdb.schema.layout(Contact)], " c.phones =", c.phones)
