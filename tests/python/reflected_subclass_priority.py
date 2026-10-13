"""Fixture: a subclass on the RIGHT of a comparison is asked first (#1495).

The data model: "If the operands are of different types, and the right
operand's type is a direct or indirect subclass of the left operand's type,
the reflected method of the right operand has priority."  Grail applied it
to user classes but not when the LEFT operand was an int, a float or a str:
a Python subclass of one of those does not inherit from the kernel class of
the builtin's values (``class C3(int)'' is an AbstractPyInt, 0 a
SmallInteger; ``class S(str)'' is rooted at Unicode32, 'a' a Unicode7), so
the subclass test never saw it.  ``0 == C3(11)'' never called C3.__eq__, and
neither did ``C3(11) in range(10)'', ``[0].count(C3(11))'' or ``.index'' --
test_range's test_types asserts the first of those.

KNOWN_DIVERGENCES holds the arithmetic half of the same rule, which Grail does
not apply yet: ``'a' + S('b')'' and ``Base() + Sub()'' still try the left
operand's __add__ first.

Every check here holds under CPython 3.14, which is what makes it evidence.
"""

import enum

r = {}


def _err(thunk):
    try:
        return thunk()
    except Exception as e:
        return type(e).__name__ + ': ' + str(e)


class C3(int):
    def __eq__(self, other): return 'C3.eq'
    def __ne__(self, other): return 'C3.ne'
    def __lt__(self, other): return 'C3.lt'
    def __gt__(self, other): return 'C3.gt'
    def __le__(self, other): return 'C3.le'
    def __ge__(self, other): return 'C3.ge'
    __hash__ = int.__hash__


class Yes(int):
    def __eq__(self, other): return True
    __hash__ = int.__hash__


class F(float):
    def __eq__(self, other): return 'F.eq'
    __hash__ = float.__hash__


class S(str):
    def __eq__(self, other): return 'S.eq'
    def __lt__(self, other): return 'S.lt'
    def __gt__(self, other): return 'S.gt'
    __hash__ = str.__hash__


c = C3(11)
r['int_left'] = (0 == c, 0 != c, 0 < c, 0 > c, 0 <= c, 0 >= c)
r['float_left'] = 1.0 == F(2)
r['str_left'] = ('a' == S('b'), 'a' < S('b'), 'a' > S('b'))
r['membership'] = (Yes(11) in list(range(10)), Yes(11) in range(10),
                   Yes(11) in (1, 2), [0].count(Yes(11)), [5, 0].index(Yes(11)))


class NI(int): pass
class NF(float): pass
class NS(str): pass


r['inherited_reflected_agrees'] = [
    (a == b, a != b, a < b, a > b, a <= b, a >= b, b == a, b < a)
    for a, b in ((0, NI(5)), (0.5, NF(2.5)), ('a', NS('b')))]


class Color(enum.IntEnum):
    RED = 1


class Letter(enum.StrEnum):
    A = 'a'


r['enums'] = (1 == Color.RED, 1 < Color.RED, 2 > Color.RED,
              'a' == Letter.A, 'b' > Letter.A)
r['not_a_subclass'] = (True == NI(1), False < NI(1), 1.0 == NI(1),
                       1 == NF(1.0), 0 < NF(0.5))


class Declines(int):
    def __eq__(self, other): return NotImplemented
    __hash__ = int.__hash__


r['declined_falls_back'] = (5 == Declines(5), 5 == Declines(6),
                            Declines(5) in [5])


class Raises(str):
    def __lt__(self, other): raise ValueError('lt')
    def __gt__(self, other): raise KeyError('gt')


r['reflected_runs_first'] = _err(lambda: 'a' < Raises('b'))
r['a_class_on_the_right'] = (0 == int, 'a' == str, 1 in [int, str, C3],
                             1.5 != float, Color.RED in Color)
r['sorting'] = (sorted([NI(3), 1, NI(2), 0]), max(['a', NS('z'), 'm']))
r['non_ascii'] = ('é' == NS('é'), 'a' < NS('é'),
                  '\U0001f600' > NS('a'))


class SR(str):
    def __radd__(self, other): return 'SR.radd'


class Base:
    def __add__(self, other): return 'Base.add'


class Sub(Base):
    def __radd__(self, other): return 'Sub.radd'


r['arithmetic_str'] = 'a' + SR('b')
r['arithmetic_user'] = Base() + Sub()


EXPECTED = {
    'int_left': ('C3.eq', 'C3.ne', 'C3.gt', 'C3.lt', 'C3.ge', 'C3.le'),
    'float_left': 'F.eq',
    'str_left': ('S.eq', 'S.gt', 'S.lt'),
    'membership': (True, True, True, 1, 0),
    'inherited_reflected_agrees': [(False, True, True, False, True, False, False, False)] * 3,
    'enums': (True, False, True, True, True),
    'not_a_subclass': (True, True, True, True, True),
    'declined_falls_back': (True, False, True),
    'reflected_runs_first': "KeyError: 'gt'",
    'a_class_on_the_right': (False, False, False, True, True),
    'sorting': ([0, 1, 2, 3], 'z'),
    'non_ascii': (True, True, True),
}

KNOWN_DIVERGENCES = {
    'arithmetic_str': 'SR.radd',
    'arithmetic_user': 'Sub.radd',
}

DISAGREEMENTS = sorted(k for k in EXPECTED if r.get(k, '<missing>') != EXPECTED[k])
SUMMARY = '%d checks, %d disagreeing %r, keys match: %s' % (
    len(EXPECTED), len(DISAGREEMENTS), DISAGREEMENTS,
    sorted(r) == sorted(list(EXPECTED) + list(KNOWN_DIVERGENCES)))


if __name__ == '__main__':
    for key in EXPECTED:
        actual = r[key]
        ok = actual == EXPECTED[key]
        print('%-5s %-28s -> %s' % ('OK' if ok else 'FAIL', key,
                                    'as expected' if ok else repr(actual)))
    for key, expected in KNOWN_DIVERGENCES.items():
        actual = r[key]
        print('%-5s %-28s -> %r' % ('OK' if actual == expected else 'XFAIL',
                                    key, actual))
    print(SUMMARY)
