# Exercises AttributeAst's `self.X → instVar` fast path under
# two scenarios:
#   - Class has only conventional `def __init__(self, ...)`.  The
#     fast path should fire for self.X reads.
#   - Class ALSO defines `def __new__(cls, ...)`.  Before the
#     ClassDefAst fix, selfParameterName became `cls` for the
#     whole class, which turned every `self` reference in other
#     methods into an UnboundLocal compile error.


class FirstParamSelf:
    """Conventional class: only __init__ defines the instance
    layout, first param is `self`."""

    def __init__(self, label):
        self.label = label

    def read_self_attr(self):
        return self.label


class HasNewAndInit:
    """Class that overrides BOTH __new__ (first param `cls`) and
    __init__ (first param `self`).  The fix in ClassDefAst's
    selfParameterName picks __init__'s `self` for the rest of
    the class so other instance-method bodies keep working."""

    def __new__(cls, label):
        return object.__new__(cls)

    def __init__(self, label):
        self.label = label

    def read_self_attr(self):
        return self.label


class ClassSideAttr:
    """`set_class: type = set` is a class-level annotated assign
    that becomes a Smalltalk classInstVar — it lives on the
    class side, NOT in the instance layout.  An instance method
    reading `self.set_class` must therefore fall through to the
    runtime ___pyAttrLoad___: dispatch (which walks
    instance → class → metaclass) instead of trying the
    instVar fast path.  Before the AttributeAst fallback fix,
    the codegen emitted a bare `set_class` identifier and
    Smalltalk compile-errored with `undefined symbol set_class`."""

    set_class: type = list

    def __init__(self):
        pass

    def read_class_attr(self):
        return self.set_class

    def make_via_class_attr(self):
        return self.set_class()
