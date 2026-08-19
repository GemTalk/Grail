"""GRAIL: enough of ``pdb`` for PEP 553's breakpoint().

CPython's pdb is a full source-level debugger built on sys.settrace.  Grail
has no Python-level tracing, and it does not need one to be a Python: what
``breakpoint()`` is FOR is stopping so a human can look, and on GemStone the
thing that does that is the image's own debugger.

So ``set_trace()`` pauses into it, via sys.breakpoint() -- Grail's long-standing
hook that signals a Halt for the controlling GCI debugger to catch.  That is a
real breakpoint, in the debugger the developer is already using, rather than a
pdb prompt Grail cannot offer.

NOT provided: the pdb command language (step/next/continue/where), Pdb, run,
runcall, post_mortem.  A caller wanting those wants CPython's debugger, and a
stub that accepted the calls and did nothing would be worse than the
AttributeError, which at least says so.
"""

import sys

__all__ = ['set_trace']


def set_trace(*, header=None):
    """Stop and hand control to GemStone's debugger.

    ``header`` is printed first when given, matching CPython's signature so
    ``breakpoint(header='...')`` reaches something that understands it.
    """
    if header is not None:
        print(header)
    sys.breakpoint()
