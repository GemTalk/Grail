"""Pure-Python ABCMeta -- CPython's fallback when the _abc accelerator is missing.

GRAIL: the class itself is defined in abc.py (see the GRAIL DEVIATION there
for why it cannot live here), and this module re-exports it under the names
CPython's _py_abc has, which test_abc and a few libraries import directly.
"""

from abc import ABCMeta, get_cache_token

__all__ = ['ABCMeta', 'get_cache_token']
