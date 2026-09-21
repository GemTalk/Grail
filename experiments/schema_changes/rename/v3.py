"""rename v3: finish the rename, and the old values move across.

Version 2 already shipped the code that assigns `phones`, so the import
appended `phones` as an empty position while `phone` kept the data.  The
rename therefore MOVES every contact's value from one position to the
other and leaves `phone` a hole.  It refuses if any instance has a value
under both names rather than silently choosing one.

Renaming BEFORE shipping that code would have been free: with no
`phones` position yet, the same call relabels the position in place and
touches no instance at all.  That is the cheaper order when there are
many instances.
"""
import gemdb
import gemdb.schema


class Contact:
    def __init__(self, phones):
        self.phones = list(phones)


c = gemdb.root[__name__ + ":c"]
before = [(row["name"], row["kind"]) for row in gemdb.schema.layout(Contact)]
assert before == [("phone", "unassigned"), ("phones", "assigned")]
assert c.phone == "555-1234" and not hasattr(c, "phones")

gemdb.commit()
res = gemdb.schema.rename(Contact, "phone", "phones")
assert res == {"classes": 1, "instances": 1}, "the deployed-first path moves the value"
after = [(row["name"], row["kind"]) for row in gemdb.schema.layout(Contact)]
assert after == [("phone", "hole"), ("phones", "assigned")]
assert c.phones == "555-1234", "the v1 value, now under the new name"
assert not hasattr(c, "phone")
print("v3: rename ->", res, " layout =", after, " c.phones =", c.phones)
