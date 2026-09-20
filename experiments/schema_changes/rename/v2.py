"""rename v2: the naive rename, phone -> phones.

To Grail this is a REMOVE plus an ADD: phone is retired, phones is appended.
The v1 instance's number is still in the object, at the retired position, but
there is no way to reach it from Python -- not through the attribute, not
through __dict__, not through dir().
"""
import gemdb

class Contact:
    def __init__(self, phones):
        self.phones = list(phones)

c = gemdb.root[__name__ + ":c"]
assert Contact.___pySlotLayout___() == ["~phone", "phones"]
assert not hasattr(c, "phone") and not hasattr(c, "phones")
assert vars(c) == {}
gemdb.commit()
print("v2: layout =", Contact.___pySlotLayout___(), " c.phone ->",
      getattr(c, "phone", "AttributeError"), " c.phones ->",
      getattr(c, "phones", "AttributeError"), " vars(c) =", vars(c))
