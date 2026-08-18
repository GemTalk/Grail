"""Fixture: a class whose name is a SMALLTALK pseudo-variable, defined in a def.

Python has six perfectly ordinary identifiers that Smalltalk cannot name:
``self'', ``super'', ``nil'', ``true'', ``false'', ``thisContext''.  Grail has
always carried such a binding under a ``_<name>'' transport -- FunctionDefAst
declares the temp that way and NameAst reads it that way -- but a CLASS bound to
one of those names was emitted with the raw Python name as its assignment
target:

    _super := ...      <- the temp the enclosing method declares
    super := (...)     <- what the class definition emitted

``super := ...'' is not legal Smalltalk, so the method did not COMPILE and the
whole enclosing function was replaced by a codegen-gap stub -- not a wrong
answer, no answer at all (test_super's test_shadowed_local).

WHY MODULE SCOPE ALWAYS WORKED, AND WHY THAT HID IT.  A module-scope class def
wraps its emit in a block and declares its own block temp, and GemStone DOES
permit ``[| super | ...]'' -- only a METHOD temp is refused.  So
super_shadowing_static.py, which binds ``class super:'' at module level, passed
from the day it was written.  The same fixture one indent deeper would not have.

The four shapes below are four different emitters, which is the point -- they
disagreed once already:

  * the class's own definition (the assignment target and every ___compileMethod:
    receiver that follows);
  * a method BODY reading the name, which string-compiles onto the class with no
    link to the enclosing method's temps and so must go through the closure cell;
  * a class BODY reading it (attribute values, bases, decorators), which emits
    INLINE in the enclosing method where the temp IS reachable and no cell
    exists -- the opposite answer to the one above, from the same name;
  * the cell STORE itself, emitted back in the enclosing scope.

``captured_self_still_receiver'' is the guard on that last one and is not
decoration: ``self'' is reserved but is normally the Smalltalk RECEIVER, with no
transport temp anywhere, so a cell store that mangled it emitted an undeclared
variable and cost the enclosing method.  That is a live shape upstream -- a
method-local class closing over the test's own ``self'' to call an assertion --
and it is how test_super's test_mixed_staticmethod_hierarchy broke while
test_shadowed_local was being fixed.
"""


def local_super():
    class super:  # noqa: A001 - shadowing the builtin IS the fixture
        msg = "quite super"

    class C:
        def method(self):
            # Reads the enclosing def's local from inside a method: the CELL
            # path.  ``super()'' rather than ``super'' so the shadow is
            # exercised through the call shape every real program uses.
            return super().msg

    return C().method()


def local_self():
    class self:  # noqa: A002 - ``self'' is an ordinary Python identifier
        msg = "quite self"

    class C:
        # Deliberately NOT named ``self'': the receiver parameter and the
        # class share a name only by accident in Python, and giving them
        # different ones keeps this measuring the class binding.
        def method(inner):
            return self.msg

    return C().method()


def local_nil_true_false():
    class nil:
        msg = "n"

    class true:
        msg = "t"

    class false:
        msg = "f"

    class C:
        def method(s):
            return nil.msg + true.msg + false.msg

    return C().method()


def reserved_nested_in_class_body():
    # A class body, not a function body: this one declares its own block temp
    # rather than borrowing the enclosing method's, so it is a different
    # emitter reaching the same identifier.
    class Outer:
        class super:  # noqa: A001
            msg = "nested super"

    return Outer.super.msg


def reserved_read_in_class_body():
    class super:  # noqa: A001
        msg = "body read"

    class C:
        # An attribute VALUE expression: emitted inline in this function, where
        # the transport temp is reachable and there is no closure cell.  The
        # read a method would do is the other answer entirely.
        borrowed = super.msg

    return C.borrowed


class Host:
    tag = "host"

    def run(self):
        class C:
            @staticmethod
            def peek():
                # ``self'' here is Host's receiver, captured by the method-local
                # class.  Reserved, but NOT a transport temp -- see the module
                # docstring.
                return self.tag

        return C.peek()


def local_super_instantiated():
    class super:  # noqa: A001
        def __init__(self, *args):
            self.args = args

    class C:
        def method(self):
            # Under the shadow this constructs the local class; it is NOT the
            # builtin's two-argument form, and the args arrive verbatim.
            return super(1, 2).args

    return C().method()


r = {
    "local_super": local_super(),
    "local_self": local_self(),
    "local_nil_true_false": local_nil_true_false(),
    "reserved_nested_in_class_body": reserved_nested_in_class_body(),
    "reserved_read_in_class_body": reserved_read_in_class_body(),
    "captured_self_still_receiver": Host().run(),
    "local_super_instantiated": str(local_super_instantiated()),
}


EXPECTED = {
    "local_super": "quite super",
    "local_self": "quite self",
    "local_nil_true_false": "ntf",
    "reserved_nested_in_class_body": "nested super",
    "reserved_read_in_class_body": "body read",
    "captured_self_still_receiver": "host",
    "local_super_instantiated": "(1, 2)",
}


if __name__ == "__main__":
    for key, expected in EXPECTED.items():
        actual = r[key]
        print("%-4s %s -> %r" % ("OK" if actual == expected else "FAIL",
                                 key, actual))
    for extra in sorted(set(r) - set(EXPECTED)):
        print("%-4s %s is not in EXPECTED" % ("FAIL", extra))
