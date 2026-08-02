# Fixture for TracebackTestCase>>testCaughtExceptionHasFrame: a caught
# exception now carries a traceback whose frame is the CATCHING function at the
# statement it propagated from (TryAst's except-binding fallback), so
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
            # Frame is the catching function at the try region (statement
            # granularity): the try-statement or the raise line.
            'lineno_in_try': (12 <= tb[0].lineno <= 13) if tb else False,
            'exc_info_nonempty': len(exc_tb) >= 1,
            'format_exc_has_valueerror': 'ValueError: boom' in traceback.format_exc(),
        }


RESULTS = _catch_here()
