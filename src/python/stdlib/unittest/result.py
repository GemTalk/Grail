"""GRAIL: unittest.result, the module CPython defines TestResult in.

Grail defines TestResult in unittest/__init__.py.  Its ``__module__'' names
this module, as CPython's does -- the result's repr reads
``<unittest.result.TestResult run=0 errors=0 failures=0>'' -- so this module
exists to make that name resolve: ``unittest.result.TestResult'' is the same
class.  Like unittest/case.py, it is a seam, not a port.
"""

from unittest import TestResult

__all__ = ['TestResult']
