"""Fixture: int's and float's operators take a Python INT, not an ``__index__``.

CPython's ``int.__add__`` (and every other binary slot of int, float and
Decimal) answers NotImplemented for an operand that is not an int, whatever
that operand implements.  So ``1 + o`` where ``o`` only defines ``__index__``
is a TypeError, ``3 == o`` is False, and ``[10, 20][o]`` is the place
``__index__`` is for.  An int SUBCLASS's instance, a bool or an IntEnum member
IS an int, and every operator takes it.

Grail asked a different question -- does the operand's OWN class compile an
``__index__``? -- in 45 places across Int.gs, Float.gs and Decimal.gs.  That
got both halves wrong:

  * a plain class with ``def __index__`` (or a setattr'd one) was accepted:
    ``1 + o`` was 4, ``1.5 < o`` True, ``2 ** o`` 8;
  * an int subclass's ``__index__`` is inherited from AbstractPyInt, never its
    own, so ``7 & MyInt(3)`` and ``1 << IntEnum.X`` raised TypeError, while
    ``2 ** MyInt(3)`` answered the float 8.0 and ``pow(2, True, 5)`` raised.

Fixed alongside, because the survey below exercises them:
  * ``7 & IntFlag.X`` asks the flag's ``__rand__`` first (subclass priority);
  * an int subclass's ``numerator``/``denominator``/``real``/``imag`` are
    values, not bound methods -- ``Decimal(1) < IntEnum.X`` multiplied by one.

EXPECTED is CPython 3.14's output for every row.
"""
import decimal
import enum


class I:
    def __index__(self):
        return 3


class IB(I):
    pass


class A(int):
    pass


class B(A):
    pass


class E(enum.IntEnum):
    X = 3


class F(enum.IntFlag):
    X = 3


class CA:
    pass


CA.__index__ = lambda self: 3

r = {}


def t(label, f):
    try:
        v = f()
    except Exception as e:
        v = type(e).__name__
    r[label] = repr(v)


OPERANDS = [('I', I), ('IB', IB), ('A', lambda: A(3)), ('B', lambda: B(3)),
            ('E', lambda: E.X), ('F', lambda: F.X), ('CA', CA),
            ('bool', lambda: True)]
