"""remove_and_readd v2: the edit drops the assignment of `balance`.

Nothing is retired.  No method of Account assigns self.balance any more, but
the name keeps its position, and the old instance keeps its 10: readable,
listed by vars(), writable from outside.  The class merely stopped assigning
it.  Removing the values is a separate, explicit step (see compact/).
"""
import gemdb

class Account:
    def __init__(self):
        self.owner = "ann"

acct = gemdb.root[__name__ + ":acct"]
assert Account.___pySlotLayout___() == ["balance", "owner"], "unchanged"
assert acct.balance == 10, "the value the body stopped assigning is still there"
assert vars(acct) == {"balance": 10, "owner": "ann"}
new = Account()
assert not hasattr(new, "balance"), "a new instance never had it"
gemdb.commit()
print("v2: layout =", Account.___pySlotLayout___(), " acct.balance =", acct.balance,
      " vars(acct) =", vars(acct), " new Account() has balance?", hasattr(new, "balance"))
