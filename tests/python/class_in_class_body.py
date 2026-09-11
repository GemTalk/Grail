# Regression fixture: a class nested directly inside another CLASS BODY.
#
# Its methods were refused by IR as `method:classNotAtModuleScope' (since split
# to `method:classInClassBody'), on the reasoning that a nested class has no
# transport helper to hang cut 79's shared build on.  But the LIFETIME is what
# cut 79 turned on, and this shape's lifetime is the module-level one: a class
# in a class body is built ONCE, when the enclosing body runs, not once per
# CALL.  So the ordinary class-method seam already serves it and the refusal
# was wider than its reason -- 69 methods on the suite manifest, 66 of which
# became eligible.
#
# Run this file under CPython and every value must be True.

RESULTS = {}


class Outer:
    """Plain nesting: Inner's methods are what used to be refused."""
    class Inner:
        def __init__(self, v):
            self.v = v

        def doubled(self):
            return self.v * 2

        def __repr__(self):
            return "Inner(%r)" % (self.v,)

    def make(self, v):
        return Outer.Inner(v)


class WithInit:
    """The inner class reads and writes state across its own methods."""
    class Counter:
        def __init__(self):
            self.n = 0

        def bump(self, by=1):
            self.n += by
            return self.n

        def total(self):
            return self.n


class Deep:
    """Two levels of class-body nesting, still no def in the chain."""
    class Mid:
        class Leaf:
            def who(self):
                return "leaf"


class Inherits:
    """An inner class with a base, and an inner subclass of it."""
    class Base:
        def kind(self):
            return "base"

    class Derived(Base):
        def kind(self):
            return "derived"


class Defaults:
    class Args:
        def f(self, a, b=5, *rest, kw=7, **kwds):
            return (a, b, rest, kw, sorted(kwds))


def _outer_plain():
    o = Outer()
    i = o.make(21)
    return (i.doubled(), repr(i), Outer.Inner(3).doubled())


RESULTS["plain_nesting"] = _outer_plain() == (42, "Inner(21)", 6)

_c = WithInit.Counter()
_c.bump()
_c.bump(10)
RESULTS["state_across_methods"] = (_c.total() == 11)

RESULTS["two_levels"] = (Deep.Mid.Leaf().who() == "leaf")
RESULTS["inner_base"] = (Inherits.Base().kind() == "base")
RESULTS["inner_derived"] = (Inherits.Derived().kind() == "derived")
RESULTS["inner_isinstance"] = isinstance(Inherits.Derived(), Inherits.Base)
RESULTS["signature_shapes"] = (
    Defaults.Args().f(1) == (1, 5, (), 7, [])
    and Defaults.Args().f(1, 2, 3, 4, kw=9, z=1) == (1, 2, (3, 4), 9, ["z"]))

# The inner class must be a distinct class object, not merged with the outer.
RESULTS["distinct_classes"] = (Outer.Inner is not Outer) and (
    Inherits.Base is not Inherits.Derived)
