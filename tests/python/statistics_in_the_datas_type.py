"""Fixtures for statistics.mean and the medians answering in the data's type.

Driven by PythonTests>>StatisticsTestCase>>testMeanAndMedianAnswerInTheDatasType.
Each check answers True when the behaviour matches CPython.

statistics added and compared with env-0 sends, which are Smalltalk's and not
Python's.  Over Decimals or Fractions that ended the session -- not an
exception, nothing ``except'' could catch:

    statistics.mean([Decimal('1.10'), Decimal('2.20')])
        a MessageNotUnderstood occurred (error 2010),
        a Decimal does not understand #'_generality'
    statistics.median([Decimal('3'), Decimal('1'), Decimal('2')])
        a Decimal does not understand #'<='

and over ints, ``mean([1, 2])'' answered a Smalltalk Fraction, 3/2, where
CPython answers 1.5.  Money is the ordinary case: it is a Decimal so that it
stays exact, and averaging it is the first thing anyone does with it.

The last checks are the guard: ints and floats already matched CPython (apart
from the Fraction) and must go on doing so.

Run this file under CPython (``python3 tests/python/statistics_in_the_datas_type.py'')
to see what it produces -- that is where the expectations come from.
"""

import statistics
from decimal import Decimal
from fractions import Fraction


def is_exactly(actual, expected):
    return type(actual) is type(expected) and actual == expected


def the_mean_of_decimals_is_a_decimal():
    return is_exactly(statistics.mean([Decimal('1.10'), Decimal('2.20')]),
                      Decimal('1.65'))


def the_mean_of_decimals_that_do_not_divide_is_to_context_precision():
    return is_exactly(statistics.mean([Decimal('1'), Decimal('2'), Decimal('4')]),
                      Decimal(7) / Decimal(3))


def the_mean_of_fractions_is_a_fraction():
    return is_exactly(statistics.mean([Fraction(1, 2), Fraction(1, 3)]),
                      Fraction(5, 12))


def the_median_of_an_odd_count_of_decimals_is_the_middle_one():
    return is_exactly(statistics.median([Decimal('3'), Decimal('1'), Decimal('2')]),
                      Decimal('2'))


def the_median_of_an_even_count_of_decimals_is_a_decimal():
    return is_exactly(statistics.median([Decimal('1.10'), Decimal('2.20')]),
                      Decimal('1.65'))


def the_median_of_fractions_is_a_fraction():
    return is_exactly(statistics.median([Fraction(1, 2), Fraction(1, 3)]),
                      Fraction(5, 12))


def median_low_and_high_of_decimals_are_the_decimals():
    data = [Decimal('2.20'), Decimal('1.10')]
    return (is_exactly(statistics.median_low(data), Decimal('1.10'))
            and is_exactly(statistics.median_high(data), Decimal('2.20')))


def the_mean_of_ints_that_do_not_divide_is_a_float():
    return is_exactly(statistics.mean([1, 2]), 1.5)


def the_mean_of_ints_that_divide_is_an_int():
    return is_exactly(statistics.mean([1, 2, 3]), 2)


def the_mean_of_floats_is_a_float():
    return is_exactly(statistics.mean([1.5, 2.5]), 2.0)


def the_median_of_ints_is_an_int_or_a_float():
    return (is_exactly(statistics.median([1, 3, 2]), 2)
            and is_exactly(statistics.median([1, 2]), 1.5))


CHECKS = (
    the_mean_of_decimals_is_a_decimal,
    the_mean_of_decimals_that_do_not_divide_is_to_context_precision,
    the_mean_of_fractions_is_a_fraction,
    the_median_of_an_odd_count_of_decimals_is_the_middle_one,
    the_median_of_an_even_count_of_decimals_is_a_decimal,
    the_median_of_fractions_is_a_fraction,
    median_low_and_high_of_decimals_are_the_decimals,
    the_mean_of_ints_that_do_not_divide_is_a_float,
    the_mean_of_ints_that_divide_is_an_int,
    the_mean_of_floats_is_a_float,
    the_median_of_ints_is_an_int_or_a_float,
)


if __name__ == '__main__':
    for check in CHECKS:
        print('%-4s %s' % ('OK' if check() is True else 'FAIL', check.__name__))
