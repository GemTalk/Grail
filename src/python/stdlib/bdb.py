"""GRAIL: ``bdb``'s exception, without its tracing debugger.

CPython's bdb is the base class pdb debugs with, built on sys.settrace and
sys.monitoring.  Grail has neither, and its pdb (see pdb.py) hands a
breakpoint to GemStone's own debugger instead -- so there is nothing for a Bdb
to drive, and a Bdb that accepted the calls and did nothing would be worse
than the AttributeError, which at least says so.

What other code reaches for is the EXCEPTION.  BdbQuit is what a debugger
raises when its user quits, and test runners recognise it so that quitting a
debugger mid-test ends the run instead of reporting a failure: pytest's
runner and doctest plugins import bdb for ``isinstance(exc, bdb.BdbQuit)''
and nothing else.  Without the module, ``import pytest'' failed outright.
"""

__all__ = ['BdbQuit']


class BdbQuit(Exception):
    """Exception to give up completely."""
