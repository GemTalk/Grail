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


# ---------------------------------------------------------------------------
# A METHOD declaring ``nonlocal __class__'' writes the SAME shared cell.
#
# The class-body form above was handled; this one was not.  Grail emitted the
# store against the temp popScope keeps for the declared name, so the write
# landed in a local nobody reads and the cell kept its old value -- silently,
# with no corpus test able to see it (test_super's tearDown repairs damage that
# never happened under Grail, so its repair being a no-op costs nothing there).
#
# Reading it back inside the SAME frame is the half that makes read and write
# one change rather than two: route the store to the cell while the read still
# reads the temp, and the read raises UnboundLocalError instead.
# ---------------------------------------------------------------------------


class MA:
    def f(self):
        return "A"


class MB(MA):
    def f(self):
        return "B"


class MC(MB):
    def f(self):
        return "C"

    def g(self):
        # Reads the cell; declares nothing itself.
        return super().f()

    def damage(self):
        nonlocal __class__
        __class__ = MB
        return __class__.__name__

    def peek(self):
        nonlocal __class__
        return __class__.__name__


_mc = MC()
r["method_nonlocal_super_before"] = _mc.g()
r["method_nonlocal_peek_before"] = _mc.peek()
r["method_nonlocal_read_after_write"] = _mc.damage()
r["method_nonlocal_super_after"] = _mc.g()
r["method_nonlocal_sibling_sees_it"] = _mc.peek()
r["method_nonlocal_not_a_class_attribute"] = "__class__" not in MC.__dict__


# The cell may hold a NON-CLASS, and a later write must still land.  The write
# targets the container, so the receiver has to be the class object, not what
# the cell currently reads out to -- getting that wrong sends the setter to a
# SmallInteger.  test_super does exactly this (``__class__ = 42''); this shape
# is here so the fixture can see it too.


class MD(MA):
    def set_junk(self):
        nonlocal __class__
        __class__ = 42

    def restore(self):
        nonlocal __class__
        __class__ = MD

    def peek(self):
        nonlocal __class__
        return __class__


_md = MD()
r["junk_cell_peek_before"] = _md.peek() is MD
_md.set_junk()
r["junk_cell_holds_non_class"] = _md.peek()
_md.restore()
r["junk_cell_restored"] = _md.peek() is MD


# ``del __class__'' EMPTIES the shared cell rather than unbinding a temp.  Get
# that wrong and it is a silent no-op, not a failure: a later zero-arg super()
# keeps working against a cell that should be empty.


class ME(MA):
    def g(self):
        return super().f()

    def wipe(self):
        nonlocal __class__
        del __class__


_me = ME()
r["del_cell_super_before"] = _me.g()
_me.wipe()
try:
    _me.g()
    r["del_cell_super_after"] = "no raise"
except Exception as exc:
    # DELIBERATELY NOT pinning the exception TYPE.  CPython 3.14 raises
    # NameError ("cannot access free variable '__class__' ... in enclosing
    # scope"); Grail raises RuntimeError("super(): empty __class__ cell"), the
    # older CPython spelling, on BOTH the text and IR paths.  That divergence
    # predates this cut and is recorded in docs/Issues.md -- asserting the type
    # here would encode it as expected, and asserting CPython's would ship a
    # red test for a defect this fixture is not about.
    #
    # What IS asserted is the part this cut owns: the delete has an EFFECT.
    # Before it, the emit nilled a temp nobody reads and g() kept answering
    # 'A' -- a silent no-op, which is the failure mode worth pinning.
    r["del_cell_super_after"] = "raised"


EXPECTED = {
    "read_before_the_write_is_the_class": True,
    "read_after_the_write_is_the_new_value": 42,
    "not_a_class_attribute": True,
    "sibling_method_sees_the_write": 99,
    "an_ordinary_class_is_unaffected": True,
    "zero_arg_super_still_works": True,
    # The method-level form: the cell moves for the WHOLE class, so g()'s
    # zero-arg super() resolves against MB after the write and finds MA.f.
    "method_nonlocal_super_before": "B",
    "method_nonlocal_peek_before": "MC",
    "method_nonlocal_read_after_write": "MB",
    "method_nonlocal_super_after": "A",
    "method_nonlocal_sibling_sees_it": "MB",
    "method_nonlocal_not_a_class_attribute": True,
    "junk_cell_peek_before": True,
    "junk_cell_holds_non_class": 42,
    "junk_cell_restored": True,
    "del_cell_super_before": "A",
    "del_cell_super_after": "raised",
}


if __name__ == "__main__":
    for key, expected in EXPECTED.items():
        actual = r[key]
        print("%-4s %s -> %r" % ("OK" if actual == expected else "FAIL",
                                 key, actual))
    for extra in sorted(set(r) - set(EXPECTED)):
        print("%-4s %s is not in EXPECTED" % ("FAIL", extra))
