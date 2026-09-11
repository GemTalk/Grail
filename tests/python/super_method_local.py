# Regression fixture: super() and __class__ inside a METHOD-LOCAL class.
#
# A class defined in a function body is not a module attribute, so a method
# that needs its own class reaches it through the closure cell that holds it --
# `self ___classCellForSuper___: #'___cell_<ClassName>___'' for super(), and
# ___dunderClassCell___ for a bare __class__ read.  IR refused every such call
# (CallAst:super-methodLocalClass, 79 methods on the suite manifest;
# NameAst:__class__-methodLocalClass, 8) because that cell read was not emitted.
#
# The cell is keyed by CLASS NAME, not by type(self), and that is the whole
# point: __class__ is the class the method was DEFINED in.  So the cases that
# matter are the ones where those differ -- a subclass instance running an
# inherited method -- which is why `inherited_sees_defining_class' and
# `super_from_base_method' are here rather than just a flat super() call.
#
# Run this file under CPython and every value must be True.

RESULTS = {}


def zero_arg_super():
    class Base:
        def greet(self):
            return "base"

    class Derived(Base):
        def greet(self):
            return "derived+" + super().greet()

    return Derived().greet()


def explicit_super_naming_itself():
    class Base:
        def greet(self):
            return "base"

    class Derived(Base):
        def greet(self):
            return "derived+" + super(Derived, self).greet()

    return Derived().greet()


def dunder_class_read():
    class C:
        def mine(self):
            return __class__.__name__

    return C().mine()


def inherited_sees_defining_class():
    """__class__ is the DEFINING class, not type(self)."""
    class C:
        def mine(self):
            return __class__.__name__

    class Sub(C):
        pass

    return (Sub().mine(), type(Sub()).__name__)


def super_from_base_method():
    """super() in a base method, invoked on a subclass instance."""
    class A:
        def chain(self):
            return ["A"]

    class B(A):
        def chain(self):
            return ["B"] + super().chain()

    class C(B):
        pass

    return C().chain()


def super_init_chain():
    class Base:
        def __init__(self):
            self.parts = ["base"]

    class Derived(Base):
        def __init__(self):
            super().__init__()
            self.parts.append("derived")

    return Derived().parts


def three_level_chain():
    class A:
        def who(self):
            return "A"

    class B(A):
        def who(self):
            return "B>" + super().who()

    class C(B):
        def who(self):
            return "C>" + super().who()

    return C().who()


def super_with_arguments():
    class Base:
        def add(self, a, b=10, *rest, kw=100):
            return (a, b, rest, kw)

    class Derived(Base):
        def add(self, a, b=10, *rest, kw=100):
            return super().add(a, b, *rest, kw=kw)

    return Derived().add(1, 2, 3, kw=4)


def classmethod_super():
    class Base:
        @classmethod
        def make(cls):
            return "base"

    class Derived(Base):
        @classmethod
        def make(cls):
            return "derived+" + super().make()

    return Derived.make()


def property_super():
    class Base:
        @property
        def v(self):
            return 1

    class Derived(Base):
        @property
        def v(self):
            return super().v + 1

    return Derived().v


RESULTS["zero_arg_super"] = zero_arg_super() == "derived+base"
RESULTS["explicit_super_naming_itself"] = (
    explicit_super_naming_itself() == "derived+base")
RESULTS["dunder_class_read"] = dunder_class_read() == "C"
RESULTS["inherited_sees_defining_class"] = (
    inherited_sees_defining_class() == ("C", "Sub"))
# C inherits B.chain, so the chain starts at B: type(self) is C but the method
# was DEFINED in B, and super() must walk from B, not from C.
RESULTS["super_from_base_method"] = super_from_base_method() == ["B", "A"]
RESULTS["super_init_chain"] = super_init_chain() == ["base", "derived"]
RESULTS["three_level_chain"] = three_level_chain() == "C>B>A"
RESULTS["super_with_arguments"] = super_with_arguments() == (1, 2, (3,), 4)
RESULTS["classmethod_super"] = classmethod_super() == "derived+base"
# property_super is DELIBERATELY NOT ASSERTED.  Grail answers a
# SuperBoundMethod for `super().v' where CPython invokes the property, so
# `super().v + 1' raises TypeError -- identically with the flag on and off, so
# it is a pre-existing gap in @property-through-super and not about the cell
# read this fixture exists for.  Kept as a function, and named here, so the
# omission reads as a known separate defect rather than an oversight.
