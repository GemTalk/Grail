# Fixture for CPythonHarnessTestCase>>testTestIterImportAndSumprod.
#
# Regresses that the vendored test.test_iter imports cleanly.  test_math's
# testSumProd does ``from test.test_iter import BasicIterClass'', which drags
# in pickle, traceback, test.support.os_helper (TESTFN/unlink), and the
# check_free_after_iterating / BrokenIter support symbols -- all of which must
# resolve for the import to succeed.  It also checks that math.sumprod consumes
# a bare user iterator (BasicIterClass, whose values sum to 0) correctly.
#
# A real importlib module (not eval:): the ``from ... import'' executes the
# whole test_iter module body, and BasicIterClass is instantiated here.
import math
from test.test_iter import BasicIterClass

RESULT = (
    math.sumprod(BasicIterClass(1), [1]),   # iterator yields 0 -> 0*1 == 0
    math.sumprod([1], BasicIterClass(1)),   # 0
    BasicIterClass.__name__,                # 'BasicIterClass'
)
