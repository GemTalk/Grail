# Fixture for BaseExceptionTestCase>>test_exception_group_caught_as_exception.
#
# PEP 654: ExceptionGroup derives from BOTH BaseExceptionGroup and Exception,
# while BaseExceptionGroup derives only from BaseException.  Grail's
# single-inheritance Smalltalk chain can only express one parent, so
# ``except Exception:'' needs an explicit widening in Exception class>>handles:
# -- the protocol on:do: actually resolves handlers through.  Without it a
# raised ExceptionGroup escaped as an UNCATCHABLE Smalltalk error.

RESULTS = {}


def _catches(handler_type, make_exc):
    """True when `except handler_type:` catches make_exc(), False if it escapes.

    make_exc is a FACTORY, not an exception: every check must raise a freshly
    built object.  Raising one object more than once is a separate, unrelated
    Grail limitation (both #signal and #pass refuse it), and reusing one here
    would make this fixture fail for a reason that has nothing to do with the
    ExceptionGroup widening under test.
    """
    # Bind first, then `raise exc`.  `raise make_exc()` would take RaiseAst's
    # bare-name-callee path, which assumes a bare name denotes an exception
    # CLASS -- a factory function there becomes "exceptions must derive from
    # BaseException" instead of raising what it returns.
    exc = make_exc()
    caught = False
    try:
        try:
            raise exc
        except handler_type:
            caught = True
    except BaseException:
        caught = False
    return caught


def _eg():
    return ExceptionGroup("eg", [ValueError(1)])


def _beg():
    return BaseExceptionGroup("beg", [KeyboardInterrupt()])


# --- the widening itself -----------------------------------------------------
RESULTS['issubclass_eg_exception'] = issubclass(ExceptionGroup, Exception)
RESULTS['eg_by_exception'] = _catches(Exception, _eg)
RESULTS['eg_by_eg'] = _catches(ExceptionGroup, _eg)
RESULTS['eg_by_beg'] = _catches(BaseExceptionGroup, _eg)
RESULTS['eg_by_baseexception'] = _catches(BaseException, _eg)


# --- narrowing 1: a SUBCLASS of Exception must not start catching groups -----
# `except ValueError:` inherits Exception class>>handles:, so the override has
# to return early for anything that is not Exception itself.
RESULTS['eg_not_by_valueerror'] = not _catches(ValueError, _eg)
RESULTS['eg_not_by_typeerror'] = not _catches(TypeError, _eg)


# --- narrowing 2: a bare BaseExceptionGroup is NOT an Exception -------------
# CPython excludes BaseExceptionGroup from Exception, which is what stops
# `except Exception:` swallowing a group carrying KeyboardInterrupt/SystemExit.
RESULTS['issubclass_beg_exception'] = not issubclass(BaseExceptionGroup, Exception)
RESULTS['beg_not_by_exception'] = not _catches(Exception, _beg)
RESULTS['beg_by_beg'] = _catches(BaseExceptionGroup, _beg)
RESULTS['beg_by_baseexception'] = _catches(BaseException, _beg)


# --- ordinary exceptions are unaffected -------------------------------------
RESULTS['plain_by_exception'] = _catches(Exception, lambda: ValueError("v"))
RESULTS['plain_by_valueerror'] = _catches(ValueError, lambda: ValueError("v"))
RESULTS['plain_not_by_typeerror'] = not _catches(TypeError, lambda: ValueError("v"))
RESULTS['keyboardinterrupt_not_by_exception'] = not _catches(
    Exception, lambda: KeyboardInterrupt())


# --- a subclass of ExceptionGroup is still caught by `except Exception:` -----
class MyGroup(ExceptionGroup):
    pass


RESULTS['eg_subclass_by_exception'] = _catches(
    Exception, lambda: MyGroup("mine", [ValueError(1)]))


# --- the group arrives at the handler intact --------------------------------
# (`.exceptions` is not implemented on Grail's ExceptionGroup yet, so this
# checks only what the widening is responsible for: the right object reaching
# the right handler.)
try:
    raise ExceptionGroup("outer", [ValueError(7), TypeError("t")])
except Exception as e:
    RESULTS['caught_message'] = e.args[0] == 'outer'
    RESULTS['caught_is_group'] = isinstance(e, BaseExceptionGroup)
    RESULTS['caught_is_exception'] = isinstance(e, Exception)
