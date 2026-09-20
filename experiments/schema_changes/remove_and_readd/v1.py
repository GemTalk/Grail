"""remove_and_readd v1: a class with two attributes; commit one instance."""
import gemdb

class Account:
    def __init__(self):
        self.balance = 10
        self.owner = "ann"

acct = Account()
gemdb.root[__name__ + ":acct"] = acct
gemdb.commit()
assert Account.___pySlotLayout___() == ["balance", "owner"]
print("v1: layout =", Account.___pySlotLayout___(), " vars(acct) =", vars(acct))
