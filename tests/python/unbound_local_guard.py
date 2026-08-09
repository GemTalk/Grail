"""Fixture for UnboundLocalErrorTestCase's codegen-shape assertions.

`read_maybe_unbound` reads a local that is only conditionally assigned, so
NameAst emits its load-context unbound guard.  `read_parameter` reads a
parameter and contains no other block-bearing construct, so its compiled
method has a block literal if and only if the guard failed to inline.
"""


def read_maybe_unbound(flag):
    if flag:
        later = 1
    return later


def read_parameter(value):
    return value
