"""renamed_declaration v2: the rename declared in the source, phone -> phones.

The whole migration is the one line `__renamed__ = {"phone": "phones"}`.
The import relabels the position in place -- the value never moves, no
instance is read, no repository scan happens -- so the contact that was
stored under `phone` answers `c.phones` the moment the import returns.

Compare `rename/v2.py`, the same edit WITHOUT the declaration: there
`phones` is appended as a second, empty position and the data stays
behind under `phone` until an explicit `gemdb.schema.rename` moves it.
"""
import gemdb
import gemdb.schema

class Contact:
    __renamed__ = {"phone": "phones"}

    def __init__(self, phones):
        self.phones = list(phones)

c = gemdb.root[__name__ + ":c"]
assert [r["name"] for r in gemdb.schema.layout(Contact)] == ["phones"], "one position, renamed"
assert [r["position"] for r in gemdb.schema.layout(Contact)] == [1], "the same position as v1's phone"
assert c.phones == "555-1234", "the v1 value, under the new name, with nothing moved"
assert not hasattr(c, "phone")
assert vars(c) == {"phones": "555-1234"}
gemdb.commit()
print("v2: layout =", [r["name"] for r in gemdb.schema.layout(Contact)], " c.phones =", c.phones,
      " vars(c) =", vars(c))
