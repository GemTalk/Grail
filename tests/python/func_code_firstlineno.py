# Fixture for TracebackTestCase>>testFuncCodeFirstlineno (Phase 2 of the
# traceback design): a nested def now carries a real func.__code__ (a PyCode)
# stamped at def-time, with co_firstlineno == the 1-based line of the `def`
# keyword.  Line numbers below are load-bearing -- do not reflow.
#
# The def of `inner` is on line 10.


def outer():
    def inner():
        return 1
    return inner


INNER = outer()

RESULTS = {
    'has_code': hasattr(INNER, '__code__'),
    'co_firstlineno': INNER.__code__.co_firstlineno,   # 10
    'co_name': INNER.__code__.co_name,                 # 'inner'
    'co_firstlineno_is_int': isinstance(INNER.__code__.co_firstlineno, int),
}
