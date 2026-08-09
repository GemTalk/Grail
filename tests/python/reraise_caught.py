# Fixture for TracebackTestCase>>testReRaiseCaughtException.
#
# ``raise e'' naming the exception an enclosing ``except'' just caught must
# re-raise THAT object -- CPython preserves identity, so `caught is e`.
# GemStone refuses to #signal an exception a second time (UncontinuableError
# 6011, 'Exception has already been signaled'); #pass is the primitive that
# continues one already in flight.

RESULTS = {}


# --- 1. the basic shape: raise the caught exception, identity preserved -----
original = ValueError("boom")
try:
    try:
        raise original
    except ValueError as e:
        raise e
except ValueError as caught:
    RESULTS['basic_reraised'] = True
    RESULTS['basic_identity'] = caught is original
    RESULTS['basic_message'] = str(caught) == 'boom'


# --- 2. bare ``raise'' still works (regression guard for the existing path) --
orig2 = TypeError("bare")
try:
    try:
        raise orig2
    except TypeError:
        raise
except TypeError as caught:
    RESULTS['bare_identity'] = caught is orig2


# --- 3. raise e from None -- suppress the implicit context ------------------
orig3 = KeyError("k")
try:
    try:
        raise orig3
    except KeyError as e:
        raise e from None
except KeyError as caught:
    RESULTS['from_none_identity'] = caught is orig3
    RESULTS['from_none_cause'] = caught.__cause__ is None
    RESULTS['from_none_suppress'] = caught.__suppress_context__ is True


# --- 4. raise e from other -- explicit cause --------------------------------
orig4 = IndexError("i")
cause4 = RuntimeError("because")
try:
    try:
        raise orig4
    except IndexError as e:
        raise e from cause4
except IndexError as caught:
    RESULTS['from_cause_identity'] = caught is orig4
    RESULTS['from_cause_cause'] = caught.__cause__ is cause4
    RESULTS['from_cause_suppress'] = caught.__suppress_context__ is True


# --- 5. re-raise from a NESTED FRAME (a helper called by the handler) -------
# The handler frame is still on the stack, so this is a live re-raise too.
def _rethrow(exc):
    raise exc


orig5 = ValueError("nested")
try:
    try:
        raise orig5
    except ValueError as e:
        _rethrow(e)
except ValueError as caught:
    RESULTS['nested_frame_identity'] = caught is orig5


# --- 6. raising a DIFFERENT, not-in-flight exception from inside a handler --
# Must still take the ordinary signal path, not #pass.
try:
    try:
        raise ValueError("first")
    except ValueError as e:
        raise TypeError("second")
except TypeError as caught:
    RESULTS['different_exc'] = str(caught) == 'second'
except ValueError:
    RESULTS['different_exc'] = False


# --- 7. re-raising a name REBOUND to another exception ----------------------
# ``e'' no longer denotes the in-flight exception; the ordinary path applies.
try:
    try:
        raise ValueError("outer")
    except ValueError as e:
        e = AttributeError("rebound")
        raise e
except AttributeError as caught:
    RESULTS['rebound'] = str(caught) == 'rebound'
except ValueError:
    RESULTS['rebound'] = False


# --- 8. raising an exception whose handler has ALREADY unwound --------------
# Stash it, leave the handler, raise it later: nothing is in flight any more,
# so this must go through the ordinary signal path and still work.
_stashed = None
try:
    raise ValueError("stashed")
except ValueError as e:
    _stashed = e

try:
    raise _stashed
except ValueError as caught:
    RESULTS['stashed_identity'] = caught is _stashed
    RESULTS['stashed_message'] = str(caught) == 'stashed'


# --- 9. the shape that broke Grail's import-error path ----------------------
# ImportError caught, inspected, then re-raised unchanged.
def _import_like():
    try:
        raise ImportError("no module named zzz")
    except ImportError as e:
        if 'zzz' in str(e):
            raise e
        return None


try:
    _import_like()
except ImportError as caught:
    RESULTS['import_shape'] = str(caught) == 'no module named zzz'


# --- 10a. ``from'' on the CALL raise path: raise Cls(args) from cause -------
cause10 = RuntimeError("root")
try:
    try:
        raise ValueError("inner")
    except ValueError:
        raise TypeError("wrapped") from cause10
except TypeError as caught:
    RESULTS['call_from_cause'] = caught.__cause__ is cause10
    RESULTS['call_from_suppress'] = caught.__suppress_context__ is True
    RESULTS['call_from_message'] = str(caught) == 'wrapped'


# --- 10b. ``from'' on the BARE CLASS raise path: raise Cls from cause -------
cause10b = RuntimeError("root2")
try:
    raise ValueError from cause10b
except ValueError as caught:
    RESULTS['class_from_cause'] = caught.__cause__ is cause10b
    RESULTS['class_from_suppress'] = caught.__suppress_context__ is True


# --- 10c. raise Cls(args) from None -----------------------------------------
try:
    raise ValueError("plain") from None
except ValueError as caught:
    RESULTS['call_from_none_cause'] = caught.__cause__ is None
    RESULTS['call_from_none_suppress'] = caught.__suppress_context__ is True


# --- 10d. a cause that is not an exception is a TypeError -------------------
try:
    raise ValueError("x") from 42
except TypeError as caught:
    RESULTS['bad_cause_typeerror'] = 'derive from BaseException' in str(caught)
except ValueError:
    RESULTS['bad_cause_typeerror'] = False


# --- 10e. __cause__ defaults to None when there is no ``from'' clause -------
try:
    raise ValueError("nocause")
except ValueError as caught:
    RESULTS['no_from_cause_none'] = caught.__cause__ is None
    RESULTS['no_from_suppress_false'] = caught.__suppress_context__ is False


# --- 11. re-raise inside a loop, twice, from the same handler ---------------
# Guards against #pass leaving the exception in a state the second raise
# can't reuse.
_counts = []
for _i in range(2):
    try:
        try:
            raise ValueError("loop%d" % _i)
        except ValueError as e:
            raise e
    except ValueError as caught:
        _counts.append(str(caught))
RESULTS['loop_twice'] = _counts == ['loop0', 'loop1']
