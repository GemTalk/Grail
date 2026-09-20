"""remove_and_readd v3: `balance` is assigned again.

The tombstone revives IN PLACE: balance gets its old position back, and with
it the value the v1 instance has been carrying all along.  Nothing was lost,
because nothing was compacted.
"""
import gemdb

class Account:
    def __init__(self):
        self.balance = 0
        self.owner = "ann"

acct = gemdb.root[__name__ + ":acct"]
assert Account.___pySlotLayout___() == ["balance", "owner"]
assert acct.balance == 10, "the v1 value is back"
assert vars(acct) == {"balance": 10, "owner": "ann"}
gemdb.commit()
print("v3: layout =", Account.___pySlotLayout___(), " acct.balance =", acct.balance,
      " (the v1 value, back through the revived position)")
