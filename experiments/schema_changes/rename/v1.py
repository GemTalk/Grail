"""rename v1: a Contact with one phone."""
import gemdb

class Contact:
    def __init__(self, phone):
        self.phone = phone

c = Contact("555-1234")
gemdb.root[__name__ + ":c"] = c
gemdb.commit()
assert Contact.___pySlotLayout___() == ["phone"]
print("v1: layout =", Contact.___pySlotLayout___(), " vars(c) =", vars(c))
