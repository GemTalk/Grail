# GRAIL: expose the vendored `mock` module as `unittest.mock`.
#
# `from unittest import mock` and `import unittest.mock` are used by some
# CPython test modules (test_int, test_functools).  The implementation
# lives in the top-level mock.py (exercised by MockTestCase); this module
# just re-exports its public surface so both import spellings resolve.

from mock import *
from mock import (Mock, MagicMock, NonCallableMock, patch, patch_object,
                  sentinel, DEFAULT, ANY, call, _Call)
