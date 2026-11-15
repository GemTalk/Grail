"""Fixture: bool reports int as its base, as in CPython.

bool is a subclass of int: ``bool.__bases__'' is (int,) and ``bool.__mro__''
(bool, int, object).  Grail's bool is built on a GemStone class whose
superclass is not int, and it reported (object,) and (bool, object), though
issubclass(bool, int) was already True.  Code that reads the bases saw a bool
with no int in them: inspect.getclasstree put bool beside int rather than
under it.  functools.singledispatch already sent True to an int handler, and
still does.  Every check holds under CPython 3.14, which is what makes it
evidence.
"""

import functools
import inspect

r = {}


def names(classes):
    return [cls.__name__ for cls in classes]


@functools.singledispatch
def kind(value):
    return 'object'


@kind.register
def _(value: int):
    return 'int'


@kind.register
def _(value: str):
    return 'str'


r['the_mro'] = [names(bool.__mro__), names(bool.mro()), names(inspect.getmro(bool)), names(type(True).__mro__)]
r['the_bases'] = [names(bool.__bases__), bool.__base__ is int]
r['the_mro_holds_the_very_int'] = [bool.__mro__[1] is int, bool.__mro__[-1] is object]
r['singledispatch_still_sends_a_bool_to_int'] = [kind(True), kind(False), kind(3), kind('x'), kind(1.5)]
r['int_and_subclassing_are_unchanged'] = [names(int.__mro__), names(int.__bases__), issubclass(bool, int),
                                          isinstance(True, int)]
r['a_class_tree_puts_bool_under_int'] = str(inspect.getclasstree([bool, int], unique=True))

EXPECTED = {
    'the_mro': [['bool', 'int', 'object']] * 4,
    'the_bases': [['int'], True],
    'the_mro_holds_the_very_int': [True, True],
    'singledispatch_still_sends_a_bool_to_int': ['int', 'int', 'int', 'str', 'object'],
    'int_and_subclassing_are_unchanged': [['int', 'object'], ['object'], True, True],
    'a_class_tree_puts_bool_under_int': "[(<class 'object'>, ()), [(<class 'int'>, (<class 'object'>,)), [(<class 'bool'>, (<class 'int'>,))]]]",
}

DISAGREEMENTS = sorted(k for k in EXPECTED if r.get(k, '<missing>') != EXPECTED[k])
SUMMARY = '%d checks, %d disagreeing %r, keys match: %s' % (
    len(EXPECTED), len(DISAGREEMENTS), DISAGREEMENTS, sorted(r) == sorted(EXPECTED))


if __name__ == '__main__':
    for key in EXPECTED:
        actual = r.get(key, '<missing>')
        print('%-5s %-38s -> %s' % ('OK' if actual == EXPECTED[key] else 'FAIL', key, ascii(actual)))
    print(SUMMARY)
