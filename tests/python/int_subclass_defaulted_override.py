"""Fixture: an int or float subclass's defaulted override wins, and pow() is ``**``.

A def with a defaulted parameter compiles to Grail's varargs form, and gets a
fixed-arity entry point only where a superclass already answers that
selector.  A subclass of int or float is rooted at a wrapper that answers the
builtin's methods by forwarding to its value, so the check said no, and
``def __pow__(self, other, mod=None)`` in ``class I(int)`` never ran for
``I(2) ** I(3)``.  CPython's pow() is the operator's own dispatch,
PyNumber_Power (Python/bltinmodule.c:2197-2202), so ``pow(2, I(3))`` tries
I's __rpow__, and a None modulus is the 2-argument form
(Objects/typeobject.c:10134-10135, Objects/longobject.c:4906), for the
methods too: ``(2).__pow__(3, None)`` was an uncatchable error
(test_descr test_binary_operator_override).  Every check here holds under
CPython 3.14, which is what makes it evidence.
"""

r = {}


def outcome(compute):
    try:
        return repr(compute())
    except Exception as exc:
        return (type(exc).__name__, str(exc))


class I(int):
    def __repr__(self):
        return "I(%r)" % int(self)

    def __add__(self, other):
        return I(int(self) + int(other))
    __radd__ = __add__

    def __pow__(self, other, mod=None):
        if mod is None:
            return I(pow(int(self), int(other)))
        return I(pow(int(self), int(other), int(mod)))

    def __rpow__(self, other, mod=None):
        if mod is None:
            return I(pow(int(other), int(self), mod))
        return I(pow(int(other), int(self), int(mod)))


class F(float):
    def __repr__(self):
        return "F(%r)" % float(self)

    def __pow__(self, other, mod=None):
        return F(float(self) ** other)


class Tagged(int):
    def bit_length(self, flag=False):
        return ('mine', flag)

    def __round__(self, ndigits=None):
        return ('rounded', ndigits)


r['int_subclass_pow'] = [outcome(lambda: I(2) ** I(3)), outcome(lambda: 2 ** I(3)),
                         outcome(lambda: I(2) ** 3), outcome(lambda: pow(I(2), I(3), I(5))),
                         outcome(lambda: pow(I(2), I(3), 5)), outcome(lambda: pow(I(2), 3, 5)),
                         outcome(lambda: pow(2, I(3), 5)), outcome(lambda: pow(2, 3, I(5)))]
r['int_subclass_add'] = [outcome(lambda: I(1) + I(2)), outcome(lambda: I(1) + 2),
                         outcome(lambda: 1 + I(2))]
r['reflected_pow_through_pow'] = [outcome(lambda: pow(2, I(3))), outcome(lambda: pow(I(2), 3))]
r['none_modulus'] = [outcome(lambda: pow(2, 3, None)), outcome(lambda: pow(2.0, 3, None)),
                     outcome(lambda: pow(I(2), 3, None)), outcome(lambda: pow(2, I(3), None)),
                     outcome(lambda: pow(base=2, exp=3, mod=None))]
r['pow_method_none_modulus'] = [outcome(lambda: (2).__pow__(3, None)),
                               outcome(lambda: (2.0).__pow__(3, None)),
                               outcome(lambda: (2.0).__pow__(3, 5))]
r['float_subclass_pow'] = [outcome(lambda: F(2.0) ** 2), outcome(lambda: pow(F(3.0), 2))]
r['other_defaulted_overrides'] = [outcome(lambda: Tagged(5).bit_length()),
                                  outcome(lambda: Tagged(5).bit_length(True)),
                                  outcome(lambda: round(Tagged(5))),
                                  outcome(lambda: round(Tagged(5), 2))]
r['unchanged'] = [outcome(lambda: pow(2, 10)), outcome(lambda: pow(2, -1)),
                  outcome(lambda: pow(3, 4, 5)), outcome(lambda: pow(2, 3, 0)),
                  outcome(lambda: pow('a', 2)), outcome(lambda: pow(2.0, 3, 5)),
                  outcome(lambda: pow(5, -1, 7)), outcome(lambda: (5).bit_length()),
                  outcome(lambda: round(7))]

EXPECTED = {
    'int_subclass_pow': ['I(8)', 'I(8)', 'I(8)', 'I(3)', 'I(3)', 'I(3)', 'I(3)', '3'],
    'int_subclass_add': ['I(3)', 'I(3)', 'I(3)'],
    'reflected_pow_through_pow': ['I(8)', 'I(8)'],
    'none_modulus': ['8', '8.0', 'I(8)', 'I(8)', '8'],
    'pow_method_none_modulus': ['8', '8.0', ('TypeError',
                                'pow() 3rd argument not allowed unless all arguments are integers')],
    'float_subclass_pow': ['F(4.0)', 'F(9.0)'],
    'other_defaulted_overrides': ["('mine', False)", "('mine', True)", "('rounded', None)",
                                  "('rounded', 2)"],
    'unchanged': ['1024', '0.5', '1', ('ValueError', 'pow() 3rd argument cannot be 0'),
                  ('TypeError', "unsupported operand type(s) for ** or pow(): 'str' and 'int'"),
                  ('TypeError', 'pow() 3rd argument not allowed unless all arguments are integers'),
                  '3', '3', '7'],
}

DISAGREEMENTS = sorted(k for k in EXPECTED if r.get(k, '<missing>') != EXPECTED[k])
SUMMARY = '%d checks, %d disagreeing %r, keys match: %s' % (
    len(EXPECTED), len(DISAGREEMENTS), DISAGREEMENTS, sorted(r) == sorted(EXPECTED))


if __name__ == '__main__':
    for key in EXPECTED:
        ok = r[key] == EXPECTED[key]
        print('%-28s %s' % (key, 'OK' if ok else 'FAIL'))
        if not ok:
            print('    got  %r' % (r[key],))
            print('    want %r' % (EXPECTED[key],))
    print(SUMMARY)
