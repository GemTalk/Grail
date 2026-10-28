"""The workload tests/scripts/runShimMemoryTest.gs measures: each step crosses
the C-extension shim in every direction docs/Shim_Memory.md sorts objects
by, using _grail_demo in place of numpy.

* Grail -> C: a list and tuples handed to C as arguments (wrappers, and the
  real-layout copies the shim makes of them).
* C -> C: tuples C builds for its own use (the real-layout registry).
* C -> Grail: a C extension's own object (a proxy), the tuple its method
  answers (a Grail copy whose origin is remembered), and a list C builds
  from a Python callable's answer.
"""

import _grail_demo


def _answer():
    return [1, (2, 'x')]


def step(n):
    for i in range(n):
        b = _grail_demo.Buf()
        b.values()
        _grail_demo.capi('is_true', [i, (i, 'a')])
        _grail_demo.capi('call_inline', _answer)
    return n


def memory():
    """(objects the shim allocated, released and quarantined; C heap bytes)."""
    return _grail_demo.capi("shim_memory")
