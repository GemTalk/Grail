# Fixture for AttributeStoreTestCase's unknown-method-call tests.
#
# Python's data model gives ``obj.name(arg)'' and ``obj.name = arg'' two
# different meanings, and a missing ``name'' fails the SAME way in both
# readings: ``AttributeError: 'Plain' object has no attribute 'name'''.
#
# Grail read one of those two shapes as the other.  PythonInstance's
# doesNotUnderstand: handler interpreted ANY unknown one-argument keyword
# send as an attribute STORE -- ``dynamicInstVarAt: #name put: arg'', then
# ANSWERING THE ARGUMENT.  So a mistyped or unimplemented one-argument
# method call did not raise: it created an attribute nobody asked for and
# handed back its own argument as the result.  ``d.quantize(Decimal('0.01'))''
# answered ``Decimal('0.01')'' -- a plausible-looking wrong NUMBER, in the
# kind of code that is usually about money.
#
# The Python shape that reaches that send is Case 2 below.  Grail compiles
# ``mod.method(arg)'' to a direct one-argument send whenever the RECEIVER
# NAME resolves to a module at compile time; rebinding that name to an
# instance (which CPython allows, and which the compiler deliberately does
# not treat as disabling the fast path) lands the send on a PythonInstance.
#
# Cases 3-5 are the controls: the store reading, and known one-argument
# calls, must all still work.

import math


class Plain:
    def __init__(self):
        self.kept = 'kept'

    def known(self, v):
        return ('known', v)


# --- Case 1: unknown one-argument method call on a plain instance ---
# Written as a STATEMENT, not inside a helper: Grail's call codegen picks its
# shape from the syntax at the call site, so a probe that hides the call
# inside a lambda need not compile to the same send.
_p1 = Plain()
try:
    _r1 = _p1.quantize(7)
    unknown_one_arg = 'returned %r' % (_r1,)
except AttributeError as _e:
    unknown_one_arg = 'AttributeError: %s' % (_e,)
except BaseException as _e:
    unknown_one_arg = '%s: %s' % (type(_e).__name__, _e)
unknown_one_arg_created_attr = hasattr(_p1, 'quantize')


# --- Case 2: the same send through Grail's module-call fast path ---
# ``math.floor(3.7)'' compiles to a direct one-argument ``floor:'' send
# because the name ``math'' resolves to a module at compile time; the
# rebinding makes the receiver an instance at run time.
_saved_math = math
math = Plain()
try:
    _r2 = math.floor(3.7)
    module_shadow = 'returned %r' % (_r2,)
except AttributeError as _e:
    module_shadow = 'AttributeError: %s' % (_e,)
except BaseException as _e:
    module_shadow = '%s: %s' % (type(_e).__name__, _e)
module_shadow_created_attr = hasattr(math, 'floor')
math = _saved_math


# --- Case 3 (control): a real attribute store still works ---
_p3 = Plain()
_p3.quantize = 'stored'
store_still_works = _p3.quantize


# --- Case 4 (control): setattr with a brand-new name still works ---
_p4 = Plain()
setattr(_p4, 'rounding', 'ROUND_UP')
setattr_still_works = _p4.rounding


# --- Case 5 (control): a KNOWN one-argument method still dispatches ---
known_call = Plain().known(5)


# --- Case 6: the module-shadow shape again, this time from inside a FUNCTION
# body, because Grail's call codegen picks its shape at the call site and the
# two need not agree ---
def module_shadow_in_function():
    global math
    _saved = math
    math = Plain()
    try:
        return 'returned %r' % (math.floor(3.7),)
    except AttributeError as e:
        return 'AttributeError: %s' % (e,)
    except BaseException as e:
        return '%s: %s' % (type(e).__name__, e)
    finally:
        math = _saved


CHECKS = (
    ('unknown_one_arg', lambda: unknown_one_arg,
     "AttributeError: 'Plain' object has no attribute 'quantize'"),
    ('unknown_created_attr', lambda: unknown_one_arg_created_attr, False),
    ('module_shadow', lambda: module_shadow,
     "AttributeError: 'Plain' object has no attribute 'floor'"),
    ('module_created_attr', lambda: module_shadow_created_attr, False),
    ('module_shadow_in_fn', module_shadow_in_function,
     "AttributeError: 'Plain' object has no attribute 'floor'"),
    ('store_still_works', lambda: store_still_works, 'stored'),
    ('setattr_still_works', lambda: setattr_still_works, 'ROUND_UP'),
    ('known_call', lambda: known_call, ('known', 5)),
)


# --- harness entry points ----------------------------------------------------


def check_count():
    """How many checks ran.  Asserted by the Smalltalk test so a half-built
    table cannot report a well-formed zero failures."""
    return len(CHECKS)


def failures():
    """Every check whose answer differs from CPython's, as one string.

    Rows, not a count: what a check actually GOT is the whole diagnosis here,
    because the regression this guards produces a plausible-looking wrong
    VALUE rather than an error."""
    bad = []
    for name, fn, expected in CHECKS:
        actual = fn()
        if actual != expected:
            bad.append('%s: expected <%s> got <%s>' % (name, expected, actual))
    return '\n'.join(bad)


if __name__ == '__main__':
    for _name, _fn, _expected in CHECKS:
        _actual = _fn()
        print('%-4s %-22s %r' % (
            'OK' if _actual == _expected else 'FAIL', _name, _actual))
