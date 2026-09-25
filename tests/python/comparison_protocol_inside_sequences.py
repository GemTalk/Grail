"""A comparison must go through the OPERATOR, wherever it is made from.

Two places reached a comparison dunder directly and so lost the rule that gives
a proper subtype's reflected dunder priority:

1. ``___reflectedFirst___:`` looked for the reflected dunder only as a COMPILED
   method.  @functools.total_ordering installs its derived comparisons with
   setattr(cls, opname, opfunc), so they live in the class dict; the probe
   answered "object" and the subclass looked like it had no reflected method at
   all.

2. ``SequenceableCollection >> __lt__:`` and its three siblings compared the
   first differing pair with a direct ``a __lt__: b`` send, which bypasses the
   operator layer entirely.  So a tuple or list could order two elements the
   opposite way from how the same two compare on their own.

The pair below is the shape that makes the second one visible, and it is the
shape CPython's own ipaddress has: a subclass that carries MORE than its base,
so an equal-valued base instance is NOT equal to it.  Its inherited __lt__ then
computes a different answer from the base's, and which one runs decides the
result.

    Point(1) < Labeled(1)        -> True     (reflected Labeled.__gt__)
    (Point(1),) < (Labeled(1),)  -> True     same pair, same answer required

Before the repair the bare comparison was right and the one inside the tuple was
False, and sorted() put them in the opposite order.

Every expectation here was measured against CPython 3.14.
"""

import functools

RESULTS = {}


def check(name, got, want):
    RESULTS[name] = (got == want) or ('got: ' + repr(got)[:160])


@functools.total_ordering
class Point:
    """Ordered by x alone, the way ipaddress orders a bare address."""

    def __init__(self, x):
        self.x = x

    def __eq__(self, other):
        return isinstance(other, Point) and self.x == other.x

    def __lt__(self, other):
        if not isinstance(other, Point):
            return NotImplemented
        return self.x < other.x

    def __hash__(self):
        return hash(self.x)

    def __repr__(self):
        return '%s(%d)' % (type(self).__name__, self.x)


class Labeled(Point):
    """Carries more than its base, so an equal-x Point is not equal to it --
    the shape IPv4Interface has against IPv4Address.  Overrides no ordering."""

    def __eq__(self, other):
        if not Point.__eq__(self, other):
            return False
        return isinstance(other, Labeled)


def _error(fn):
    try:
        return fn()
    except TypeError as exc:
        return ('TypeError', str(exc))


# --------------------------------------------- the class-attribute dunder

# total_ordering's __gt__ is a class-dict entry, not a compiled method, and the
# reflected-priority probe never looked there.
check('a_class_attribute_reflected_dunder_gets_priority',
      Point(1) < Labeled(1), True)
check('and_the_other_direction_is_unchanged',
      Labeled(1) < Point(1), False)

# --------------------------------------------- the same pair inside a sequence

# These four were the ones that stayed wrong once the probe was fixed: the
# sequence compared its elements with a direct dunder send.
check('inside_a_one_element_tuple',
      (Point(1),) < (Labeled(1),), True)
check('inside_a_longer_tuple_after_an_equal_prefix',
      (0, Point(1)) < (0, Labeled(1)), True)
check('inside_a_list',
      [Point(1)] < [Labeled(1)], True)
check('sorted_agrees_with_the_bare_comparison',
      [type(t[0]).__name__ for t in sorted([(Labeled(1),), (Point(1),)])],
      ['Point', 'Labeled'])
check('the_reverse_direction_inside_a_tuple',
      (Labeled(1),) < (Point(1),), False)
check('equality_inside_a_tuple_matches_the_bare_equality',
      ((Point(1),) == (Labeled(1),), Point(1) == Labeled(1)), (False, False))

# --------------------------------------------- unchanged

# The element scan still uses the cheap comparison, and only the first DIFFERING
# pair goes through the operator, so ordinary sequences are untouched.
check('plain_numbers_and_strings',
      ((1, 2) < (1, 3), ('a', 'b') < ('a', 'c'), (1, 2) < (1, 2)),
      (True, True, False))
check('an_equal_prefix_then_the_shorter_one_wins',
      ((1, 2) < (1, 2, 3), (1, 2, 3) < (1, 2)), (True, False))
check('unorderable_elements_still_raise_the_same_TypeError',
      (_error(lambda: (1, 'a') < (1, 2)), _error(lambda: (1, 2) < (1, 'a'))),
      (('TypeError', "'<' not supported between instances of 'str' and 'int'"),
       ('TypeError', "'<' not supported between instances of 'int' and 'str'")))
check('all_four_orderings_on_the_subclass_pair',
      ((Point(1),) <= (Labeled(1),), (Point(1),) >= (Labeled(1),),
       (Point(1),) > (Labeled(1),), (Labeled(1),) >= (Point(1),)),
      (True, False, False, True))
check('a_tuple_of_total_ordering_values_by_value',
      ((Point(1),) < (Point(2),), (Point(2),) < (Point(1),)), (True, False))


if __name__ == '__main__':
    for _name in sorted(RESULTS):
        _v = RESULTS[_name]
        print('%-4s %s' % ('OK' if _v is True else 'FAIL', _name),
              '' if _v is True else _v)
