"""A module-level def that a decorator rebinds to a C extension's object,
called from another function in the same module -- the shape of numpy's
allclose calling isclose, which @array_function_dispatch rebinds to a
dispatcher.  A call to a def compiles against its signature, so it takes
the probe-then-branch path (___pyCallValue___:kw:) once the name is
rebound; an SUnit eval: compiles differently, so this is a module.

Loaded by CPythonShimTestCase>>testARebindingDecoratorMayAnswerACObject;
not self-running, because CPython cannot import _grail_demo from here.
"""
import _grail_demo as d

v = d.Vec()


def deco(fn):
    return v


@deco
def g(a, k=None):
    pass


def caller():
    return g(1, k=2)


def caller2():
    return g(1)
