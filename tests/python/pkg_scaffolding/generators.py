# Exercises Grail's generator runtime (PythonGenerator + coroutine via
# GsProcess + Semaphores).  Each generator function detected by
# isGenerator wraps its body in PythonGenerator.withBlock so the call
# returns a lazy generator instead of running the body.


def make_three():
    """Three consecutive yields, no locals across resume points."""
    yield 'a'
    yield 'b'
    yield 'c'


def count_up(n):
    """Loop generator — proves a local variable (i) survives across
    each resume."""
    i = 0
    while i < n:
        yield i
        i = i + 1


def with_return():
    """`yield` then `return value` — PEP 380 says the return value
    attaches to StopIteration.  PythonGenerator captures the block's
    value into returnValue."""
    yield 1
    yield 2
    return 'final'


class Counter:
    """Generator inside a class method.  ``self`` must close over
    correctly (the body block captures the method's receiver)."""

    def __init__(self, prefix):
        self.prefix = prefix

    def labelled(self, n):
        for i in range(n):
            yield self.prefix + '_' + str(i)
