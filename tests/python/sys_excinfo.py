# Fixture for TracebackTestCase>>testSysExcInfo: sys.exc_info() / sys.exception()
# now report the exception currently being handled (set by TryAst around an
# except handler, restored on exit so nested handlers stack), instead of the
# old (None, None, None) stub.

import sys
import traceback


def _inside():
    try:
        raise ValueError("boom")
    except ValueError:
        t, v, tb = sys.exc_info()
        return {
            'type_is_valueerror': t is ValueError,
            'value_is_instance': isinstance(v, ValueError),
            'message': str(v) == "boom",
            'exception_is_value': sys.exception() is v,
        }


def _outside_is_none():
    try:
        raise ValueError("x")
    except ValueError:
        pass
    # After the except block the current exception is restored to "none".
    return sys.exc_info() == (None, None, None) and sys.exception() is None


def _nested():
    try:
        raise ValueError("outer")
    except ValueError as outer:
        try:
            raise TypeError("inner")
        except TypeError as inner:
            inner_ok = sys.exception() is inner
        # Back in the outer handler, its exception is the current one again.
        outer_ok = sys.exception() is outer
        return inner_ok and outer_ok


def _format_exc_has_message():
    try:
        raise ValueError("kaboom")
    except ValueError:
        text = traceback.format_exc()
        return ("ValueError" in text) and ("kaboom" in text)


_in = _inside()

RESULTS = {
    'baseline_none': sys.exc_info() == (None, None, None),
    'inside_type': _in['type_is_valueerror'],
    'inside_value': _in['value_is_instance'],
    'inside_message': _in['message'],
    'inside_exception_is_value': _in['exception_is_value'],
    'outside_is_none': _outside_is_none(),
    'nested': _nested(),
    'format_exc_has_message': _format_exc_has_message(),
}
