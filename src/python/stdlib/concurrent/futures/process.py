"""Grail: ProcessPoolExecutor, present but refusing to run.

CPython's process.py is built on multiprocessing's pipes and child processes,
which a gem cannot make, and importing it fails on multiprocessing.connection.
Before concurrent.futures was vendored, Grail's stub let the NAME import and
raised only on construction; this keeps that, so a module that imports it at top
level (and picks threads at runtime) still loads.  Separate gems are Grail's
road to parallelism -- see threading.py's header -- not a process pool.
"""

from concurrent.futures import _base


class BrokenProcessPool(_base.BrokenExecutor):
    """Raised when a process in a ProcessPoolExecutor terminated abruptly."""


class ProcessPoolExecutor(_base.Executor):
    def __init__(self, *args, **kwargs):
        raise OSError(
            "ProcessPoolExecutor is not supported in Grail (no child processes)")
