"""Fixture for UnboundLocalErrorTestCase's codegen-shape assertions.

`read_maybe_unbound` reads a body local that is only conditionally assigned,
so NameAst emits its load-context unbound guard.  Its `if` compiles to an
inlined `ifTrue:`, so the method has a block literal if and only if the
guard's `ifNil:` failed to inline.

`read_parameter` reads a parameter, which is bound on entry in every calling
convention Grail emits, so no guard should be emitted at all.

`deleted_parameter` and `nested_nonlocal_del` are the two ways a parameter
CAN become unbound; both must keep the guard.
"""


def read_maybe_unbound(flag):
    if flag:
        later = 1
    return later


def read_parameter(value):
    return value


def deleted_parameter(value):
    del value
    return value


def nested_nonlocal_del(value):
    def unbind():
        nonlocal value
        del value
    unbind()
    return value
