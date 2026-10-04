"""Fixtures for arithmetic between built-in numbers and int/float SUBCLASSES.

Driven by PythonTests>>NumericSubclassOperandsTestCase.  Each check answers
True when the behaviour matches CPython.

A Python subclass of int or float is, in Grail, a wrapper (AbstractPyInt /
AbstractPyFloat) that GemStone's numeric coercion turns straight back into a
plain number, so the right operand's own methods were never asked:

    1 / MyFloat(2.0)      CPython: MyFloat.__rtruediv__ -- int's method
                          answers NotImplemented for a float
    1 + MyInt(2)          CPython: MyInt.__radd__ first -- a subclass that
                          overrides the reflected method has priority

and the subclass could not defer to the built-in either, because super() found
none of float's methods and float had no reflected methods at all:

    super().__rtruediv__(other)   AttributeError

statistics.harmonic_mean over float-subclass data is the case that found it
(test_statistics TestHarmonicMean.test_types_conserved).  Two plain-number
answers came out of the same code path wrong as well: ``1 / MyInt(2)'' and
``True / 2'' both answered an exact Smalltalk Fraction, 1/2.

The last group is vars() on an instance with no __dict__ (test_statistics
TestNormalDist.test_slots).

Run this file under CPython (``python3 tests/python/numeric_subclass_operands.py'')
to see what it produces -- that is where the expectations come from.
"""


class TaggedFloat(float):
    """Every operator override tags its result, so the checks can see which
    method ran; each defers the arithmetic to float through super()."""

    def __truediv__(self, other):
        return ('truediv', super().__truediv__(other))

    def __rtruediv__(self, other):
        return ('rtruediv', super().__rtruediv__(other))

    def __radd__(self, other):
        return ('radd', super().__radd__(other))

    def __rsub__(self, other):
        return ('rsub', super().__rsub__(other))

    def __rpow__(self, other):
        return ('rpow', super().__rpow__(other))


class TaggedInt(int):
    def __radd__(self, other):
        return ('radd', super().__radd__(other))

    def __rmul__(self, other):
        return ('rmul', super().__rmul__(other))


class PlainFloat(float):
    pass


class PlainInt(int):
    pass


class Slotted:
    __slots__ = ('a',)

    def __init__(self):
        self.a = 1


class Unslotted:
    def __init__(self):
        self.b = 2


class SlottedUnderAPlainBase(Unslotted):
    __slots__ = ('a',)


def an_int_left_operand_lets_a_float_subclass_divide():
    return 1 / TaggedFloat(2.0) == ('rtruediv', 0.5)


def a_float_left_operand_gives_a_float_subclass_priority():
    return 1.0 + TaggedFloat(2.0) == ('radd', 3.0)


def a_bool_left_operand_lets_a_float_subclass_subtract():
    return True - TaggedFloat(0.25) == ('rsub', 0.75)


def an_int_left_operand_gives_an_int_subclass_priority():
    return 1 + TaggedInt(2) == ('radd', 3) and 3 * TaggedInt(2) == ('rmul', 6)


def a_float_left_operand_keeps_an_int_subclass_forward():
    result = 1.5 + TaggedInt(2)
    return type(result) is float and result == 3.5


def a_bool_left_operand_keeps_an_int_subclass_forward():
    result = True + TaggedInt(2)
    return type(result) is int and result == 3


def the_subclass_forward_method_still_runs_first_from_the_left():
    return TaggedFloat(1.0) / 4 == ('truediv', 0.25)


def a_reflected_power_reaches_the_subclass():
    return 2 ** TaggedFloat(3.0) == ('rpow', 8.0)


def an_unoverridden_subclass_divides_like_its_base():
    return (type(1 / PlainFloat(2.0)) is float and 1 / PlainFloat(2.0) == 0.5
            and type(7 * PlainInt(3)) is int and 7 * PlainInt(3) == 21)


def an_int_divided_by_an_int_subclass_is_a_float():
    result = 1 / PlainInt(2)
    return type(result) is float and result == 0.5


def a_bool_divided_by_an_int_is_a_float():
    return (type(True / 2) is float and True / 2 == 0.5
            and type(False / PlainInt(4)) is float and False / PlainInt(4) == 0.0)


def float_has_the_reflected_methods():
    return ((2.0).__radd__(1) == 3.0
            and (2.0).__rsub__(5) == 3.0
            and (2.0).__rmul__(3) == 6.0
            and (2.0).__rtruediv__(1) == 0.5
            and (2.0).__rfloordiv__(7) == 3.0
            and (2.0).__rmod__(7) == 1.0
            and (2.0).__rdivmod__(7) == (3.0, 1.0)
            and (2.0).__rpow__(3) == 9.0
            and (0.5).__rsub__(True) == 0.5)


def a_float_reflected_method_declines_a_non_number():
    return ((2.0).__radd__('x') is NotImplemented
            and (2.0).__rtruediv__(None) is NotImplemented)


def a_float_reflected_division_by_zero_raises():
    try:
        (0.0).__rtruediv__(1)
    except ZeroDivisionError:
        return True
    return False


def none_plus_a_float_is_still_a_type_error():
    try:
        None + 1.0
    except TypeError as e:
        return str(e) == "unsupported operand type(s) for +: 'NoneType' and 'float'"
    return False


def vars_refuses_an_instance_with_no_dict():
    try:
        vars(Slotted())
    except TypeError as e:
        return str(e) == 'vars() argument must have __dict__ attribute'
    return False


def vars_answers_the_dict_of_a_slotted_class_under_a_plain_base():
    return vars(SlottedUnderAPlainBase()) == {'b': 2}


CHECKS = (
    an_int_left_operand_lets_a_float_subclass_divide,
    a_float_left_operand_gives_a_float_subclass_priority,
    a_bool_left_operand_lets_a_float_subclass_subtract,
    an_int_left_operand_gives_an_int_subclass_priority,
    a_float_left_operand_keeps_an_int_subclass_forward,
    a_bool_left_operand_keeps_an_int_subclass_forward,
    the_subclass_forward_method_still_runs_first_from_the_left,
    a_reflected_power_reaches_the_subclass,
    an_unoverridden_subclass_divides_like_its_base,
    an_int_divided_by_an_int_subclass_is_a_float,
    a_bool_divided_by_an_int_is_a_float,
    float_has_the_reflected_methods,
    a_float_reflected_method_declines_a_non_number,
    a_float_reflected_division_by_zero_raises,
    none_plus_a_float_is_still_a_type_error,
    vars_refuses_an_instance_with_no_dict,
    vars_answers_the_dict_of_a_slotted_class_under_a_plain_base,
)


if __name__ == '__main__':
    for check in CHECKS:
        print('%-4s %s' % ('OK' if check() is True else 'FAIL', check.__name__))
