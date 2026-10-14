"""The numbers ABCs refuse instantiation while abstract methods remain (#1592).

CPython's numbers.Complex, Real, Rational and Integral are ABCMeta classes
with abstract methods, so instantiating one -- or a subclass that leaves any
unimplemented -- raises TypeError naming them.  Grail's are Smalltalk classes,
and built an object every time.  Number declares no abstract methods and is
instantiable in both.

The set is computed when a subclass is defined, as ABCMeta.__new__ does, so a
method assigned to the class afterwards does not make it instantiable in
either runtime.  fractions.Fraction, a complete Rational, still builds.

EXPECTED is CPython 3.14's output; mismatches() is what the Smalltalk test case
asserts is empty.
"""

import decimal
import fractions
import numbers

r = {}


def t(label, thunk):
    try:
        r[label] = repr(thunk())
    except Exception as e:
        r[label] = '%s: %s' % (type(e).__name__, e)


def k(o):
    return type(o).__name__


t('Number() builds: it declares no abstract methods', lambda: k(numbers.Number()))
t('Complex()', lambda: numbers.Complex())
t('Real()', lambda: numbers.Real())
t('Rational()', lambda: numbers.Rational())
t('Integral()', lambda: numbers.Integral())
t('type-built empty Integral', lambda: type('C', (numbers.Integral,), {})())
class E(numbers.Real): pass
t('empty Real subclass', lambda: E())
class P(numbers.Rational):
    numerator = 1
    denominator = 2
t('partial Rational', lambda: P())
class Full(numbers.Real):
    def __init__(self, v): self.v = v
    def __abs__(self): return Full(abs(self.v))
    def __add__(self, o): return NotImplemented
    __radd__ = __add__
    def __ceil__(self): return 0
    def __eq__(self, o): return self is o
    def __hash__(self): return id(self)
    def __float__(self): return float(self.v)
    def __floor__(self): return 0
    def __floordiv__(self, o): return 0
    def __rfloordiv__(self, o): return 0
    def __le__(self, o): return True
    def __lt__(self, o): return False
    def __mod__(self, o): return 0
    def __rmod__(self, o): return 0
    def __mul__(self, o): return 0
    def __rmul__(self, o): return 0
    def __neg__(self): return self
    def __pos__(self): return self
    def __pow__(self, o, mod=None): return 0
    def __rpow__(self, o): return 0
    def __round__(self, n=None): return 0
    def __truediv__(self, o): return 0
    def __rtruediv__(self, o): return 0
    def __trunc__(self): return 0
t('complete Real subclass', lambda: (k(Full(2.5)), float(Full(2.5))))
class Sub(Full): pass
t('subclass of complete', lambda: k(Sub(1)))
t('Fraction still builds', lambda: fractions.Fraction(3, 6))
t('Fraction arithmetic', lambda: fractions.Fraction(1, 3) + fractions.Fraction(1, 6))
t('Decimal', lambda: decimal.Decimal('1.5') + 1)
t('__abstractmethods__ Number', lambda: sorted(numbers.Number.__abstractmethods__))
t('__abstractmethods__ Rational', lambda: sorted(numbers.Rational.__abstractmethods__))
t('__abstractmethods__ partial', lambda: sorted(P.__abstractmethods__))
t('__abstractmethods__ full', lambda: sorted(Full.__abstractmethods__))
t('__abstractmethods__ Fraction', lambda: sorted(fractions.Fraction.__abstractmethods__))
class Late(numbers.Complex): pass
for n in numbers.Complex.__abstractmethods__:
    setattr(Late, n, lambda self, *a: 0)
t('methods assigned after class creation', lambda: Late())
class Mixin:
    def __int__(self): return 0
class MI(Mixin, numbers.Number): pass
t('MI over Number', lambda: k(MI()))
t('isinstance', lambda: (isinstance(1, numbers.Integral), isinstance(1.5, numbers.Real), isinstance(fractions.Fraction(1), numbers.Rational)))


