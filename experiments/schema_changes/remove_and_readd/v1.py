"""remove_and_readd v1: a class with two attributes; commit one instance."""
import gemdb
import gemdb.schema

class Account:
    def __init__(self):
        self.balance = 10
        self.owner = "ann"

acct = Account()
gemdb.root[__name__ + ":acct"] = acct
gemdb.commit()
assert [r["name"] for r in gemdb.schema.layout(Account)] == ["balance", "owner"]
print("v1: layout =", [r["name"] for r in gemdb.schema.layout(Account)], " vars(acct) =", vars(acct))
