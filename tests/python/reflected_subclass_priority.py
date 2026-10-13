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

The arithmetic half of the rule (#1545) differs in one respect: the right
operand goes first only when its reflected method is OVERLOADED -- its own,
not the left type's -- because CPython's slot_nb_* asks method_is_overloaded.
Grail always tried the left operand's forward method first, so ``'a' +
S('b')'' and ``Base() + Sub()'' never reached S.__radd__ or Sub.__radd__, and
``2 ** I(3)'' never reached an __rpow__ with a default.  The call ORDER is
recorded too: a reflected method that declines is not called again.

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


calls = []


def traced(thunk):
    del calls[:]
    try:
        value = thunk()
    except Exception as e:
        value = type(e).__name__
    return (value, list(calls))


class SR(str):
    def __radd__(self, other):
        calls.append('SR.radd')
        return 'SR.radd'


class Base:
    def __add__(self, other):
        calls.append('Base.add')
        return 'Base.add'

    def __radd__(self, other):
        calls.append('Base.radd')
        return 'Base.radd'

    def __sub__(self, other):
        calls.append('Base.sub')
        return NotImplemented


class Sub(Base):
    def __radd__(self, other):
        calls.append('Sub.radd')
        return 'Sub.radd'

    def __rsub__(self, other):
        calls.append('Sub.rsub')
        return 'Sub.rsub'


class SubInherits(Base):
    pass


class SubDeclines(Base):
    def __radd__(self, other):
        calls.append('SubDeclines.radd')
        return NotImplemented


class IP(int):
    def __rpow__(self, other, mod=None):
        calls.append('IP.rpow')
        return 'IP.rpow'


class IDecl(int):
    def __radd__(self, other):
        calls.append('IDecl.radd')
        return NotImplemented


class L(list):
    def __radd__(self, other):
        calls.append('L.radd')
        return 'L.radd'


r['arithmetic_str'] = traced(lambda: 'a' + SR('b'))
r['arithmetic_user'] = traced(lambda: Base() + Sub())
r['arithmetic_inherited_is_no_priority'] = (traced(lambda: Base() + SubInherits()),
                                            traced(lambda: 'a' + NS('b')))
r['arithmetic_declined_runs_forward_once'] = (traced(lambda: Base() + SubDeclines()),
                                              traced(lambda: 1 + IDecl(2)))
r['arithmetic_reflected_before_a_declining_forward'] = traced(lambda: Base() - Sub())
r['arithmetic_reflected_with_a_default'] = traced(lambda: 2 ** IP(3))
r['arithmetic_list'] = traced(lambda: [1] + L([2]))
r['arithmetic_same_class'] = traced(lambda: Sub() + Sub())
# bytearray is a subtype of object and its __rmod__ declines; object has no
# __mod__ at all, so the answer is CPython's TypeError (test_bytes test_rmod).
r['arithmetic_no_forward_after_a_decline'] = _err(lambda: object() % bytearray(b'abc'))


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
    'arithmetic_str': ('SR.radd', ['SR.radd']),
    'arithmetic_user': ('Sub.radd', ['Sub.radd']),
    'arithmetic_inherited_is_no_priority': (('Base.add', ['Base.add']), ('ab', [])),
    'arithmetic_declined_runs_forward_once': (
        ('Base.add', ['SubDeclines.radd', 'Base.add']), (3, ['IDecl.radd'])),
    'arithmetic_reflected_before_a_declining_forward': ('Sub.rsub', ['Sub.rsub']),
    'arithmetic_reflected_with_a_default': ('IP.rpow', ['IP.rpow']),
    'arithmetic_list': ('L.radd', ['L.radd']),
    'arithmetic_same_class': ('Base.add', ['Base.add']),
    'arithmetic_no_forward_after_a_decline':
        "TypeError: unsupported operand type(s) for %: 'object' and 'bytearray'",
}

KNOWN_DIVERGENCES = {}

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