for name, mk in OPERANDS:
    o = mk()
    t(name + ' 1+o', lambda: 1 + o)
    t(name + ' 7&o', lambda: 7 & o)
    t(name + ' 7//o', lambda: 7 // o)
    t(name + ' divmod', lambda: divmod(7, o))
    t(name + ' 3==o', lambda: 3 == o)
    t(name + ' 3>=o', lambda: 3 >= o)
    t(name + ' 1.5+o', lambda: 1.5 + o)
    t(name + ' 1.5<o', lambda: 1.5 < o)
    t(name + ' D+o', lambda: decimal.Decimal(1) + o)
    # Where __index__ IS the protocol.  Not for CA: a setattr'd __index__ is
    # found there by issue #1218's class-attribute lookup, not by anything here.
    if name != 'CA':
        t(name + ' [..][o]', lambda: [0, 1, 2, 3, 4][o])
        t(name + ' range', lambda: list(range(o)))
        t(name + ' hex', lambda: hex(o))
    t(name + ' 2**o', lambda: 2 ** o)
    t(name + ' 1<<o', lambda: 1 << o)

for name, mk in [('A', lambda: A(2)), ('E', lambda: E.X), ('bool', lambda: True)]:
    o = mk()
    t(name + ' 1.5**o', lambda: 1.5 ** o)
    t(name + ' pow3', lambda: pow(2, o, 5))
    t(name + ' 7|o', lambda: 7 | o)
    t(name + ' 7^o', lambda: 7 ^ o)
    t(name + ' 9>>o', lambda: 9 >> o)
    t(name + ' 7%o', lambda: 7 % o)
    t(name + ' 7/o', lambda: 7 / o)
    t(name + ' 1.5//o', lambda: 1.5 // o)
    t(name + ' 1.5%o', lambda: 1.5 % o)
    t(name + ' fdivmod', lambda: divmod(1.5, o))
    t(name + ' D<o', lambda: decimal.Decimal(1) < o)
    t(name + ' D*o', lambda: decimal.Decimal(1) * o)
    t(name + ' parts', lambda: (o.numerator, o.denominator, o.real, o.imag))
    t(name + ' parts type', lambda: type(o.real).__name__)


EXPECTED = {
    'I 1+o': "'TypeError'",
    'I 7&o': "'TypeError'",
    'I 7//o': "'TypeError'",
    'I divmod': "'TypeError'",
    'I 3==o': 'False',
    'I 3>=o': "'TypeError'",
    'I 1.5+o': "'TypeError'",
    'I 1.5<o': "'TypeError'",
    'I D+o': "'TypeError'",
    'I [..][o]': '3',
    'I range': '[0, 1, 2]',
    'I hex': "'0x3'",
    'I 2**o': "'TypeError'",
    'I 1<<o': "'TypeError'",
    'IB 1+o': "'TypeError'",
    'IB 7&o': "'TypeError'",
    'IB 7//o': "'TypeError'",
    'IB divmod': "'TypeError'",
    'IB 3==o': 'False',
    'IB 3>=o': "'TypeError'",
    'IB 1.5+o': "'TypeError'",
    'IB 1.5<o': "'TypeError'",
    'IB D+o': "'TypeError'",
    'IB [..][o]': '3',
    'IB range': '[0, 1, 2]',
    'IB hex': "'0x3'",
    'IB 2**o': "'TypeError'",
    'IB 1<<o': "'TypeError'",
    'A 1+o': '4',
    'A 7&o': '3',
    'A 7//o': '2',
    'A divmod': '(2, 1)',
    'A 3==o': 'True',
    'A 3>=o': 'True',
    'A 1.5+o': '4.5',
    'A 1.5<o': 'True',
    'A D+o': "Decimal('4')",
    'A [..][o]': '3',
    'A range': '[0, 1, 2]',
    'A hex': "'0x3'",
    'A 2**o': '8',
    'A 1<<o': '8',
    'B 1+o': '4',
    'B 7&o': '3',
    'B 7//o': '2',
    'B divmod': '(2, 1)',
    'B 3==o': 'True',
    'B 3>=o': 'True',
    'B 1.5+o': '4.5',
    'B 1.5<o': 'True',
    'B D+o': "Decimal('4')",
    'B [..][o]': '3',
    'B range': '[0, 1, 2]',
    'B hex': "'0x3'",
    'B 2**o': '8',
    'B 1<<o': '8',
    'E 1+o': '4',
    'E 7&o': '3',
    'E 7//o': '2',
    'E divmod': '(2, 1)',
    'E 3==o': 'True',
    'E 3>=o': 'True',
    'E 1.5+o': '4.5',
    'E 1.5<o': 'True',
    'E D+o': "Decimal('4')",
    'E [..][o]': '3',
    'E range': '[0, 1, 2]',
    'E hex': "'0x3'",
    'E 2**o': '8',
    'E 1<<o': '8',
    'F 1+o': '4',
    'F 7&o': '<F.X: 3>',
    'F 7//o': '2',
    'F divmod': '(2, 1)',
    'F 3==o': 'True',
    'F 3>=o': 'True',
    'F 1.5+o': '4.5',
    'F 1.5<o': 'True',
    'F D+o': "Decimal('4')",
    'F [..][o]': '3',
    'F range': '[0, 1, 2]',
    'F hex': "'0x3'",
    'F 2**o': '8',
    'F 1<<o': '8',
    'CA 1+o': "'TypeError'",
    'CA 7&o': "'TypeError'",
    'CA 7//o': "'TypeError'",
    'CA divmod': "'TypeError'",
    'CA 3==o': 'False',
    'CA 3>=o': "'TypeError'",
    'CA 1.5+o': "'TypeError'",
    'CA 1.5<o': "'TypeError'",
    'CA D+o': "'TypeError'",
    'CA 2**o': "'TypeError'",
    'CA 1<<o': "'TypeError'",
    'bool 1+o': '2',
    'bool 7&o': '1',
    'bool 7//o': '7',
    'bool divmod': '(7, 0)',
    'bool 3==o': 'False',
    'bool 3>=o': 'True',
    'bool 1.5+o': '2.5',
    'bool 1.5<o': 'False',
    'bool D+o': "Decimal('2')",
    'bool [..][o]': '1',
    'bool range': '[0]',
    'bool hex': "'0x1'",
    'bool 2**o': '2',
    'bool 1<<o': '2',
    'A 1.5**o': '2.25',
    'A pow3': '4',
    'A 7|o': '7',
    'A 7^o': '5',
    'A 9>>o': '2',
    'A 7%o': '1',
    'A 7/o': '3.5',
    'A 1.5//o': '0.0',
    'A 1.5%o': '1.5',
    'A fdivmod': '(0.0, 1.5)',
    'A D<o': 'True',
    'A D*o': "Decimal('2')",
    'A parts': '(2, 1, 2, 0)',
    'A parts type': "'int'",
    'E 1.5**o': '3.375',
    'E pow3': '3',
    'E 7|o': '7',
    'E 7^o': '4',
    'E 9>>o': '1',
    'E 7%o': '1',
    'E 7/o': '2.3333333333333335',
    'E 1.5//o': '0.0',
    'E 1.5%o': '1.5',
    'E fdivmod': '(0.0, 1.5)',
    'E D<o': 'True',
    'E D*o': "Decimal('3')",
    'E parts': '(3, 1, 3, 0)',
    'E parts type': "'int'",
    'bool 1.5**o': '1.5',
    'bool pow3': '2',
    'bool 7|o': '7',
    'bool 7^o': '6',
    'bool 9>>o': '4',
    'bool 7%o': '0',
    'bool 7/o': '7.0',
    'bool 1.5//o': '1.0',
    'bool 1.5%o': '0.5',
    'bool fdivmod': '(1.0, 0.5)',
    'bool D<o': 'False',
    'bool D*o': "Decimal('1')",
    'bool parts': '(1, 1, 1, 0)',
    'bool parts type': "'int'",
}



def mismatches(operand):
    """The rows for one operand (the label's first word) that differ from
    CPython's, as 'label: got X, CPython Y' -- what the Smalltalk test case
    asserts is empty."""
    return ['%s: got %s, CPython %s' % (k, r.get(k), v)
            for k, v in EXPECTED.items()
            if k.split()[0] == operand and r.get(k) != v]


if __name__ == '__main__':
    for key, expected in EXPECTED.items():
        actual = r.get(key)
        print('%-4s %s -> %s' % ('OK' if actual == expected else 'FAIL',
                                 key, actual))
    for extra in sorted(set(r) - set(EXPECTED)):
        print('FAIL %s is not in EXPECTED' % extra)