EXPECTED = {
    'Number() builds: it declares no abstract methods': "'Number'",
    'Complex()': "TypeError: Can't instantiate abstract class Complex without an implementation for abstract methods '__abs__', '__add__', '__complex__', '__eq__', '__mul__', '__neg__', '__pos__', '__pow__', '__radd__', '__rmul__', '__rpow__', '__rtruediv__', '__truediv__', 'conjugate', 'imag', 'real'",
    'Real()': "TypeError: Can't instantiate abstract class Real without an implementation for abstract methods '__abs__', '__add__', '__ceil__', '__eq__', '__float__', '__floor__', '__floordiv__', '__le__', '__lt__', '__mod__', '__mul__', '__neg__', '__pos__', '__pow__', '__radd__', '__rfloordiv__', '__rmod__', '__rmul__', '__round__', '__rpow__', '__rtruediv__', '__truediv__', '__trunc__'",
    'Rational()': "TypeError: Can't instantiate abstract class Rational without an implementation for abstract methods '__abs__', '__add__', '__ceil__', '__eq__', '__floor__', '__floordiv__', '__le__', '__lt__', '__mod__', '__mul__', '__neg__', '__pos__', '__pow__', '__radd__', '__rfloordiv__', '__rmod__', '__rmul__', '__round__', '__rpow__', '__rtruediv__', '__truediv__', '__trunc__', 'denominator', 'numerator'",
    'Integral()': "TypeError: Can't instantiate abstract class Integral without an implementation for abstract methods '__abs__', '__add__', '__and__', '__ceil__', '__eq__', '__floor__', '__floordiv__', '__int__', '__invert__', '__le__', '__lshift__', '__lt__', '__mod__', '__mul__', '__neg__', '__or__', '__pos__', '__pow__', '__radd__', '__rand__', '__rfloordiv__', '__rlshift__', '__rmod__', '__rmul__', '__ror__', '__round__', '__rpow__', '__rrshift__', '__rshift__', '__rtruediv__', '__rxor__', '__truediv__', '__trunc__', '__xor__'",
    'type-built empty Integral': "TypeError: Can't instantiate abstract class C without an implementation for abstract methods '__abs__', '__add__', '__and__', '__ceil__', '__eq__', '__floor__', '__floordiv__', '__int__', '__invert__', '__le__', '__lshift__', '__lt__', '__mod__', '__mul__', '__neg__', '__or__', '__pos__', '__pow__', '__radd__', '__rand__', '__rfloordiv__', '__rlshift__', '__rmod__', '__rmul__', '__ror__', '__round__', '__rpow__', '__rrshift__', '__rshift__', '__rtruediv__', '__rxor__', '__truediv__', '__trunc__', '__xor__'",
    'empty Real subclass': "TypeError: Can't instantiate abstract class E without an implementation for abstract methods '__abs__', '__add__', '__ceil__', '__eq__', '__float__', '__floor__', '__floordiv__', '__le__', '__lt__', '__mod__', '__mul__', '__neg__', '__pos__', '__pow__', '__radd__', '__rfloordiv__', '__rmod__', '__rmul__', '__round__', '__rpow__', '__rtruediv__', '__truediv__', '__trunc__'",
    'partial Rational': "TypeError: Can't instantiate abstract class P without an implementation for abstract methods '__abs__', '__add__', '__ceil__', '__eq__', '__floor__', '__floordiv__', '__le__', '__lt__', '__mod__', '__mul__', '__neg__', '__pos__', '__pow__', '__radd__', '__rfloordiv__', '__rmod__', '__rmul__', '__round__', '__rpow__', '__rtruediv__', '__truediv__', '__trunc__'",
    'complete Real subclass': "('Full', 2.5)",
    'subclass of complete': "'Sub'",
    'Fraction still builds': 'Fraction(1, 2)',
    'Fraction arithmetic': 'Fraction(1, 2)',
    'Decimal': "Decimal('2.5')",
    '__abstractmethods__ Number': '[]',
    '__abstractmethods__ Rational': "['__abs__', '__add__', '__ceil__', '__eq__', '__floor__', '__floordiv__', '__le__', '__lt__', '__mod__', '__mul__', '__neg__', '__pos__', '__pow__', '__radd__', '__rfloordiv__', '__rmod__', '__rmul__', '__round__', '__rpow__', '__rtruediv__', '__truediv__', '__trunc__', 'denominator', 'numerator']",
    '__abstractmethods__ partial': "['__abs__', '__add__', '__ceil__', '__eq__', '__floor__', '__floordiv__', '__le__', '__lt__', '__mod__', '__mul__', '__neg__', '__pos__', '__pow__', '__radd__', '__rfloordiv__', '__rmod__', '__rmul__', '__round__', '__rpow__', '__rtruediv__', '__truediv__', '__trunc__']",
    '__abstractmethods__ full': '[]',
    '__abstractmethods__ Fraction': '[]',
    'methods assigned after class creation': "TypeError: Can't instantiate abstract class Late without an implementation for abstract methods '__abs__', '__add__', '__complex__', '__eq__', '__mul__', '__neg__', '__pos__', '__pow__', '__radd__', '__rmul__', '__rpow__', '__rtruediv__', '__truediv__', 'conjugate', 'imag', 'real'",
    'MI over Number': "'MI'",
    'isinstance': '(True, True, True)',
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
