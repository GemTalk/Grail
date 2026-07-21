# Fixture for FunctoolsTestCase>>testPartialReprReentrantMutationSafety.
#
# functools.partial.__repr__ must snapshot func/args/keywords at ENTRY: an
# element whose own __repr__ reentrantly mutates the partial (via
# __setstate__) must not change what the in-progress repr reports.  The old
# __repr__ re-read #keywords AFTER the args loop, so mutating during an arg's
# repr leaked the replacement keywords into the output.  Regression for
# CPython test_functools test_repr_safety_against_reentrant_mutation.
#
# A user class with __init__/__repr__ is defined here (module scope) rather
# than in eval: scope, where such classes cannot be instantiated.
import functools


class Function:
    def __init__(self, name):
        self.name = name

    def __call__(self):
        return None

    def __repr__(self):
        return "Function(" + self.name + ")"


class Evil:
    def __init__(self):
        self.triggered = False
        self.partial = None
        self.new_state = None

    def __repr__(self):
        if not self.triggered and self.partial is not None:
            self.triggered = True
            self.partial.__setstate__(self.new_state)
        return "EvilObject"


def _repr_with_trigger(build_partial):
    trigger = Evil()
    p = build_partial(trigger)
    trigger.partial = p
    trigger.new_state = (Function("new_function"), (None,), {"keyword": None}, None)
    return repr(p)


def check():
    # trigger in args, with a keyword after it (the case the old code broke:
    # #keywords was re-read post-mutation, printing keyword= instead of arg=).
    r1 = _repr_with_trigger(
        lambda t: functools.partial(Function("old_function"), t, arg=None))
    # trigger as the keyword value (args formatted first, then keywords).
    r2 = _repr_with_trigger(
        lambda t: functools.partial(Function("old_function"), None, trigger=t))
    # trigger in args, trailing positional after it.
    r3 = _repr_with_trigger(
        lambda t: functools.partial(Function("old_function"), t, None))
    return (r1 == "functools.partial(Function(old_function), EvilObject, arg=None)"
            and r2 == "functools.partial(Function(old_function), None, trigger=EvilObject)"
            and r3 == "functools.partial(Function(old_function), EvilObject, None)")
