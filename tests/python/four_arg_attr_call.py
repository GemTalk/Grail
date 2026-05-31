# Fixture for FourArgAttrCallTestCase.
#
# Calling a 4-argument method through a non-trivial (chained-attribute)
# receiver goes through the load-then-call path: ``(recv
# ___pyAttrLoad___ #m) value: args``.  ___pyAttrLoad___ enumerates the
# candidate method selectors to decide the attr is a callable; it used
# to stop at 3 fixed args (name:_:_:) + varargs, so a 4-arg method
# (name:_:_:_:) was not recognised and raised AttributeError.
# werkzeug's routing ``StateMachineMatcher.match(domain, path, method,
# websocket)`` is exactly this shape.


class Matcher:
    def match(self, a, b, c, d):
        return [a, b, c, d]


class Holder:
    def __init__(self):
        self.m = Matcher()


def call_4arg_via_attribute_chain():
    # ``h.m.match(...)`` — the receiver ``h.m`` is a chained attribute,
    # so the call is NOT a fast-path send; it loads ``match`` then calls.
    h = Holder()
    return h.m.match(1, 2, 3, 4)


def call_4arg_on_local():
    m = Matcher()
    return m.match("a", "b", "c", "d")


def four_arg_bound_method_reference():
    # ``f = m.match`` then ``f(...)`` — explicit BoundMethod handle.
    m = Matcher()
    f = m.match
    return f(10, 20, 30, 40)
