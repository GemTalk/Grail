"""A module-level def, for LiveFrameProbeResilienceTestCase.

Its ``___curPos___`` marker lands as a METHOD-level temp, which is the shape
the in-memory fast path resolves without ever reading source.  The test
asserts exactly that, so this file exists only to be compiled.
"""


def probe_target(x):
    y = x + 1
    return y
