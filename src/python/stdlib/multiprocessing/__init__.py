"""GRAIL minimal multiprocessing shim.

Grail runs inside a GemStone gem.  There are no child PROCESSES to fork,
and Grail's threading is cooperative (GsProcess green threads), so the
parts of this package that mean "run this somewhere else" cannot be
honoured as written.

What IS honoured is the part real code actually depends on at import
time and for its results: cpu_count(), and multiprocessing.pool's
ThreadPool, which runs its work inline and hands back a completed
AsyncResult.  That is the same bargain concurrent.futures already
strikes in Grail (see concurrent/futures/__init__.py) and it is kept
deliberately consistent with it.

Anything genuinely process-based -- Pool, Process, Queue -- raises
rather than pretending, so a caller that needs real parallelism finds
out at the call, not from silently serial results it mistakes for
concurrent ones.
"""

import os

__all__ = ['cpu_count', 'Pool', 'Process', 'pool']


def cpu_count():
    """Number of usable CPUs.

    Delegates to os.cpu_count(), which Grail implements.  CPython raises
    NotImplementedError when the count is undeterminable; os.cpu_count()
    answers None in that case, so map it back."""
    n = os.cpu_count()
    if n is None:
        raise NotImplementedError('cannot determine number of cpus')
    return n


def active_children():
    """Always empty -- Grail has no child processes."""
    return []


def current_process():
    from multiprocessing.pool import _MainProcess
    return _MainProcess()


class Process:
    """Not supported.  Grail cannot fork a gem.

    Raising in __init__ rather than in start() is deliberate: a caller
    that constructs a Process has already decided to use real
    parallelism, and failing at the point of that decision names the
    problem better than failing later."""

    def __init__(self, *args, **kwargs):
        raise OSError(
            'multiprocessing.Process is not supported in Grail '
            '(no child processes); use multiprocessing.pool.ThreadPool, '
            'which runs inline')


def Pool(*args, **kwargs):
    """The PROCESS pool.  Not supported -- use ThreadPool."""
    raise OSError(
        'multiprocessing.Pool is not supported in Grail (no child '
        'processes); use multiprocessing.pool.ThreadPool, which runs inline')
