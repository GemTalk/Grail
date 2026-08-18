"""Fixture: ``nonlocal __class__`` in a class body rebinds the CLASS CELL.

``__class__`` is not an ordinary name.  CPython's compiler gives every method an
implicit closure over one cell holding the class, and that cell is what
``__class__`` and zero-argument ``super()`` read.  A nested class body may
declare it ``nonlocal`` and write it:

    class Host:
        def m(self):
            class X:
                nonlocal __class__
                __class__ = 42

and from then on EVERY method of Host reads 42 -- the cell is shared, so this is
not a local rebinding of one name in one frame.  Grail dropped the write
entirely: the enclosing method's ``__class__'' still answered Host, in both
directions and with nothing reported.  That is the last failing assertion of
test_super's test_various___class___pathologies.

WHY IT WAS DROPPED RATHER THAN EMITTED.  Grail resolves ``__class__''
LEXICALLY -- it compiles to the class expression itself, not to a cell read --
so there is no assignable temp behind the name and ``__class__ := 42'' is a
CompileError that takes the whole enclosing method down with it.  The write now
goes to the real cell the class carries, and the READS in that class are
compiled to consult it.

THE READS ARE THE EXPENSIVE HALF, so they are switched on per class by a
subtree walk: only a class that encloses such a write pays the extra send.
Every other class in the corpus emits exactly what it emitted before, which
matters because this is the path every zero-argument ``super()'' takes.

``sibling_method_sees_the_write'' is the check that distinguishes a real cell
from a convenient local: a per-frame rebinding would be invisible to Host's
OTHER methods, and CPython's is not.  ``not_a_class_attribute'' is the other
half of CPython's rule -- the write goes to the cell, so the class namespace
never gains a '__class__' entry, and the name ``Host'' still names the class.
"""

r = {}


class Host:
    def m(self):
        out = {}
        out["before"] = __class__

        class X:
            nonlocal __class__
            __class__ = 42

            def f():
                __class__

        out["after"] = __class__
        out["not_in_class_dict"] = "__class__" not in X.__dict__
        return out


_o = Host().m()
r["read_before_the_write_is_the_class"] = _o["before"] is Host
r["read_after_the_write_is_the_new_value"] = _o["after"]
r["not_a_class_attribute"] = _o["not_in_class_dict"]


class Sibling:
    def other(self):
        # A DIFFERENT method of the same class, compiled before the write is
        # even parsed.  The cell is shared, so it sees 99 too.
        return __class__

    def m(self):
        class X:
            nonlocal __class__
            __class__ = 99

        return self.other()


r["sibling_method_sees_the_write"] = Sibling().m()


class Untouched:
    # The control: a class nobody rebinds still reads its own class, and the
    # name still names the class.  Without this the fixture would pass for an
    # implementation that broke __class__ generally.
    def m(self):
        return __class__


r["an_ordinary_class_is_unaffected"] = Untouched().m() is Untouched


class SuperControl:
    def m(self):
        # Zero-arg super() reads the same cell, and is the path that must not
        # regress: it is compiled by a different emitter than the bare name.
        return super().__class__ is not None and isinstance(self, SuperControl)


r["zero_arg_super_still_works"] = SuperControl().m()


EXPECTED = {
    "read_before_the_write_is_the_class": True,
    "read_after_the_write_is_the_new_value": 42,
    "not_a_class_attribute": True,
    "sibling_method_sees_the_write": 99,
    "an_ordinary_class_is_unaffected": True,
    "zero_arg_super_still_works": True,
}


if __name__ == "__main__":
    for key, expected in EXPECTED.items():
        actual = r[key]
        print("%-4s %s -> %r" % ("OK" if actual == expected else "FAIL",
                                 key, actual))
    for extra in sorted(set(r) - set(EXPECTED)):
        print("%-4s %s is not in EXPECTED" % ("FAIL", extra))
