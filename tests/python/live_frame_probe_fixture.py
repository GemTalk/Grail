"""Two module-level defs, for LiveFrameProbeResilienceTestCase.

The two shapes differ in WHERE the text emitter puts its ``___curPos___``
marker, which is what decides which of the identity probe's routes can answer:

* ``probe_target`` is a plain body, so the marker lands as a METHOD-level temp
  and the in-memory fast path resolves it without ever reading source.
* ``block_target`` uses ``with``, which compiles the body into an inner
  protected block, so the marker is declared BLOCK-side and the method-level
  temps probe cannot see it at all.  That is the shape a transient source-read
  fault could erase, and the reason the retry exists.

Measured, not assumed: on the text path ``block_target`` reports
``argsAndTemps = anArray( #'x')`` -- no marker -- against ``anArray( #'x',
#'___curPos___', #'y')`` for ``probe_target``.

This file exists only to be compiled, so the defs do the least that still
produces those two shapes.
"""


class _Ctx:
    """A context manager that does nothing, to get a ``with'' into a def."""

    def __enter__(self):
        return self

    def __exit__(self, *exc):
        return False


def probe_target(x):
    y = x + 1
    return y


def block_target(x):
    with _Ctx():
        return x + 1
