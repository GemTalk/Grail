# Fixture for AttributeStoreTestCase's explicit-dunder-call checks.
#
# ``p.__setattr__('x', 1)`` is an ordinary, legal Python call.  Under Grail it
# did not store anything: it died with
#
#     a OffsetError occurred (error 2003),
#       reason:objErrBadOffsetIncomplete, max:2 actual:3
#
# an env-0 kernel error no ``except'' can see, so the gem went down with rc=1.
#
# A SELECTOR-SPELLING COLLISION, not an arity cap -- the distinction matters
# enough to pin.  ``object.__setattr__(inst, name, value)'', the spelling that
# bypasses a class's own __setattr__, is served by ``object class >>
# ___setattr__: args kw: kwargs''.  That selector is letter for letter what
# Grail builds as the VARARGS spelling of a BOUND ``inst.__setattr__(name,
# value)'' call, so the "@classmethod reached through an instance" probe in
# ___pyAttrLoad___ found a metaclass owner, bound the call to the CLASS, and
# the unbound helper read ``args at: 1/2/3'' off a two-element array.
#
# Which is why the two-argument bound dunders in Case 8 always worked:
# ``object class'' defines no unbound helper for __setitem__ or __set__.  Only
# __setattr__ and __new__ have one.
#
# EVERY expectation here is measured against CPython -- run this file as a
# script and every line must read OK.  scripts/check_python_fixtures.sh does
# exactly that.
#
# NOT COVERED, deliberately: ``p.__new__(P)'' is still broken, and it is a
# DIFFERENT root cause -- ___pyAttrLoad___ answers a non-callable for __new__
# and PythonInstance >> value:value: then dies on __call__, with no
# ___setattr__:kw: anywhere in the stack.  It is not asserted here because a
# check that CPython passes and Grail fails cannot be expressed in this
# harness (XFAIL means CPython is expected to disagree, and it does not).

CHECKS = []


def check(name, expected):
    """Register fn as a check whose answer must equal ``expected'' in CPython."""

    def register(fn):
        CHECKS.append((name, fn, expected))
        return fn

    return register


def outcome(fn):
    """What happened, as a string -- so a silent wrong answer is reported as a
    value rather than passing for success."""
    try:
        return "value %r" % (fn(),)
    except BaseException as e:
        return "%s: %s" % (type(e).__name__, e)


class Plain:
    def __init__(self):
        self.kept = "kept-value"


class Overriding:
    """Defines its own __setattr__ and delegates through the unbound form --
    the werkzeug.local / collections idiom."""

    def __init__(self):
        object.__setattr__(self, "log", [])

    def __setattr__(self, name, value):
        object.__setattr__(self, "log", self.log + [name])
        object.__setattr__(self, name, value)


class Sub(Plain):
    def store_via_super(self, name, value):
        super().__setattr__(name, value)
        return getattr(self, name)


class Mapping:
    def __init__(self):
        self.store = {}

    def __setitem__(self, key, value):
        self.store[key] = value


class Descriptor:
    def __set__(self, obj, value):
        object.__setattr__(obj, "via_descriptor", value)
        return "descriptor-ran"


# --- Case 1: the shape that killed the gem -----------------------------------


@check("bound_setattr_stores", "value 1")
def bound_setattr_stores():
    """It must STORE, not merely fail politely."""
    p = Plain()
    return outcome(lambda: (p.__setattr__("x", 1), p.x)[1])


def bound_setattr_returns_none():
    """The RETURN of the bound call.  Deliberately NOT in CHECKS: CPython
    answers None and Grail answers the stored value, because
    ___pyAttrStore___ returns aValue so codegen can use a store as an
    expression (chained assignment, tuple unpack).  A CPython-graded check
    cannot carry a Grail-only expectation -- the harness's XFAIL marker is
    for the other direction -- so the Smalltalk test asserts Grail's answer
    with the divergence written down beside it.  Pre-existing, and not
    introduced by making this call work."""
    p = Plain()
    return outcome(lambda: p.__setattr__("x", 1))


# --- Case 2-6: the spellings that always worked, which must keep working -----


@check("unbound_setattr", "value 1")
def unbound_setattr():
    p = Plain()
    return outcome(lambda: (object.__setattr__(p, "x", 1), p.x)[1])


@check("super_setattr", "value 1")
def super_setattr():
    return outcome(lambda: Sub().store_via_super("x", 1))


