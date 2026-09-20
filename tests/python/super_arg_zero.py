# Regression fixture: zero-argument ``super()'' in a class defined inside a
# METHOD -- the shape CPython's own test suite is full of.
#
# These methods were refused by IR as `CallAst:super-argZeroDeletable' -- 32 on
# the suite manifest, concentrated in test_subclassinit (11), test_super (5),
# test_enum (5) and test_warnings (3), and almost all of them ``__new__'' or
# ``__init_subclass__'' on a class defined inside a test method.
#
# THE REFUSAL WAS A CONTEXT ARTIFACT.  ___irSuperShape___ asked
# ___superArgZeroGuardName___ whether a ``del'' could have cleared argument 0,
# and that predicate is only meaningful while the def is being EMITTED: it
# reads CallAst selfParameterName, which during the eligibility probe belongs
# to a different frame, so ``cls'' did not compare equal to it and every such
# method looked deletable.  At emit time the same predicate answers nil, the
# text path emits no guard at all, and the two paths' generated code for these
# methods is character-for-character identical.
#
# THE NESTING IS LOAD-BEARING, so do not flatten it.  A class local to a
# module-level FUNCTION does not refuse -- measured: the same bodies moved out
# to plain functions census as `cm:eligible' with the refusal still in place,
# so a fixture written that way passes whether or not the cut is present.  It
# must be a class local to a METHOD OF A CLASS, as in test_subclassinit.
#
# Run this file under CPython and every value must be True.

RESULTS = {}


class Harness:
    """Every method-local class below lives in a METHOD, not a function."""

    def init_subclass_chain(self):
        """test_subclassinit's shape."""
        seen = []

        class A:
            initialized = False

            def __init_subclass__(cls, **kw):
                super().__init_subclass__(**kw)
                seen.append(cls.__name__)
                cls.initialized = True

        class B(A):
            pass

        class C(B):
            pass

        return seen, A.initialized, B.initialized, C.initialized

    def new_on_builtin_subclasses(self):
        """test_tuple / test_list / test_set's shape: a method-local subclass
        of a built-in whose __new__ forwards through zero-arg super()."""

        class MyTuple(tuple):
            def __new__(cls, arg):
                return super().__new__(cls, arg)

        class MyStr(str):
            def __new__(cls, arg):
                return super().__new__(cls, arg.upper())

        return MyTuple([1, 2]), MyStr("ab"), type(MyTuple([]))

    def metaclass_new(self):
        """test_super / test_functools / test_enum's shape: a method-local
        METACLASS whose __new__ calls zero-arg super()."""
        order = []

        class Meta(type):
            def __new__(cls, name, bases, ns):
                order.append(name)
                return super().__new__(cls, name, bases, ns)

        class Made(metaclass=Meta):
            def who(self):
                return "made"

        return order, Made().who(), type(Made).__name__

    def super_chain(self):
        """The proxy must bind the DEFINING class, not the receiver's class:
        a three-deep method-local chain answers each level's own super."""

        class Base:
            def who(self):
                return "base"

        class Mid(Base):
            def who(self):
                return "mid+" + super().who()

        class Leaf(Mid):
            def who(self):
                return "leaf+" + super().who()

        return Leaf().who(), Mid().who(), Base().who()


_h = Harness()

_seen, _a_init, _b_init, _c_init = _h.init_subclass_chain()
RESULTS["init_subclass_runs"] = (_seen == ["B", "C"])
RESULTS["init_subclass_skips_owner"] = (_a_init is False)
RESULTS["init_subclass_sets_flag"] = (_b_init is True and _c_init is True)

# NOTE: a ``class MyList(list)'' whose __new__ forwards ``super().__new__(cls)''
# belongs in this family and is deliberately absent -- Grail's list.__new__ takes
# the contents as its argument, so the one-argument CPython spelling iterates the
# CLASS and raises TypeError.  That is a built-in signature gap, unrelated to the
# super() shape under test here, and pinning it would only hide it.
_t, _s, _tt = _h.new_on_builtin_subclasses()
RESULTS["new_tuple"] = (_t == (1, 2))
RESULTS["new_str_upper"] = (_s == "AB")
RESULTS["new_keeps_subclass"] = (_tt is not tuple and issubclass(_tt, tuple))

_order, _who, _mt = _h.metaclass_new()
RESULTS["metaclass_new_runs"] = (_order == ["Made"])
RESULTS["metaclass_instance_works"] = (_who == "made")
RESULTS["metaclass_is_meta"] = (_mt == "Meta")

RESULTS["super_chain"] = (
    _h.super_chain() == ("leaf+mid+base", "mid+base", "base"))


# A def written under an ``if'' in a class body is the one shape whose text
# emit DOES carry the argument-0 guard (its parameter is a transported temp
# rather than the Smalltalk receiver).  It reaches the IR seam by no route
# today -- a conditional def is not a direct class-body statement, so nothing
# registers it -- so this asserts the BEHAVIOUR only, which must not depend on
# which path compiled it.
_ENABLED = True


class _CondBase:
    def who(self):
        return "base"


class _CondDerived(_CondBase):
    if _ENABLED:
        def who(self):
            return "cond+" + super().who()


RESULTS["conditional_class_body_def"] = (_CondDerived().who() == "cond+base")
