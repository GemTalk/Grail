# Fixture for OperatorSemanticsTestCase.
#
# Regression coverage for a batch of operator / dispatch fixes:
#
#  1. Context-manager __exit__ dispatch.  A ``def __exit__(self, *exc)''
#     (varargs) — the ubiquitous form, incl. test.support.swap_item — was
#     unreachable: ``obj.__exit__(a, b, c)'' and the ``with'' codegen sent a
#     fixed 3-keyword selector that ``object''s default absorbed, binding to
#     the class and raising "does not support the context manager protocol".
#     Root cause: ___pyAttrLoad___ misread ``object''s kernel-tail default
#     dunders as class-side methods.  Fixed with an ``isMeta'' gate plus a
#     WithAst change routing __exit__ through the varargs-aware call.
#
#  2. ``a << b'' / ``a >> b'' with a negative count returned a shifted value
#     (Smalltalk bitShift: sign-flips) instead of raising ValueError.
#
#  3. Augmented assignment ``a += b'' compiled to ``a = a.__add__(b)'',
#     never trying ``__iadd__''; a class defining only ``__iadd__'' raised a
#     spurious "unsupported operand" TypeError.
#
#  4. The ``operator'' module: concat/iconcat now reject non-sequences
#     (numbers) with TypeError, and every operation is exposed under both its
#     plain and dunder name with the SAME identity (``operator.__add__ is
#     operator.add'').

import operator


# --------------------------------------------------------------------------
# 1. Context managers -- varargs and fixed __exit__ reached through `with`
# --------------------------------------------------------------------------
class VarargsCM:
    def __init__(self):
        self.entered = False
        self.exit_argc = None

    def __enter__(self):
        self.entered = True
        return self

    def __exit__(self, *exc):          # varargs: the bug case
        self.exit_argc = len(exc)
        return False                   # must NOT suppress exceptions


class FixedCM:
    def __init__(self):
        self.exit_argc = None

    def __enter__(self):
        return self

    def __exit__(self, a, b, c):       # fixed arity
        self.exit_argc = 3
        return False


def cm_varargs_entered():
    cm = VarargsCM()
    with cm:
        pass
    return cm.entered                  # True


def cm_varargs_exit_argc():
    cm = VarargsCM()
    with cm:
        pass
    return cm.exit_argc                # 3 (None, None, None)


def cm_fixed_exit_argc():
    cm = FixedCM()
    with cm:
        pass
    return cm.exit_argc                # 3


def cm_exit_does_not_suppress():
    cm = VarargsCM()
    try:
        with cm:
            raise ValueError('boom')
    except ValueError:
        return 'propagated'
    return 'suppressed'


def cm_call_exit_directly():
    cm = VarargsCM()
    cm.__exit__(1, 2, 3)               # a plain call, not via `with`
    return cm.exit_argc                # 3


# --------------------------------------------------------------------------
# 2. Negative shift count -> ValueError
# --------------------------------------------------------------------------
def lshift_ten():
    return 5 << 1                       # 10


def rshift_two():
    return 5 >> 1                       # 2


def lshift_negative():
    try:
        2 << -1
        return 'no error'
    except ValueError:
        return 'ValueError'


def rshift_negative():
    try:
        2 >> -1
        return 'no error'
    except ValueError:
        return 'ValueError'


# --------------------------------------------------------------------------
# 3. Augmented assignment dispatches __iadd__ before __add__
# --------------------------------------------------------------------------
class InplaceProbe:
    def __iadd__(self, o): return 'iadd'
    def __isub__(self, o): return 'isub'
    def __imul__(self, o): return 'imul'
    def __ixor__(self, o): return 'ixor'
    def __getitem__(self, o): return 5   # makes it "concatenable"


def aug_iadd():
    x = InplaceProbe(); x += 1; return x


def aug_isub():
    x = InplaceProbe(); x -= 1; return x


def aug_imul():
    x = InplaceProbe(); x *= 2; return x


def aug_ixor():
    x = InplaceProbe(); x ^= 1; return x


def aug_int_counter():
    i = 0
    for _ in range(5):
        i += 1
    return i                            # 5 -- no regression on builtins


def aug_list_extend():
    lst = [1]
    lst += [2, 3]
    return lst == [1, 2, 3]             # True


def aug_int_to_float():
    x = 0
    x += 1.5
    return x                            # 1.5


# --------------------------------------------------------------------------
# 4. operator module
# --------------------------------------------------------------------------
def op_concat_lists():
    return operator.concat([1, 2], [3, 4]) == [1, 2, 3, 4]   # True


def op_concat_numbers():
    try:
        operator.concat(13, 29)
        return 'no error'
    except TypeError:
        return 'TypeError'


def op_iconcat_numbers_msg():
    try:
        operator.iconcat(1, 0.5)
        return 'no error'
    except TypeError as e:
        return str(e)                    # "'int' object can't be concatenated"


def op_dunder_is_original():
    names = [n for n in dir(operator) if not n.startswith('_')]
    for name in names:
        orig = getattr(operator, name)
        dunder = getattr(operator, '__' + name.strip('_') + '__', None)
        if dunder and dunder is not orig:
            return 'MISMATCH:' + name
    return 'ALL_MATCH'
