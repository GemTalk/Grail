"""Helper for decorator_recursion_error.py: a TOP-LEVEL decorated def whose
decorator never returns.

It has to be a module of its own because only a top-level def reaches the
module-level decorator emitter (FunctionDefAst>>printModuleDecoratorsOn:).  A
def inside a try, a function or an exec() string takes another path.
Importing this module must raise RecursionError, as it does under CPython.
"""


def recursing(f):
    return recursing(f)


@recursing
def top():
    return 1
