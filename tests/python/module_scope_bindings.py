# Fixture for ModuleScopeBindingsTestCase.  Regression for the
# module-scope ``except X as e'' / ``with M as w'' binding gap: at module
# top level these as-targets must bind module variables (stored via
# dynamicInstVarAt:) rather than undeclared Smalltalk temps.  Before the
# fix, numpy/__init__.py and any regular Python using module-level
# except-as/with-as failed to COMPILE with "undefined symbol e/w".


class CM:
    """Minimal context manager so the with-statement test does not depend
    on io.StringIO internals."""

    def __init__(self, value):
        self.value = value
        self.exited = False

    def __enter__(self):
        return self.value

    def __exit__(self, exc_type, exc, tb):
        self.exited = True
        return False


# --- Module-scope except-as: e must be a readable module variable. ---
except_msg = None
try:
    raise ValueError("boom")
except ValueError as e:
    except_msg = str(e)
    except_repr_len = len(str(e))

# --- Module-scope with-as: w must be a readable module variable, and
# must survive (as a bound name) after the block, per Python semantics. ---
mgr = CM("hello")
with mgr as w:
    with_read = w

with_exited = mgr.exited


# --- Function-scope except-as / with-as: must still compile to bare
# enclosing-scope temps (the common, previously-working case). ---
def fn_except():
    try:
        raise ValueError("k")
    except ValueError as fe:
        return str(fe)


def fn_with():
    m = CM("inner")
    with m as fw:
        return fw


fn_except_result = fn_except()
fn_with_result = fn_with()
