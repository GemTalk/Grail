"""GRAIL: enough of ``pdb`` for PEP 553's breakpoint(), and a Pdb to patch.

CPython's pdb is a full source-level debugger built on sys.settrace.  Grail
has no Python-level tracing, and it does not need one to be a Python: what
``breakpoint()`` is FOR is stopping so a human can look, and on GemStone the
thing that does that is the image's own debugger.

So ``set_trace()`` pauses into it, via sys.breakpoint() -- Grail's long-standing
hook that signals a Halt for the controlling GCI debugger to catch.  That is a
real breakpoint, in the debugger the developer is already using, rather than a
pdb prompt Grail cannot offer.

``Pdb`` is a class with CPython's constructor and a set_trace() that stops the
same way, and nothing else.  click's CliRunner, and so Flask's FlaskCliRunner,
saves ``pdb.Pdb.__init__``, replaces it for the duration of an invocation so a
breakpoint() in a command talks to the real terminal, and then restores it.
Without the class every ``CliRunner.invoke()`` raised AttributeError (#1633).
Its bases are not CPython's bdb.Bdb and cmd.Cmd: they would bring a run() and
a runcall() that execute the code and never stop, because nothing here traces.

NOT provided: the pdb command language (step/next/continue/where), run,
runcall, post_mortem, and those methods of Pdb.  A caller wanting those wants
CPython's debugger, and a stub that accepted the calls and did nothing would be
worse than the AttributeError, which at least says so.
"""

import sys

__all__ = ['Pdb', 'set_trace']


class Pdb:
    """Constructed as CPython's Pdb is; set_trace() stops in GemStone's debugger.

    The constructor keeps what CPython's keeps from its arguments, cmd.Cmd's
    ``completekey``, ``stdin`` and ``stdout`` and bdb.Bdb's ``skip``.  The rest
    configure a prompt, signal handling and a tracing backend, none of which
    exists here.
    """

    def __init__(self, completekey='tab', stdin=None, stdout=None, skip=None,
                 nosigint=False, readrc=True, mode=None, backend=None,
                 colorize=False):
        self.completekey = completekey
        self.stdin = sys.stdin if stdin is None else stdin
        self.stdout = sys.stdout if stdout is None else stdout
        self.skip = set(skip) if skip else None

    def set_trace(self, frame=None, *, commands=None):
        """Stop and hand control to GemStone's debugger, as set_trace() does."""
        sys.breakpoint()


def set_trace(*, header=None):
    """Stop and hand control to GemStone's debugger.

    ``header`` is printed first when given, matching CPython's signature so
    ``breakpoint(header='...')`` reaches something that understands it.
    """
    if header is not None:
        print(header)
    sys.breakpoint()
