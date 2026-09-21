"""renamed_declaration v1: a Contact with one phone, singular."""
import gemdb
import gemdb.schema

class Contact:
    def __init__(self, phone):
        self.phone = phone

c = Contact("555-1234")
gemdb.root[__name__ + ":c"] = c
gemdb.commit()
assert [r["name"] for r in gemdb.schema.layout(Contact)] == ["phone"]
print("v1: layout =", [r["name"] for r in gemdb.schema.layout(Contact)], " vars(c) =", vars(c))
