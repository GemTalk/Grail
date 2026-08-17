"""Fixture: a module that BINDS the name ``super'' shadows the builtin.

``super()'' is not a syntactic form in CPython.  The compiler emits an ordinary
LOAD of the name and the zero-argument magic lives in super.__init__, which
inspects the calling frame -- so a module free to define ``class super:'' gets
its own class, exactly as it would when shadowing ``len''.

Grail rewrites ``super()'' at codegen time, so it has to ASK whether the name is
shadowed.  It asked in one place and not the other: NameAst's bare-name handler
stood down when the module bound the name, but CallAst's CALL-shape rewrites did
not -- and a call is the only shape that occurs in practice, so a shadowing
module got the builtin proxy anyway.

This file is the STATIC half: the binding is visible in the module body, so the
parser records it and the rewrite is suppressed at compile time, costing nothing
at run time.  The runtime half -- a name patched onto the module afterwards --
is super_shadowing_dynamic.py.

The whole file lives under the shadow: once a module binds ``super'', it is
bound for every class in it.  That is the point, and it is why the unshadowed
control lives in the other fixtures rather than here.
"""


class super:  # noqa: A001 - shadowing the builtin IS the fixture
    msg = "truly super"

    def __init__(self, *args):
        self.args = args


class C:
    def zero_arg(self):
        return super().msg

    def two_arg(self):
        return super(1, 2).args

    def as_a_value(self):
        return super


class Base:
    def f(self):
        return "Base.f"


class Derived(Base):
    # A class that would NORMALLY cooperate through super() -- under the shadow
    # it does not, and must not: CPython calls the shadowing class here too.
    def f(self):
        return super().msg


r = {
    "zero_arg": C().zero_arg(),
    "two_arg": str(C().two_arg()),
    "value_is_the_shadowing_class": C().as_a_value() is super,
    "value_is_not_a_builtin": C().as_a_value().__name__,
    "derived_gets_the_shadow_not_the_base": Derived().f(),
    # The shadowing class is an ordinary class, so instances behave ordinarily.
    "instance_of_shadow": isinstance(super(), super),
}


EXPECTED = {
    "zero_arg": "truly super",
    "two_arg": "(1, 2)",
    "value_is_the_shadowing_class": True,
    "value_is_not_a_builtin": "super",
    "derived_gets_the_shadow_not_the_base": "truly super",
    "instance_of_shadow": True,
}


if __name__ == "__main__":
    for key, expected in EXPECTED.items():
        actual = r[key]
        print("%-4s %s -> %r" % ("OK" if actual == expected else "FAIL",
                                 key, actual))
    for extra in sorted(set(r) - set(EXPECTED)):
        print("%-4s %s is not in EXPECTED" % ("FAIL", extra))
