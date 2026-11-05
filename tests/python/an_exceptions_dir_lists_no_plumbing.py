"""Fixture: an exception's dir() lists neither __getitem__ nor an unset __notes__.

CPython's BaseException has no __getitem__, and its type none either, so
dir(ValueError) does not list one and ``hasattr(ValueError, '__getitem__')''
is False -- subscribing the class raises ``type 'ValueError' is not
subscriptable''.  __notes__ is no attribute until add_note stores the list in
the exception's own __dict__ (PEP 678).  Grail implements the class
subscription as a class-side __getitem__ and the unset __notes__ as a method
that raises the miss, and dir() listed both for every exception and every
exception class.

Every check here holds under CPython 3.14, which is what makes it evidence.
"""

import typing

r = {}

T = typing.TypeVar('T')


class Generic(Exception, typing.Generic[T]):
    pass


error = ValueError('x')
r['the_class_lists_neither'] = [name in dir(each) for each in (ValueError, BaseException, OSError)
                                for name in ('__getitem__', '__notes__')]
r['nor_does_the_class_have_a_getitem'] = [hasattr(each, '__getitem__') for each in (ValueError, BaseException)]
r['nor_does_an_instance_list_unset_notes'] = ['__notes__' in dir(error), hasattr(error, '__notes__')]
error.add_note('noted')
r['until_add_note_stores_them'] = ['__notes__' in dir(error), error.__notes__, vars(error)]
try:
    ValueError[int]
    r['subscribing_the_class_still_refuses'] = 'no error'
except TypeError as refusal:
    r['subscribing_the_class_still_refuses'] = str(refusal)
r['a_generic_one_still_subscribes'] = [Generic[int].__origin__ is Generic,
                                       ExceptionGroup[ValueError].__origin__ is ExceptionGroup]

EXPECTED = {
    'the_class_lists_neither': [False] * 6,
    'nor_does_the_class_have_a_getitem': [False, False],
    'nor_does_an_instance_list_unset_notes': [False, False],
    'until_add_note_stores_them': [True, ['noted'], {'__notes__': ['noted']}],
    'subscribing_the_class_still_refuses': "type 'ValueError' is not subscriptable",
    'a_generic_one_still_subscribes': [True, True],
}

DISAGREEMENTS = sorted(k for k in EXPECTED if r.get(k, '<missing>') != EXPECTED[k])
SUMMARY = '%d checks, %d disagreeing %r, keys match: %s' % (
    len(EXPECTED), len(DISAGREEMENTS), DISAGREEMENTS, sorted(r) == sorted(EXPECTED))


if __name__ == '__main__':
    for key in EXPECTED:
        actual = r.get(key, '<missing>')
        print('%-5s %-38s -> %r' % ('OK' if actual == EXPECTED[key] else 'FAIL', key, actual))
    print(SUMMARY)
