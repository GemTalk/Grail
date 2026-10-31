# GRAIL: expose the vendored `mock` module as `unittest.mock`.
#
# `from unittest import mock` and `import unittest.mock` are used by some
# CPython test modules (test_int, test_functools).  The implementation
# lives in the top-level mock.py (exercised by MockTestCase).
#
# This module answers the mock module ITSELF, not a copy of its names:
# ``unittest.mock is mock`` has to hold however the name was first reached.
# mock.py registers itself as ``unittest.mock`` when its body runs, but when
# this file is loaded instead -- the sys.modules entry is gone, as it is after
# a canonical-registry restore -- a re-export made a second module, and
# ``sys.modules["unittest.mock"] is sys.modules["mock"]`` was False.  So the
# entry is replaced here, as CPython permits a module to do during its own
# import, and the package attribute with it.
#
# The names are re-exported as well: Grail's import machinery answers the
# module object it created for this file to the import in progress (``from
# unittest.mock import MagicMock'' reads this module, not the replacement), so
# this module still has to carry them.

import sys as _sys

import mock as _mock
from mock import *
from mock import (Mock, MagicMock, NonCallableMock, patch, patch_object,
                  sentinel, DEFAULT, ANY, call, _Call, mock_open)

_sys.modules[__name__] = _mock
_package = _sys.modules.get(__name__.rpartition('.')[0])
if _package is not None:
    setattr(_package, 'mock', _mock)
