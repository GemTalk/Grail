# Regression fixture for GlobalAst codegen.
#
# Pre-fix, ``GlobalAst >> printSmalltalkOn:'' was an unimplemented
# stub that called ``self halt'' — any module containing a function
# with a ``global'' declaration crashed at codegen time (jinja2,
# werkzeug._internal, and many CPython sources hit this).
#
# This fixture only verifies that the module compiles and imports
# cleanly with ``global'' declarations present in function bodies.
# Full ``global'' semantics (declared name routes to module
# dynamicInstVarAt: storage instead of becoming a function local)
# is a parser change tracked separately — out of scope for this
# regression.


_lazy = None


def reset_lazy():
    """A function with ``global'' — must compile without crashing.
    The body never runs at import time, so semantic correctness of
    the assignment is irrelevant for this regression."""
    global _lazy
    _lazy = 'set'


def has_global_then_uses_local():
    """A function whose body has BOTH a ``global'' declaration and
    bare-name expressions referencing the same name — must compile."""
    global _lazy
    return _lazy


compiles = True
