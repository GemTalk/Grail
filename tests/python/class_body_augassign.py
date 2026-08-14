"""Fixtures for ClassBodyAugAssignTestCase -- ``x += 1'' in a class body.

A class body executes sequentially, so an augmented assignment there rebinds the
class attribute: ``class C: x = 1; x += 1'' leaves C.x == 2.  Grail emitted
NOTHING for such a statement -- an AugAssignAst carries no
classBodyAttributePairs, so the structural class-body compile had nothing to
emit and dropped it whole, silently leaving C.x == 1.

Every expectation was checked against CPython 3.14.  The one case where Grail
still differs is deliberately not asserted here; see the test case comment for
``later attribute reads''.
"""


def chained_ops():
    """Several augmented assignments in a row, applied in order."""
    class A:
        x = 1
        x += 1
        x *= 5
    return A.x


def list_in_place_extend():
    """``+='' on a list uses __iadd__, which extends in place."""
    class B:
        items = [1]
        items += [2, 3]
    return B.items


def in_place_keeps_identity():
    """__iadd__ mutates rather than rebinding, so an alias taken BEFORE the
    augmented assignment observes the change -- the read-modify-write must not
    quietly substitute a copy."""
    class H:
        lst = []
        alias = lst
        lst += [9]
    return [H.lst, H.alias, H.lst is H.alias]


def inside_a_for_loop():
    """Augmented assignment inside a class-body compound statement, which is
    emitted by the same runtime pass."""
    class D:
        t = 0
        for i in (1, 2, 3):
            t += i
    return D.t


def inside_an_if():
    """Class-body ``if'' has its own emit; the augmented assignment inside it
    still has to reach the class attribute."""
    class E:
        v = 10
        if True:
            v -= 3
    return E.v


def method_local_is_unaffected():
    """A method body is a FUNCTION scope: ``k += 41'' there is an ordinary
    local, and the class attribute must not be touched."""
    class F:
        base = 100
        def m(self):
            k = 1
            k += 41
            return k
    return [F().m(), F.base]


def class_attribute_from_a_method():
    """``G.c += 1'' inside a method is an attribute augmented assignment, a
    different path that must keep working."""
    class G:
        c = 5
        def bump(self):
            G.c += 1
            return G.c
    return G().bump()


def nonlocal_augassign_is_applied_once():
    """A nonlocal target is emitted by the ENCLOSING-scope pass, not the class
    attribute pass.  If both claimed it the increment would be applied twice,
    so this pins the exclusion between them."""
    def f(x):
        class C:
            nonlocal x
            x += 1
        return x
    return f(0)


def augmented_value_is_stored():
    """The first half of the ordering case: the attribute itself ends up
    correct even though a LATER attribute in the same body does not yet see
    it (see the test case comment)."""
    class D:
        s = "a"
        s += "b"
    return D.s
