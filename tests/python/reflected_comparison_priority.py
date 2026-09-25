"""A subclass gets the reflected comparison first by BEING one, not by overriding.

For ``a < b'', CPython's do_richcompare tries b's reflected ``__gt__'' before
a's ``__lt__'' whenever type(b) is a proper subtype of type(a).  The test is on
the TYPE, not on the method: it asks only that the subtype have a rich-compare
slot, which every Python class has.  It does not ask whether the subclass
overrode anything.

Grail asked the second question.  A subclass that INHERITED the reflected dunder
was read as "no override, no priority", and the comparison went down the forward
path -- a different computation, because the operands are swapped, so the two
directions can disagree.

Measured: this cost only the four ORDERING operators.  ==/!= reach the priority
by a different route and were already correct, which is why the pair below sits
under "what already worked".

The operands being swapped is the whole point, so every check below records
WHICH method ran, not just the answer: a fixture that compared only the result
would pass while the wrong method computed it.

Every expectation here was measured against CPython 3.14.
"""

RESULTS = {}
CALLS = []


def check(name, got, want):
    RESULTS[name] = (got == want) or ('got: ' + repr(got)[:200])


def ran(expression):
    """The expression's value, and the methods it called, in order."""
    del CALLS[:]
    value = expression()
    return (value, list(CALLS))


class Base:
    def __lt__(self, other):
        CALLS.append('Base.__lt__')
        return 'base-lt'

    def __gt__(self, other):
        CALLS.append('Base.__gt__')
        return 'base-gt'

    def __le__(self, other):
        CALLS.append('Base.__le__')
        return 'base-le'

    def __ge__(self, other):
        CALLS.append('Base.__ge__')
        return 'base-ge'

    def __eq__(self, other):
        CALLS.append('Base.__eq__')
        return 'base-eq'

    def __ne__(self, other):
        CALLS.append('Base.__ne__')
        return 'base-ne'

    __hash__ = None


class Inherits(Base):
    """Overrides nothing -- the case that used to lose its priority."""


class Overrides(Base):
    def __gt__(self, other):
        CALLS.append('Overrides.__gt__')
        return 'sub-gt'


class Declines(Base):
    def __gt__(self, other):
        CALLS.append('Declines.__gt__')
        return NotImplemented


class Bare:
    """No comparison dunders at all, so only object's defaults."""


class BareSub(Bare):
    pass


# ----------------------------------------------------------- the defect

check('an_inheriting_subclass_gets_the_reflected_call_first',
      ran(lambda: Base() < Inherits()), ('base-gt', ['Base.__gt__']))
check('and_so_does_every_other_ordering_operator',
      (ran(lambda: Base() > Inherits()), ran(lambda: Base() <= Inherits()),
       ran(lambda: Base() >= Inherits())),
      (('base-lt', ['Base.__lt__']), ('base-ge', ['Base.__ge__']),
       ('base-le', ['Base.__le__'])))

# ----------------------------------------------------------- what already worked

# Measured: only the four ORDERING operators lost the priority.  ==/!= reach it
# by a different route and were already right, so this pair is a guard on that
# route rather than a check on the repair.
check('and_the_equality_pair_too',
      (ran(lambda: Base() == Inherits()), ran(lambda: Base() != Inherits())),
      (('base-eq', ['Base.__eq__']), ('base-ne', ['Base.__ne__'])))

check('an_overriding_subclass_still_gets_priority',
      ran(lambda: Base() < Overrides()), ('sub-gt', ['Overrides.__gt__']))
check('a_declining_reflected_call_falls_through_to_the_forward_one',
      ran(lambda: Base() < Declines()),
      ('base-lt', ['Declines.__gt__', 'Base.__lt__']))
check('the_same_type_on_both_sides_is_not_reflected',
      ran(lambda: Base() < Base()), ('base-lt', ['Base.__lt__']))
check('the_subclass_on_the_LEFT_is_not_reflected',
      (ran(lambda: Inherits() < Base()), ran(lambda: Overrides() < Base())),
      (('base-lt', ['Base.__lt__']), ('base-lt', ['Base.__lt__'])))
check('an_unrelated_type_is_not_reflected',
      ran(lambda: Base() < Bare()), ('base-lt', ['Base.__lt__']))
check('a_subclass_with_no_dunders_anywhere',
      (Bare() == BareSub(), Bare() != BareSub()), (False, True))


if __name__ == '__main__':
    for _name in sorted(RESULTS):
        _v = RESULTS[_name]
        print('%-4s %s' % ('OK' if _v is True else 'FAIL', _name),
              '' if _v is True else _v)
