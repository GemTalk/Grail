# Regression fixture: a method-local class capturing the enclosing method's
# ``self'' -- a name that is also a Smalltalk pseudo-variable.
#
# These were refused by IR as `NameAst:reservedIdentifier' -- 30 on the suite
# manifest, spread across ten modules, almost all of them the shape
# ``test_bytes'' and ``datetimetester'' are full of:
#
#     class B1(self.basetype):
#         def __new__(cls, value):
#             me = self.basetype.__new__(cls, value)
#
# where ``self'' inside __new__ is NOT that method's receiver but a free
# variable captured from the enclosing TEST METHOD.
#
# THE REFUSAL WAS WIDER THAN THE TEXT'S OWN HANDLING.  ___irNonLocalLoadKind___:
# refused every load of a Smalltalk pseudo-variable name outright, before it
# reached the class-cell branch.  But the text does not: a reserved-name read
# that goes through the class cell gets the ORDINARY cell read,
# ``(self ___classCell___: #'___cell_self___')'', which is name-agnostic.
# ___readsThroughClassCell___'s own comment says so -- it records that its
# second caller is the reserved-name transport rename, which "must stand down
# for exactly the same reads".  The IR guard simply had not been given the same
# exception.
#
# THE NESTING IS LOAD-BEARING.  The capture must cross a CLASS boundary: the
# method string-compiles onto the inner class with no lexical link to the
# enclosing method's temps, which is what makes the read go through the cell at
# all.  A plain nested function capturing ``self'' reaches the temp directly and
# never refused.
#
# Run this file under CPython and every value must be True.

RESULTS = {}


class Harness:
    def __init__(self, tag, basetype):
        self.tag = tag
        self.basetype = basetype

    def captured_in_new(self):
        """test_bytes.B1 / datetimetester.DateSubclass: __new__ reaching the
        enclosing method's self."""
        outer_tag = []

        class Inner(self.basetype):
            def __new__(cls, value):
                obj = self.basetype.__new__(cls, value)
                outer_tag.append(self.tag)
                return obj

        made = Inner("xy")
        return made, outer_tag

    def captured_with_renamed_receiver(self):
        """test_bytes.B2: the inner method's OWN receiver is called ``me'', so
        ``self'' in its body is unambiguously the captured one."""

        class Inner:
            def __init__(me, v):
                me.v = v
                me.outer = self.tag

            def describe(me):
                return "%s/%s" % (me.outer, me.v)

        return Inner(3).describe()

    def captured_in_dunder_compare(self):
        """test_richcmp.Misb.__le__: a captured self inside an operator dunder."""
        calls = []

        class Inner:
            def __init__(me, v):
                me.v = v

            def __le__(me, other):
                calls.append(self.tag)
                return me.v <= other.v

        a, b = Inner(1), Inner(2)
        return (a <= b), (b <= a), calls

    def captured_alongside_own_receiver(self):
        """Both receivers live at once: the inner method's own ``self'' wins
        for its own reads, and the captured one is still reachable because the
        inner class renames nothing."""
        seen = []

        class Inner:
            def __init__(inner_self, v):
                inner_self.v = v

            def both(inner_self):
                seen.append(self.tag)
                return inner_self.v * 2

        return Inner(21).both(), seen


_h = Harness("H", str)

_made, _tag = _h.captured_in_new()
RESULTS["new_builds_subclass"] = (_made == "xy" and isinstance(_made, str))
RESULTS["new_kept_subclass"] = (type(_made) is not str)
RESULTS["new_saw_captured_self"] = (_tag == ["H"])

RESULTS["renamed_receiver"] = (_h.captured_with_renamed_receiver() == "H/3")

_le1, _le2, _calls = _h.captured_in_dunder_compare()
RESULTS["dunder_compare"] = (_le1 is True and _le2 is False)
RESULTS["dunder_saw_captured_self"] = (_calls == ["H", "H"])

_both, _seen = _h.captured_alongside_own_receiver()
RESULTS["own_and_captured_receiver"] = (_both == 42 and _seen == ["H"])

# A SECOND Harness must not see the first one's capture: the cell is stored per
# class DEFINITION, and the class is rebuilt on every call of the enclosing
# method.
RESULTS["capture_is_per_call"] = (
    Harness("OTHER", str).captured_with_renamed_receiver() == "OTHER/3")
