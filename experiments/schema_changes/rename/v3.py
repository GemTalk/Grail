"""rename v3: migrate lazily, in plain Python.

Because the old value stayed readable, the migration is an ordinary
property: on first read, an instance that still has `phone` gets its list
built from it and the old attribute deleted.  Nothing here is load-bearing
for Grail; it is the code you would write against any object store.  (The
declared rename, `__renamed__`, is cut 3 of docs/Schema_Evolution_Design.md
and relabels the position instead.)
"""
import gemdb

class Contact:
    _phones = None

    def __init__(self, phones):
        self._phones = list(phones)

    @property
    def phones(self):
        old = getattr(self, "phone", None)
        if old is not None:                  # a v1 instance: one number, not yet migrated
            self._phones = [old]
            del self.phone
        return self._phones if self._phones is not None else []

c = gemdb.root[__name__ + ":c"]
assert Contact.___pySlotLayout___() == ["phone", "phones", "_phones"]
assert vars(c) == {"phone": "555-1234"}
assert c.phones == ["555-1234"]
assert vars(c) == {"_phones": ["555-1234"]}, "migrated in place: phone deleted, _phones set"
gemdb.commit()
print("v3: layout =", Contact.___pySlotLayout___(), " c.phones =", c.phones,
      " vars(c) =", vars(c))
