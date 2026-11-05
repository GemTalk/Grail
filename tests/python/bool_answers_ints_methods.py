"""Fixture: bool answers the methods it inherits from int, as CPython's does.

CPython's bool is an int subclass (Objects/boolobject.c:171-211, PyBool_Type's
tp_base is PyLong_Type), so True has every int method bool does not define
itself.  Grail's bool is the kernel's Boolean, which answers only the ones
written for it: ``True.bit_count()'', ``True.__floor__()'' and
``True.__radd__(1)'' were AttributeErrors, and dir(bool) lacked them.  bool
defines its reflected bitwise operators itself, so two bools still answer a
bool (Objects/boolobject.c:87-110).

Every check here holds under CPython 3.14, which is what makes it evidence.
"""

r = {}

inherited = ('__ceil__', '__divmod__', '__floor__', '__lshift__', '__radd__', '__rand__', '__rdivmod__',
             '__rfloordiv__', '__rlshift__', '__rmod__', '__rmul__', '__ror__', '__round__', '__rpow__',
             '__rrshift__', '__rshift__', '__rsub__', '__rtruediv__', '__rxor__', '__trunc__',
             'bit_count', 'is_integer')
r['true_has_them'] = [name for name in inherited if not hasattr(True, name)]
r['dir_lists_them'] = [name for name in inherited if name not in dir(bool)]
r['the_unary_ones_answer_ints'] = [(each, type(each).__name__) for each in
                                   (True.__ceil__(), False.__floor__(), True.__round__(), True.__round__(1),
                                    True.__trunc__(), True.bit_count(), False.bit_count())]
r['is_integer'] = [True.is_integer(), False.is_integer()]
r['the_arithmetic_ones'] = [True.__divmod__(2), True.__lshift__(2), True.__rshift__(1), True.__radd__(1),
                            True.__rsub__(3), True.__rmul__(5), True.__rtruediv__(1), True.__rfloordiv__(3),
                            True.__rmod__(3), True.__rdivmod__(3), True.__rpow__(2), True.__rlshift__(1),
                            True.__rrshift__(4)]
class Plain:
    pass


r['a_non_int_is_not_implemented'] = [True.__radd__(Plain()) is NotImplemented,
                                     True.__rsub__(1.5) is NotImplemented,
                                     True.__lshift__('a') is NotImplemented]
try:
    Plain() + True
    r['the_refusal_names_bool'] = 'no error'
except TypeError as refusal:
    r['the_refusal_names_bool'] = str(refusal)
r['two_bools_still_answer_a_bool'] = [(each, type(each).__name__) for each in
                                      (True.__rand__(False), True.__ror__(False), True.__rxor__(True),
                                       True.__ror__(0))]

EXPECTED = {
    'true_has_them': [],
    'dir_lists_them': [],
    'the_unary_ones_answer_ints': [(1, 'int'), (0, 'int'), (1, 'int'), (1, 'int'), (1, 'int'), (1, 'int'),
                                   (0, 'int')],
    'is_integer': [True, True],
    'the_arithmetic_ones': [(0, 1), 4, 0, 2, 2, 5, 1.0, 3, 0, (3, 0), 2, 2, 2],
    'a_non_int_is_not_implemented': [True, True, True],
    'the_refusal_names_bool': "unsupported operand type(s) for +: 'Plain' and 'bool'",
    'two_bools_still_answer_a_bool': [(False, 'bool'), (True, 'bool'), (False, 'bool'), (1, 'int')],
}

DISAGREEMENTS = sorted(k for k in EXPECTED if r.get(k, '<missing>') != EXPECTED[k])
SUMMARY = '%d checks, %d disagreeing %r, keys match: %s' % (
    len(EXPECTED), len(DISAGREEMENTS), DISAGREEMENTS, sorted(r) == sorted(EXPECTED))


if __name__ == '__main__':
    for key in EXPECTED:
        actual = r.get(key, '<missing>')
        print('%-5s %-34s -> %r' % ('OK' if actual == EXPECTED[key] else 'FAIL', key, actual))
    print(SUMMARY)
