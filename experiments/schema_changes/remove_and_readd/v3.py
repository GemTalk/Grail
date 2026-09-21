"""remove_and_readd v3: `balance` is assigned again.

The layout does not change -- the name never left it -- and the old
instance's 10 was readable the whole time.  A removal followed by a re-add
is a no-op for the data, at any distance in time.
"""
import gemdb

class Account:
    def __init__(self):
        self.balance = 0
        self.owner = "ann"

acct = gemdb.root[__name__ + ":acct"]
assert Account.___pySlotLayout___() == ["balance", "owner"]
assert acct.balance == 10
assert Account().balance == 0
gemdb.commit()
print("v3: layout =", Account.___pySlotLayout___(), " acct.balance =", acct.balance,
      " Account().balance =", Account().balance)
