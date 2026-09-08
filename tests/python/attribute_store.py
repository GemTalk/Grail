# Fixture for AttributeStoreTestCase.
#
# Python's data model: `obj.foo = value` writes through
# `type(obj).__setattr__(obj, 'foo', value)`.  The default
# `object.__setattr__` stores into the instance dict.  A regular
# class method named `foo` (or any non-data-descriptor) does NOT
# intercept the store — the instance attribute simply shadows
# the method on subsequent reads.
#
# Pre-fix, Grail's AssignAst emitted `obj @env1:foo: value` for
# `obj.foo = value` when the receiver wasn't self, so a class
# method `foo:` got dispatched as if it were a setter.  Same
# bug in builtins.setattr.


class Counter:
    """Has a method whose name collides with an attribute name.
    Setting the attribute must NOT invoke the method."""

    def __init__(self):
        self.side_effects = []

    def value(self, v):
        # If `c.value = 42` mistakenly dispatches here, side_effects
        # records the call — observable in the test.
        self.side_effects.append(v)


# --- Case 1: direct attribute store via `c.value = ...` ---
c1 = Counter()
c1.value = 42
direct_value_after = c1.value
direct_side_effects_count = len(c1.side_effects)


# --- Case 2: builtin setattr(c, 'value', ...) ---
c2 = Counter()
setattr(c2, 'value', 99)
setattr_value_after = c2.value
setattr_side_effects_count = len(c2.side_effects)


# --- Case 3: attribute name that DOES NOT collide with a method ---
# Sanity check: a plain attribute store still works.
c3 = Counter()
c3.brand_new_attr = 'hello'
brand_new_attr_after = c3.brand_new_attr


# --- Case 4: method still callable on a fresh instance (read path) ---
# The method is reachable through the class until shadowed by an
# instance attribute.
c4 = Counter()
c4.value(7)
unshadowed_side_effects = list(c4.side_effects)


# --- Case 5: setattr() return value is None ---
# Per CPython, builtins.setattr returns None (it's the inverse of
# getattr, which returns the value).  Capturing the return must
# yield None, not the stored value.
c5 = Counter()
setattr_return = setattr(c5, 'foo', 42)
setattr_return_is_none = setattr_return is None


# --- Case 6: the shape reported as a hard OffsetError crash ---
# ``decimal.getcontext().prec = 10'' was reported to take the process down
# with a GemStone OffsetError (2003, objErrBadOffsetIncomplete, max:2
# actual:3) -- an attribute store running off the end of the receiver's
# instance-variable space.  Context holds exactly two attributes, so it is
# the smallest interesting case of a store on a stdlib object: overwrite
# each of the two.  (A THIRD, brand-new name is deliberately not stored --
# CPython's C Context has no __dict__ and rejects it, so that case cannot be
# grounded in CPython here; the brand-new-name store is Case 3 above.)
# Pinned so a crash on this shape cannot come back unnoticed.
import decimal

_ctx = decimal.getcontext()
# Normalized first, because getcontext() answers ONE module-global Context
# that outlives a reload of this fixture: an earlier load in the same session
# already left prec at 10, so reading the default here would depend on test
# order.  Setting it is also the first of the two stores under test.
_ctx.prec = 28
context_prec_before = _ctx.prec
_ctx.prec = 10
context_prec_after = _ctx.prec
_ctx.rounding = decimal.ROUND_UP
context_rounding_after = _ctx.rounding


def division_at_prec(p):
    """The same exact division carried out at a given ``prec''.

    A GRAIL-ONLY claim, deliberately not a CPython-graded check: CPython's
    prec TRUNCATES the result (1/3 at prec 2 is Decimal('0.33')), Grail's
    Decimal is an exact rational and prec is INERT -- tracked as issue #846,
    the coefficient+exponent re-representation.  Asserting the inertness is
    what keeps a reader of the store fix above from concluding that being
    able to SET prec means precision now works."""
    ctx = decimal.getcontext()
    saved = ctx.prec
    ctx.prec = p
    try:
        return str(decimal.Decimal(1) / decimal.Decimal(3))
    finally:
        ctx.prec = saved
