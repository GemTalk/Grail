# Fixture for TracebackTestCase>>testCaughtExceptionHasFrame: a caught
# exception now carries a traceback whose frame is the CATCHING function at the
# EXACT line it propagated from (TryAst's except-binding fallback), so
# extract_tb / sys.exc_info() / format_exc are non-empty for ANY caught
# exception -- not just comprehensions.  Line numbers below are load-bearing.

import sys
import traceback


def _catch_here():
    try:
        raise ValueError("boom")          # line 13
    except ValueError as e:
        tb = traceback.extract_tb(e.__traceback__)
        exc_tb = traceback.extract_tb(sys.exc_info()[2])
        return {
            'nonempty': len(tb) >= 1,
            'name_is_func': (tb[0].name == '_catch_here') if tb else False,
            # Frame is the catching function at the RAISING line (13), not the
            # ``try'' header (12): SuiteAst now tracks ___curPos___ per statement
            # inside the try body.
            'lineno_is_raise': (tb[0].lineno == 13) if tb else False,
            'exc_info_nonempty': len(exc_tb) >= 1,
            'format_exc_has_valueerror': 'ValueError: boom' in traceback.format_exc(),
        }


def _catch_deep():
    # The raise is several statements into the try body AND inside a for loop
    # (both are SuiteAsts).  Under the old codegen ___curPos___ stopped updating
    # at the ``try'' header (line 34), so this frame would report 34; now it
    # reports the raise line 39.
    try:                                   # line 34
        total = 0                          # line 35
        for i in range(5):                 # line 36
            total += i                     # line 37
            if i == 3:                     # line 38
                raise KeyError("deep")     # line 39
    except KeyError as e:
        tb = traceback.extract_tb(e.__traceback__)
        return {
            'deep_nonempty': len(tb) >= 1,
            'deep_name': (tb[0].name == '_catch_deep') if tb else False,
            'deep_lineno_is_raise': (tb[0].lineno == 39) if tb else False,
        }


RESULTS = {}
RESULTS.update(_catch_here())
RESULTS.update(_catch_deep())
