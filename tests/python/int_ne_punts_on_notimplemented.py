"""``x != 1'' where x's __ne__ declines and int's __eq__ declines too.

An operand that cannot handle the other type returns NotImplemented, and the
OPERATOR layer -- not the dunder -- decides what that means: try the reflected
dunder, then fall back to identity for ==/!=.  Grail's int.__ne__ was written as
``(self __eq__: other) not'', which is right whenever __eq__ answers a bool and
wrong exactly when it punts: ``not'' went to the NotImplemented singleton.

It is four methods, not one: int and float each carry the idiom, and so do
AbstractPyInt and AbstractPyFloat, the bases an int or float SUBCLASS is built
on -- which is how an IntEnum member reaches it.

That is not a Python-level error.  It is an uncatchable MessageNotUnderstood out
of the middle of an operator, so nothing records it against the comparison that
raised it -- a unittest run scores the whole module ERROR and names no test.

It takes a class that explicitly declines, which is why ``1 != object()'' was
always fine: object's __ne__ answers without consulting int's.  CPython's own
ipaddress declines exactly this way, so ``IPv4Interface(1) != 1'' raised.

Every expectation here was measured against CPython 3.14.
"""

import enum


class Weekday(enum.IntEnum):
    MONDAY = 1


class Perm(enum.IntFlag):
    READ = 2


RESULTS = {}


def check(name, got, want):
    RESULTS[name] = (got == want) or ('got: ' + repr(got)[:160])


class Punts:
    """__eq__/__ne__ that decline anything but their own kind."""

    def __init__(self, value=0):
        self.value = value

    def __eq__(self, other):
        if not isinstance(other, Punts):
            return NotImplemented
        return self.value == other.value

    def __ne__(self, other):
        if not isinstance(other, Punts):
            return NotImplemented
        return self.value != other.value


class MyInt(int):
    pass


class MyFloat(float):
    pass


class PuntsEqOnly:
    """Only __eq__ declines; __ne__ is the one Python derives from it."""

    def __eq__(self, other):
        if not isinstance(other, PuntsEqOnly):
            return NotImplemented
        return True


# ----------------------------------------------------------- the defect

check('a_declining_object_is_unequal_to_an_int', Punts() != 1, True)
check('with_the_int_written_on_the_left', 1 != Punts(), True)
check('the_same_for_a_bool_and_a_float', (Punts() != True, Punts() != 1.5),
      (True, True))
check('a_class_that_declines_only_in_eq', PuntsEqOnly() != 1, True)
check('and_the_equality_spelling_agrees',
      (Punts() == 1, 1 == Punts(), PuntsEqOnly() == 1), (False, False, False))
check('an_int_in_a_container_of_declining_objects',
      1 in [Punts(), Punts()], False)
check('two_of_them_still_compare_by_value',
      (Punts(1) != Punts(2), Punts(1) != Punts(1)), (True, False))

# An int or float SUBCLASS is a different pair of methods (AbstractPyInt /
# AbstractPyFloat), reached by the subclass and by every IntEnum member.
check('an_int_subclass_declines_the_same_way',
      (MyInt(1) != Punts(), Punts() != MyInt(1)), (True, True))
check('a_float_subclass_declines_the_same_way',
      (MyFloat(1.5) != Punts(), Punts() != MyFloat(1.5)), (True, True))
check('an_int_enum_member_declines_the_same_way',
      (Weekday.MONDAY != Punts(), Punts() != Weekday.MONDAY), (True, True))
check('an_int_flag_member_declines_the_same_way',
      (Perm.READ != Punts(), Punts() != Perm.READ), (True, True))

# ----------------------------------------------------------- unchanged

# int.__ne__ delegates to __eq__ rather than the native ~= so that the
# __index__ path is shared -- 0 != False has to answer False.  These say the
# punt did not cost that.
check('an_int_against_an_int', (1 != 2, 1 != 1), (True, False))
check('an_int_against_a_bool', (0 != False, 1 != True), (False, False))
check('an_int_against_a_float', (1 != 1.0, 1 != 1.5), (False, True))
check('an_int_against_an_unrelated_type', (1 != 'x', 1 != object()),
      (True, True))
check('an_int_against_none', 1 != None, True)
check('a_subclass_still_equals_the_value_it_carries',
      (MyInt(1) == 1, MyInt(1) != 1, MyFloat(1.5) == 1.5), (True, False, True))
check('an_int_enum_member_still_equals_its_value',
      (Weekday.MONDAY == 1, Weekday.MONDAY != 1), (True, False))


if __name__ == '__main__':
    for _name in sorted(RESULTS):
        _v = RESULTS[_name]
        print('%-4s %s' % ('OK' if _v is True else 'FAIL', _name),
              '' if _v is True else _v)
