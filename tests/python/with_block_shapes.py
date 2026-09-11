# Regression fixture: every with-statement shape, and what __exit__ is told.
#
# Grail's IR codegen and its text codegen split a with-statement differently:
#
#   text:  ([body. true] on: BaseException do: [...]) == true
#              ifTrue: [__exit__(None, None, None)]
#   IR:    [[body] on: BaseException do: [... ___handled___ := true ...]]
#              ensure: [___handled___ ifFalse: [__exit__(None, None, None)]]
#
# The ensure: is deliberate -- IR compiles `return' to a real `^' that bypasses
# the handler -- but it runs on EVERY unwind, including a Smalltalk error, which
# is not a BaseException and so never reaches the handler.  The manager was then
# told __exit__(None, None, None): that the body finished cleanly, while an
# error was unwinding through it.
#
# That misreport is not cosmetic.  unittest's assertRaisesRegex wraps its call
# in this shape; its __exit__, told there was no exception, RAISES from inside
# the ensure: block, and the new exception REPLACES the original error.  That
# was test.test_codecs' entire flag-on delta (ERROR 65 -> 66), surfacing as a
# clean `TypeError not raised' several layers from the cause.
#
# `with_return' is the case the ensure: exists for, so it is the one a careless
# fix breaks; `exit_raises' pins the other direction.  Keep both.
#
# Run this file under CPython and every value must be True.

class Rec:
    """A context manager that records what it was told."""
    def __init__(self, suppress=False):
        self.suppress = suppress
        self.log = []

    def __enter__(self):
        self.log.append("enter")
        return self

    def __exit__(self, et, ev, tb):
        self.log.append("exit:%s" % (et.__name__ if et else None))
        return self.suppress


RESULTS = {}


def normal():
    r = Rec()
    with r:
        pass
    return tuple(r.log)


def with_return():
    """The case the ensure: hook exists for: `return' out of a with-body."""
    r = Rec()

    def inner():
        with r:
            return "returned"
    return (inner(), tuple(r.log))


def propagates():
    r = Rec()
    try:
        with r:
            raise ValueError("boom")
    except ValueError as e:
        return (str(e), tuple(r.log))


def suppressed():
    r = Rec(suppress=True)
    with r:
        raise ValueError("hidden")
    return tuple(r.log)


def with_break():
    r = Rec()
    for _ in range(3):
        with r:
            break
    return tuple(r.log)


def with_continue():
    r = Rec()
    for _ in range(2):
        with r:
            continue
    return tuple(r.log)


def nested():
    a, b = Rec(), Rec()
    with a:
        with b:
            pass
    return (tuple(a.log), tuple(b.log))


def multi_item():
    a, b = Rec(), Rec()
    with a, b:
        pass
    return (tuple(a.log), tuple(b.log))


def as_target():
    r = Rec()
    with r as x:
        same = (x is r)
    return (same, tuple(r.log))


def exit_raises():
    """__exit__ raising on a CLEAN exit must not be mistaken for the body."""
    class Bad(Rec):
        def __exit__(self, et, ev, tb):
            self.log.append("exit:%s" % (et.__name__ if et else None))
            raise RuntimeError("from exit")
    r = Bad()
    try:
        with r:
            pass
    except RuntimeError as e:
        return (str(e), tuple(r.log))


RESULTS["normal"] = normal() == ("enter", "exit:None")
RESULTS["with_return"] = with_return() == ("returned", ("enter", "exit:None"))
RESULTS["propagates"] = propagates() == ("boom", ("enter", "exit:ValueError"))
RESULTS["suppressed"] = suppressed() == ("enter", "exit:ValueError")
RESULTS["with_break"] = with_break() == ("enter", "exit:None")
RESULTS["with_continue"] = with_continue() == (
    "enter", "exit:None", "enter", "exit:None")
RESULTS["nested"] = nested() == (
    ("enter", "exit:None"), ("enter", "exit:None"))
RESULTS["multi_item"] = multi_item() == (
    ("enter", "exit:None"), ("enter", "exit:None"))
RESULTS["as_target"] = as_target() == (True, ("enter", "exit:None"))
RESULTS["exit_raises"] = exit_raises() == (
    "from exit", ("enter", "exit:None"))
