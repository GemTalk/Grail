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
    try:
        class MyInt(int):
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
