"""rename v2: the naive rename, phone -> phones.

To Grail this is an ADD (phones) beside a name the body stopped assigning
(phone).  The old contact still answers c.phone, and vars() still lists it,
so nothing is lost and nothing is hidden -- but nothing migrated either:
c.phones raises, because this instance never had one.
"""
import gemdb

class Contact:
    def __init__(self, phones):
        self.phones = list(phones)

c = gemdb.root[__name__ + ":c"]
assert Contact.___pySlotLayout___() == ["phone", "phones"]
assert c.phone == "555-1234"
assert not hasattr(c, "phones")
assert vars(c) == {"phone": "555-1234"}
gemdb.commit()
print("v2: layout =", Contact.___pySlotLayout___(), " c.phone =", c.phone,
      " c.phones ->", getattr(c, "phones", "AttributeError"), " vars(c) =", vars(c))
