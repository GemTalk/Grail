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


def aug_iadd_none_disabled():
    # An in-place dunder explicitly set to None DISABLES the operator and --
    # unlike a merely-absent __iadd__ -- blocks the binary fallback, so
    # ``x += 10'' raises TypeError even though __add__ is inherited
    # (test_augassign testCustomMethods1's aug_test4).  Without honouring the
    # None sentinel, the inherited compiled __iadd__ (or the __add__ fallback)
    # ran and no error was raised.
    class Base:
        def __init__(self, v):
            self.val = v

        def __iadd__(self, o):
            return Base(self.val + o)   # a real in-place op, to be blocked

        def __add__(self, o):
            return Base(self.val + o)   # a fallback, to be blocked too

    class Blocked(Base):
        __iadd__ = None

    x = Blocked(4)
    try:
        x += 10
    except TypeError:
        return 'TypeError'
    return 'no error'


def aug_iadd_none_present_still_works():
    # A sibling WITHOUT the None sentinel keeps dispatching normally -- proves
    # the sentinel check does not disturb ordinary in-place / fallback dispatch.
    class Base:
        def __init__(self, v):
            self.val = v

        def __add__(self, o):
            return Base(self.val + o)

    class WithIadd(Base):
        def __iadd__(self, o):
            self.val += o
            return self

    a = WithIadd(1)
    a += 10                             # __iadd__ -> mutate in place
    b = Base(2)
    b += 10                            # no __iadd__ -> __add__ fallback
    return a.val == 11 and b.val == 12


def deque_nonreflexive_eq():
    # deque == deque compares element-wise with Python's identity-before-
    # equality rule, so a deque holding a non-reflexive element (a single
    # float('nan') object shared by both deques) still equals a deque built
    # from the SAME objects (test_contains test_nonreflexive).  A non-deque
    # operand is NotImplemented, so ``==`` falls back to identity.
    from collections import deque
    nan = float('nan')
    values = (nan, 1, None, 'abc')
    a = deque(values)
    b = deque(values)
    return (a == b) and (a == a) and (a != deque([1])) \
        and (a.__eq__(5) is NotImplemented)


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


# --------------------------------------------------------------------------
# 5. type() metaclass identity (operator.length_hint's user-class path uses
#    ``type(x) is type`` to distinguish a class from an instance).
# --------------------------------------------------------------------------
def type_is_type():
    return type is type                          # True (identity-stable)


def type_of_class_is_type():
    # A class' metaclass is the canonical ``type`` object.
    return (type(int) is type
            and type(TypeError) is type
            and type(LookupError) is type)       # True


def type_of_instance_is_not_type():
    return (type(5) is not type
            and type("x") is not type
            and type(NotImplemented) is not type)  # True


def type_of_instance_returns_class():
    class C:
        pass
    return type(C()) is C                        # True (unchanged)


def isinstance_class_of_type():
    class C:
        pass
    return isinstance(C, type) and not isinstance(5, type)   # True


def length_hint_class_raises_default():
    class X:
        def __init__(self, value):
            self.value = value

        def __length_hint__(self):
            if type(self.value) is type:
                raise self.value
            else:
                return self.value

    # TypeError-valued hint is swallowed -> default; LookupError propagates.
    caught = operator.length_hint(X(TypeError), 12)
    try:
        operator.length_hint(X(LookupError))
        propagated = 'no error'
    except LookupError:
        propagated = 'LookupError'
    return caught == 12 and propagated == 'LookupError'


def length_hint_iterator():
    # len(iterator) raises TypeError -> length_hint falls back to
    # type(it).__length_hint__, which reports the remaining count.
    it = iter([1, 2, 3])
    a = operator.length_hint(it)      # 3
    next(it)
    b = operator.length_hint(it)      # 2 after consuming one
    return a == 3 and b == 2
