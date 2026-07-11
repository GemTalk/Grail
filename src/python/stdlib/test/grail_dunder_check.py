# GRAIL: fixture for DunderNewTestCase -- descriptor-round scenarios
# that need real class definitions (a classdef cannot instantiate
# inside PythonTestCase>>eval:).  NOT a vendored CPython module; the
# name avoids the test_ discovery glob.


class D:
    def __new__(cls, v):
        self = super(D, cls).__new__(cls)
        self.y = v * 2
        return self


class Slotted:
    __slots__ = ("_x",)

    def __new__(cls, v):
        self = super(Slotted, cls).__new__(cls)
        self._x = v
        return self


class OpAttrs:
    def _add(a, b):
        return a.v + b.v

    def _factory(mono, fall):
        def forward(a, b):
            return mono(a, b)

        def reverse(b, a):
            return fall(a, b)

        return forward, reverse

    __add__, __radd__ = _factory(_add, _add)

    def __init__(self, v):
        self.v = v


class Rebinder:
    def m(__self, v):
        if v > 0:
            __self = None
        return __self is None


def sealed_subclass_result():
    # int subclassing WORKS now (AbstractPyInt routing); bool stays
    # sealed -- CPython itself forbids subclassing bool.
    try:
        class MyBool(bool):
            pass
        return "no-error"
    except TypeError:
        return "type-error"


NEW_RESULT = D(4).y
SLOT_RESULT = Slotted(5)._x
OP_RESULT = OpAttrs(3) + OpAttrs(4)
REBIND_RESULT = Rebinder().m(1)
SEALED_RESULT = sealed_subclass_result()


class GenericBox[T]:
    # PEP 695 type params on a CLASS (parsed and erased).
    def __init__(self, v):
        self.v = v


PEP695_CLASS_RESULT = GenericBox(7).v


class NestedOuter:
    class A:
        x = 5

    class B:
        y = 6

    a = A()
    b = B()


NESTED_RESULT = NestedOuter.a.x + NestedOuter.b.y


class ClosureHost:
    def m(self):
        class A:
            @staticmethod
            def s(x):
                return (self, x)
        return A.s(4)[1]


CLOSURE_RESULT = ClosureHost().m()


class MyInt(int):
    def label(self):
        return "v=" + str(int(self))


INT_SUB_RESULTS = [
    MyInt(7) + 1,
    1 + MyInt(7),
    type(MyInt(3) + MyInt(4)).__name__,
    isinstance(MyInt(7), int),
    issubclass(MyInt, int),
    MyInt("101", 2),
    [10, 20, 30][MyInt(1)],
    {MyInt(7): "x"}[7],
    MyInt(9).label(),
    hash(MyInt(5)) == hash(5),
]


class GetitemOnly:
    def __init__(self, seq):
        self.seq = list(seq)

    def __getitem__(self, i):
        return self.seq[i]


class IterNoNext:
    def __iter__(self):
        return self


class NotIterable:
    pass


def _legacy_iter_results():
    r = [list(GetitemOnly([3, 1, 2])), sorted(GetitemOnly([3, 1, 2]))]
    try:
        next(iter(IterNoNext()))
        r.append("no-error")
    except TypeError:
        r.append("type-error")
    try:
        iter(NotIterable())
        r.append("no-error")
    except TypeError:
        r.append("type-error")
    return r


LEGACY_ITER_RESULT = _legacy_iter_results()


def _compile_fail_result():
    try:
        def trapped():
            class Local:
                def m(self):
                    return Local
            return Local
        trapped()().m() if False else None
        cls = trapped()
        cls().m()
        return "no-error"
    except NameError:
        return "name-error"


COMPILE_FAIL_RESULT = _compile_fail_result()


def _protocol_fallback_results():
    import math

    class Bare:
        pass

    b = Bare()
    r = []
    for thunk in [lambda: b[0], lambda: b.__setitem__(0, 1),
                  lambda: iter(3), lambda: math.acos(),
                  lambda: math.exp("x")]:
        try:
            thunk()
            r.append("no-error")
        except TypeError:
            r.append("te")
    return r


PROTOCOL_FALLBACK_RESULT = _protocol_fallback_results()