@check("type_setattr", "value 1")
def type_setattr():
    p = Plain()
    return outcome(lambda: (type(p).__setattr__(p, "x", 1), p.x)[1])


@check("plain_assignment", "value 1")
def plain_assignment():
    p = Plain()
    p.x = 1
    return outcome(lambda: p.x)


@check("setattr_builtin", "value 1")
def setattr_builtin():
    p = Plain()
    setattr(p, "x", 1)
    return outcome(lambda: p.x)


# --- Case 7: a class that DEFINES __setattr__, delegating unbound ------------


@check("overriding_plain_assignment", "value ['x']")
def overriding_plain_assignment():
    o = Overriding()
    o.x = 1
    return outcome(lambda: o.log)


@check("overriding_bound_call", "value (1, ['x'])")
def overriding_bound_call():
    """The bound call must run the class's OWN __setattr__, as CPython does."""
    o = Overriding()
    return outcome(lambda: (o.__setattr__("x", 1), (o.x, o.log))[1])


# --- Case 8: two-argument bound dunders that were NEVER broken ---------------
# Here so a future reader can see the boundary is a selector collision, not
# an arity cap on bound dunder calls.


@check("bound_setitem", "value {'k': 9}")
def bound_setitem():
    m = Mapping()
    return outcome(lambda: (m.__setitem__("k", 9), m.store)[1])


@check("bound_descriptor_set", "value ('descriptor-ran', 5)")
def bound_descriptor_set():
    d = Descriptor()
    h = Plain()
    return outcome(lambda: (d.__set__(h, 5), h.via_descriptor))


# --- Case 9: the ONE-ARGUMENT side of the boundary stays working -------------


@check("bound_getattribute", "value 'kept-value'")
def bound_getattribute():
    return outcome(lambda: Plain().__getattribute__("kept"))


@check("bound_delattr", "value False")
def bound_delattr():
    p = Plain()
    return outcome(lambda: (p.__delattr__("kept"), hasattr(p, "kept"))[1])


@check("bound_reduce_ex", "value True")
def bound_reduce_ex():
    """A one-argument bound dunder that answers rather than stores."""
    return outcome(lambda: Plain().__reduce_ex__(2) is not None)


# --- Case 10: a REAL @classmethod / @staticmethod reached through an instance
# --- must still bind to the class.  This is the contract the veto in
# --- ___metaVarargsIsUnboundDunderHelper___ had to leave alone, and the one a
# --- careless widening of it would break.


class WithClassMethod:
    @classmethod
    def make(cls, v):
        return (cls.__name__, v)

    @classmethod
    def make2(cls, a, b):
        return (cls.__name__, a, b)

    @staticmethod
    def plain(v):
        return ("static", v)


class MyDict(dict):
    pass


@check("classmethod_through_instance", "value ('WithClassMethod', 7)")
def classmethod_through_instance():
    return outcome(lambda: WithClassMethod().make(7))


@check("classmethod_two_args", "value ('WithClassMethod', 1, 2)")
def classmethod_two_args():
    return outcome(lambda: WithClassMethod().make2(1, 2))


@check("staticmethod_through_instance", "value ('static', 3)")
def staticmethod_through_instance():
    return outcome(lambda: WithClassMethod().plain(3))


@check("dict_subclass_fromkeys", "value {'a': None}")
def dict_subclass_fromkeys():
    """The shape test_dict test_fromkeys pins: a built-in @classmethod reached
    through a subclass INSTANCE, bound to the class."""
    return outcome(lambda: dict(MyDict().fromkeys(["a"])))


# --- harness entry points ----------------------------------------------------


def check_count():
    """How many checks ran.  Asserted by the Smalltalk test so a half-built
    table cannot report a well-formed zero failures."""
    return len(CHECKS)


def failures():
    """Every check whose answer differs from CPython's, as one string.

    Rows, not a count: the value a check actually got is the whole diagnosis,
    and a regression in the headline case does not even produce a value -- it
    takes the process down, which errors the Smalltalk test rather than
    failing it."""
    bad = []
    for name, fn, expected in CHECKS:
        actual = fn()
        if actual != expected:
            bad.append("%s: expected <%s> got <%s>" % (name, expected, actual))
    return "\n".join(bad)


if __name__ == "__main__":
    for _name, _fn, _expected in CHECKS:
        _actual = _fn()
        print("%-4s %-28s %s" % ("OK" if _actual == _expected else "FAIL", _name, _actual))
