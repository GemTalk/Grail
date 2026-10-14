"""GRAIL: unittest.runner, the module CPython defines TextTestRunner and
TextTestResult in.

Grail defines both in unittest/__init__.py.  Their ``__module__'' names this
module, as CPython's do -- ``runner.run(suite)'' reprs as
``<unittest.runner.TextTestResult run=2 errors=0 failures=0>'' -- so this
module exists to make that name resolve, and to serve
``from unittest.runner import TextTestResult''.  Like unittest/case.py, it is
a seam, not a port.
"""

from unittest import TextTestResult, TextTestRunner

__all__ = ['TextTestResult', 'TextTestRunner']
