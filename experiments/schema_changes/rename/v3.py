"""rename v3: the recovery, with today's tools.

A tombstone revives when a method assigns the name again, so the old value
can be brought back by keeping ONE assignment to `phone` somewhere in a
method -- here, the property that migrates a v1 instance on first read.  This
works, but the `self.phone = None` line is load-bearing and nothing says so;
the review proposes a declared rename instead.
"""
import gemdb

class Contact:
    phone = None            # class default for an instance that never had one
    _phones = None

    def __init__(self, phones):
        self._phones = list(phones)

    @property
    def phones(self):
        if self.phone is not None:       # a v1 instance: one number, not yet migrated
            self._phones = [self.phone]
            self.phone = None            # <- this assignment keeps 'phone' in the layout
        return self._phones if self._phones is not None else []

c = gemdb.root[__name__ + ":c"]
assert Contact.___pySlotLayout___() == ["phone", "~phones", "_phones"]
assert vars(c) == {"phone": "555-1234"}, "revived: the v1 value is visible again"
assert c.phones == ["555-1234"]
assert vars(c) == {"_phones": ["555-1234"], "phone": None}
gemdb.commit()
print("v3: layout =", Contact.___pySlotLayout___(), " c.phones =", c.phones,
      " vars(c) =", vars(c))
