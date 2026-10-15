"""CPython's numbers ABCs supply concrete methods that subclasses inherit (#1619).

Grail's numbers ABCs supplied only Rational.__float__, so fractions.Fraction
had no .real or .imag (AttributeError), numbers.Integral.__index__ did not
exist, and a complete Real or Integral subclass lacked everything the ABC
promises it: Complex.__bool__ / __sub__ / __rsub__, Real.__complex__ / real /
imag / conjugate / __divmod__ / __rdivmod__, Integral.__index__ / __float__ /
numerator / denominator.  real, imag, numerator and denominator are read-only
properties there, and read back as property objects from the class.

EXPECTED is CPython 3.14's output; mismatches() is what the Smalltalk test case
asserts is empty.
"""

import fractions
import numbers
import operator

r = {}


def t(label, thunk):
    try:
        r[label] = repr(thunk())
    except Exception as e:
        r[label] = '%s: %s' % (type(e).__name__, e)


F = fractions.Fraction

class R(numbers.Real):
    def __init__(self, v): self.v = v
    def __repr__(self): return 'R(%r)' % self.v
    def __float__(self): return float(self.v)
    def __add__(self, o): return R(self.v + (o.v if isinstance(o, R) else o))
    def __radd__(self, o): return R(o + self.v)
    def __neg__(self): return R(-self.v)
    def __pos__(self): return R(self.v)
    def __floordiv__(self, o): return R(self.v // (o.v if isinstance(o, R) else o))
    def __rfloordiv__(self, o): return R(o // self.v)
    def __mod__(self, o): return R(self.v % (o.v if isinstance(o, R) else o))
    def __rmod__(self, o): return R(o % self.v)
    def __eq__(self, o): return float(self) == float(o)
    def __ne__(self, o): return not self == o
    __hash__ = object.__hash__
for n in ('__abs__','__ceil__','__floor__','__le__','__lt__','__mul__','__rmul__','__pow__','__rpow__','__round__','__truediv__','__rtruediv__','__trunc__'):
    setattr(R, n, lambda self, *a: NotImplemented)
R.__abstractmethods__ = frozenset()

class I(numbers.Integral):
    def __init__(self, v): self.v = v
    def __int__(self): return self.v
    def __pos__(self): return I(self.v)
    def __repr__(self): return 'I(%r)' % self.v
for n in numbers.Integral.__abstractmethods__ - {'__int__', '__pos__'}:
    setattr(I, n, lambda self, *a: NotImplemented)
I.__abstractmethods__ = frozenset()

x, z = R(7.5), R(0)
t('Fraction real/imag/conjugate', lambda: (F(3, 4).real, F(3, 4).imag, F(3, 4).conjugate()))
t('Fraction complex()', lambda: complex(F(3, 4)))
t('Real.real / imag / conjugate()', lambda: (x.real, x.imag, x.conjugate()))
t('complex(Real)', lambda: complex(x))
t('divmod(Real, 2)', lambda: divmod(x, 2))
t('divmod(10, Real)', lambda: divmod(10, R(4)))
t('Real - 2 (Complex.__sub__)', lambda: x - 2)
t('10 - Real (Complex.__rsub__)', lambda: 10 - x)
t('bool(Real)', lambda: (bool(x), bool(z)))
t('Real.real is read-only', lambda: setattr(x, 'real', 1))
t('Real.imag is read-only', lambda: setattr(x, 'imag', 1))
t('class read of Real.real', lambda: type(numbers.Real.__dict__['real']).__name__)
t('class attribute reads are properties', lambda: (type(numbers.Real.real).__name__, type(numbers.Real.imag).__name__, type(numbers.Integral.numerator).__name__, type(numbers.Integral.denominator).__name__))
t('conjugate is a method', lambda: type(numbers.Real.__dict__['conjugate']).__name__)
t('each ABC holds its own mixins', lambda: [
    all(n in vars(numbers.Complex) for n in ('__bool__', '__sub__', '__rsub__')),
    all(n in vars(numbers.Real) for n in ('__complex__', 'real', 'imag', 'conjugate', '__divmod__', '__rdivmod__')),
    all(n in vars(numbers.Integral) for n in ('__index__', '__float__', 'numerator', 'denominator'))])
t('Integral numerator/denominator', lambda: (I(5).numerator, I(5).denominator))
t('Integral __index__ / float', lambda: (operator.index(I(5)), float(I(5)), I(5).__index__()))
t('range over an Integral', lambda: list(range(I(3))))
t('Integral numerator is read-only', lambda: setattr(I(5), 'numerator', 2))
t('unbound Integral.__index__(5)', lambda: numbers.Integral.__index__(5))
t('Fraction arithmetic unchanged', lambda: (F(1, 3) + F(1, 6), F(1, 3) - F(1, 6), divmod(F(7, 2), 1), bool(F(0)), F(3, 4).numerator))
t('int and float unchanged', lambda: ((5).real, (5).numerator, (2.5).real, (2.5).imag))


EXPECTED = {
    'Fraction real/imag/conjugate': '(Fraction(3, 4), 0, Fraction(3, 4))',
    'Fraction complex()': '(0.75+0j)',
    'Real.real / imag / conjugate()': '(R(7.5), 0, R(7.5))',
    'complex(Real)': '(7.5+0j)',
    'divmod(Real, 2)': '(R(3.0), R(1.5))',
    'divmod(10, Real)': '(R(2), R(2))',
    'Real - 2 (Complex.__sub__)': 'R(5.5)',
    '10 - Real (Complex.__rsub__)': 'R(2.5)',
    'bool(Real)': '(True, False)',
    'Real.real is read-only': "AttributeError: property 'real' of 'R' object has no setter",
    'Real.imag is read-only': "AttributeError: property 'imag' of 'R' object has no setter",
    'class read of Real.real': "'property'",
    'class attribute reads are properties': "('property', 'property', 'property', 'property')",
    'conjugate is a method': "'function'",
    'each ABC holds its own mixins': '[True, True, True]',
    'Integral numerator/denominator': '(I(5), 1)',
    'Integral __index__ / float': '(5, 5.0, 5)',
    'range over an Integral': '[0, 1, 2]',
    'Integral numerator is read-only': "AttributeError: property 'numerator' of 'I' object has no setter",
    'unbound Integral.__index__(5)': '5',
    'Fraction arithmetic unchanged': '(Fraction(1, 2), Fraction(1, 6), (3, Fraction(1, 2)), False, 3)',
    'int and float unchanged': '(5, 5, 2.5, 0.0)',
}


def mismatches():
    """The rows that differ from CPython's, as 'label: got X, CPython Y'."""
    return ['%s: got %s, CPython %s' % (k, r.get(k), v)
            for k, v in EXPECTED.items() if r.get(k) != v]


if __name__ == '__main__':
    for k in sorted(EXPECTED):
        actual = r[k]
        print('%-4s %s: %r' % ('OK' if actual == EXPECTED[k] else 'DIFF', k, actual))
    for extra in sorted(set(r) - set(EXPECTED)):
        print('%-4s %s is not in EXPECTED' % ('DIFF', extra))
