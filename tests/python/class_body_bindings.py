"""Fixture for ClassBodyBindingProtocolTestCase.

Behavioural guards for the class-body binding protocol.  Grail compiles a
class body STRUCTURALLY rather than executing it as a suite, so ClassDefAst
must scan the body for (a) which names each statement binds -- so later
siblings resolve them class-locally instead of falling back to module scope
-- and (b) which class-attribute VALUES each statement yields.

Those two questions are answered by the statements themselves
(``___boundTargetNames___`` / ``classBodyAttributePairs``).  Keeping them
separate matters for ``def`` and a nested ``class``: both bind a NAME but
yield no attribute value, so a rebinding assignment elsewhere in the body
owns the attribute's value position.  That split is pinned structurally by
ClassBodyBindingProtocolTestCase; what this fixture guards is the compiled
result of each binding form.

Every expectation here is CPython's own answer, verified against CPython.
"""


class NestedClassVisibleLater:
    class Inner:
        tag = "inner"

    # A nested class binds its name, so this later sibling must see Inner
    # class-locally rather than falling back to module scope.
    derived = Inner.tag + "!"


class TupleTargets:
    pair = ("a", "b")
    first, second = pair


class ChainedAssignment:
    # One value AST, several targets: all three names must be bound, and the
    # right-hand side must be evaluated ONCE.
    a = b = c = []


class Annotated:
    declared: int = 7


def probe():
    chained = ChainedAssignment
    return {
        "nested_derived": NestedClassVisibleLater.derived,
        "nested_inner_tag": NestedClassVisibleLater.Inner.tag,
        "tuple_first": TupleTargets.first,
        "tuple_second": TupleTargets.second,
        "annotated_declared": Annotated.declared,
        # Shared identity proves the RHS was emitted once, not once per name.
        "chained_shared": chained.a is chained.b and chained.b is chained.c,
    }
