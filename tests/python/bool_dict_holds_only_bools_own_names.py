"""Fixture: bool's __dict__ holds only bool's own names.

CPython's ``bool.__dict__`` has ten entries: the logical operators, __repr__,
__new__ and __doc__.  Everything else a bool does it inherits from int, and
``inspect.classify_class_attrs`` and doctest's finder say so.  Grail implements
int's methods on Boolean itself, since Boolean is no Integer, and listed all of
them in bool's __dict__: 62 entries, each one naming bool as its home, and three
of int's doctests found a second time as bool's.  Every check holds under
CPython 3.14, which is what makes it evidence.
"""

import builtins
import doctest
import inspect

r = {}

INT_NAMES = ('bit_length', 'to_bytes', 'from_bytes', 'real', '__add__', '__eq__', '__hash__', '__bool__')

r['bool_lists_cpythons_ten_names'] = sorted(vars(bool))
r['int_methods_are_not_bools'] = [name in vars(bool) for name in INT_NAMES]
r['int_still_holds_them'] = [name in vars(int) for name in INT_NAMES]
r['the_ten_keep_their_kinds'] = [type(vars(bool)[name]).__name__ for name in ('__and__', '__doc__', '__new__', '__repr__')]

homes = {attribute.name: attribute.defining_class.__name__ for attribute in inspect.classify_class_attrs(bool)}
r['classify_names_int_as_their_home'] = [homes[name] for name in
                                         ('bit_length', 'to_bytes', 'from_bytes', 'real', '__add__', '__hash__',
                                          '__and__', '__repr__', '__new__')]
r['builtins_doctests_name_no_bool_method'] = [test.name for test in doctest.DocTestFinder().find(builtins)
                                              if test.examples and test.name.startswith('builtins.bool')]
r['reads_through_bool_still_work'] = [True.bit_length(), bool.bit_length(True), True.to_bytes(1, 'big'),
                                      type(bool.from_bytes(b'\x01', 'big')).__name__, True + True, hash(True),
                                      str(True), True & False, bool.__and__(True, False), True.real,
                                      type(True.real).__name__]

EXPECTED = {
    'bool_lists_cpythons_ten_names': ['__and__', '__doc__', '__invert__', '__new__', '__or__', '__rand__',
                                      '__repr__', '__ror__', '__rxor__', '__xor__'],
    'int_methods_are_not_bools': [False] * 8,
    'int_still_holds_them': [True] * 8,
    'the_ten_keep_their_kinds': ['wrapper_descriptor', 'str', 'builtin_function_or_method', 'wrapper_descriptor'],
    'classify_names_int_as_their_home': ['int'] * 6 + ['bool'] * 3,
    'builtins_doctests_name_no_bool_method': [],
    'reads_through_bool_still_work': [1, 1, b'\x01', 'bool', 2, 1, 'True', False, False, 1, 'int'],
}

DISAGREEMENTS = sorted(k for k in EXPECTED if r.get(k, '<missing>') != EXPECTED[k])
SUMMARY = '%d checks, %d disagreeing %r, keys match: %s' % (
    len(EXPECTED), len(DISAGREEMENTS), DISAGREEMENTS, sorted(r) == sorted(EXPECTED))


if __name__ == '__main__':
    for key in EXPECTED:
        actual = r.get(key, '<missing>')
        print('%-5s %-44s -> %s' % ('OK' if actual == EXPECTED[key] else 'FAIL', key, ascii(actual)))
    print(SUMMARY)
