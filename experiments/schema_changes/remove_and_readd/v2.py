"""remove_and_readd v2: the edit drops `balance`.

No method of Account assigns self.balance any more, so the import RETIRES the
name: its position becomes the tombstone '~balance'.  The old instance still
holds 10 at that position, but the class no longer knows the name, so from
Python the attribute is simply absent.
"""
import gemdb

class Account:
    def __init__(self):
        self.owner = "ann"

acct = gemdb.root[__name__ + ":acct"]
assert Account.___pySlotLayout___() == ["~balance", "owner"]
assert not hasattr(acct, "balance")
assert vars(acct) == {"owner": "ann"}
gemdb.commit()          # the retirement is part of THIS transaction -- commit it
print("v2: layout =", Account.___pySlotLayout___(), " hasattr(acct,'balance') =",
      hasattr(acct, "balance"), " vars(acct) =", vars(acct))
