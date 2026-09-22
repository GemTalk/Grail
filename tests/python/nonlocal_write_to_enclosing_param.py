"""Fixture: a nested scope's ``nonlocal'' WRITE that binds an enclosing
def's PARAMETER.

Smalltalk method arguments are read-only, so Grail copies a parameter into a
block temp whenever the body rebinds it (FunctionDefAst >>
paramNeedsTemp:assigned:instVars:).  That decision reads the parser's own
``writes'' set for the def -- and a write performed by a NESTED scope through a
``nonlocal'' declaration is not in it, because it is recorded against the scope
that wrote it, not against the scope that owns the name.

The ``del'' half of the same problem was already handled
(``deletedNamesInSubtree''); the ASSIGNMENT half was not, so every shape below
emitted a store against the Smalltalk method argument and died with
CompileError 1001, ``expected an assignable variable'' -- which takes down the
whole module, not just the def.

WHY THE CORPUS NEVER SAW IT.  test_scope's ``testNonLocalClass'' is the obvious
place, and it passes: there the def owning the parameter is nested inside a
TestCase METHOD, which is compiled as a block whose parameters are already
temps.  The failure needs the owning def to be compiled as a MODULE METHOD --
i.e. written at module level -- which is the one spelling the upstream test
does not use.  Measured: the same construct nested in a method compiles, at
module level it does not.

Everything here is verified against real CPython by running the file directly.
"""

r = {}


# --------------------------------------------------------------------------
# A nested DEF writing the enclosing parameter.
# --------------------------------------------------------------------------


def via_nested_def(x):
    def inner():
        nonlocal x
        x += 1
    inner()
    return x


r["via_nested_def"] = via_nested_def(0)


# --------------------------------------------------------------------------
# A nested CLASS BODY writing it -- test_scope's testNonLocalClass shape, but
# with the owning def at MODULE level, which is what makes it a method
# argument rather than a block temp.
# --------------------------------------------------------------------------


def via_class_body(x):
    class c:
        nonlocal x
        x += 1

        def get(self):
            return x

    return c()


_inst = via_class_body(0)
r["via_class_body"] = _inst.get()
# CPython binds nothing in the class namespace for a nonlocal name.
r["class_gets_no_attribute"] = "x" not in type(_inst).__dict__


# --------------------------------------------------------------------------
# A plain assignment, not just an augmented one -- the augassign READS the
# name too, so on its own it cannot tell a missing temp from a missing read.
# --------------------------------------------------------------------------


def plain_assignment(x):
    def inner():
        nonlocal x
        x = 99
    inner()
    return x


r["plain_assignment"] = plain_assignment(0)


# --------------------------------------------------------------------------
# Two levels down, and a name the innermost scope does NOT declare -- the
# collector over-approximates on purpose, and this pins that the
# over-approximation does not change an answer.
# --------------------------------------------------------------------------


def two_levels(x, y):
    def mid():
        def deep():
            nonlocal x
            x += 10
        deep()
        return y
    got = mid()
    return x, got


r["two_levels"] = two_levels(1, "untouched")


# --------------------------------------------------------------------------
# A parameter that is ALSO written directly by its own def already got a temp
# before this fix; it must keep working.
# --------------------------------------------------------------------------


def also_written_directly(x):
    x = x + 1

    def inner():
        nonlocal x
        x += 1
    inner()
    return x


r["also_written_directly"] = also_written_directly(0)


# --------------------------------------------------------------------------
# A nested ``del'' of the parameter -- the half that already worked, kept here
# so a change to the shared assignedNames computation cannot break it quietly.
# --------------------------------------------------------------------------


def nested_del(x):
    def inner():
        nonlocal x
        del x
    inner()
    try:
        return x
    except UnboundLocalError:
        return "unbound"


r["nested_del"] = nested_del(5)


EXPECTED = {
    "via_nested_def": 1,
    "via_class_body": 1,
    "class_gets_no_attribute": True,
    "plain_assignment": 99,
    "two_levels": (11, "untouched"),
    "also_written_directly": 2,
    "nested_del": "unbound",
}


if __name__ == "__main__":
    for key, expected in EXPECTED.items():
        actual = r[key]
        print("%-5s %-28s -> %r" % ("OK" if actual == expected else "FAIL",
                                    key, actual))
    for extra in sorted(set(r) - set(EXPECTED)):
        print("%-5s %-28s is not in EXPECTED" % ("FAIL", extra))
