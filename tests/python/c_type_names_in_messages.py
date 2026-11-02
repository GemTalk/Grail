"""Fixture: a type CPython implements in C is named by its tp_name in messages.

CPython's messages print a type's ``tp_name``, which is not ``__name__``.  A
class statement's is the bare name; a C type's carries its module:

    >>> collections.deque().x
    AttributeError: 'collections.deque' object has no attribute 'x'

Grail printed ``'deque' object`` for every one of them, Smalltalk-written
classes and Python-written stand-ins alike (``types.SimpleNamespace``,
``string.templatelib.Template``).  It now answers the dotted name for the
module and qualname CPython's own types have.

Every check here holds under CPython 3.14, which is what makes it evidence.
"""

import collections
import datetime
import decimal
import fractions
import functools
import io
import itertools
import operator
import re
import string.templatelib
import types
import weakref

r = {}


def outcome(thunk):
    try:
        return thunk()
    except Exception as e:
        return '%s: %s' % (type(e).__name__, e)


def missing(obj):
    return outcome(lambda: obj.no_such_attribute)


class deque:
    """A class statement's tp_name is its bare name, whatever it is called."""


class T:
    pass


r['instances'] = [missing(obj) for obj in (
    collections.deque(), collections.OrderedDict(), itertools.count(), functools.partial(len),
    re.compile('a'), types.SimpleNamespace(), datetime.date(2000, 1, 1), io.StringIO(),
    operator.itemgetter(1), string.templatelib.Template())]
r['type_objects'] = [missing(cls) for cls in (collections.deque, itertools.chain, datetime.timedelta, decimal.Context)]
r['len'] = outcome(lambda: len(itertools.count()))
referent = collections.OrderedDict()
r['weakref_repr'] = repr(weakref.ref(referent)).split(' at ')[1].split(';')[1]
r['bare_names_stay'] = [missing(obj) for obj in (
    T(), deque(), collections.Counter(), fractions.Fraction(1), 1, [])]

EXPECTED = {
    'instances': ["AttributeError: '%s' object has no attribute 'no_such_attribute'" % name for name in (
        'collections.deque', 'collections.OrderedDict', 'itertools.count', 'functools.partial',
        're.Pattern', 'types.SimpleNamespace', 'datetime.date', '_io.StringIO',
        'operator.itemgetter', 'string.templatelib.Template')],
    'type_objects': ["AttributeError: type object '%s' has no attribute 'no_such_attribute'" % name
                     for name in ('collections.deque', 'itertools.chain', 'datetime.timedelta', 'decimal.Context')],
    'len': "TypeError: object of type 'itertools.count' has no len()",
    'weakref_repr': " to 'collections.OrderedDict'",
    'bare_names_stay': ["AttributeError: '%s' object has no attribute 'no_such_attribute'" % name
                        for name in ('T', 'deque', 'Counter', 'Fraction', 'int', 'list')],
}

DISAGREEMENTS = sorted(k for k in EXPECTED if r.get(k, '<missing>') != EXPECTED[k])
SUMMARY = '%d checks, %d disagreeing %r, keys match: %s' % (
    len(EXPECTED), len(DISAGREEMENTS), DISAGREEMENTS, sorted(r) == sorted(EXPECTED))


if __name__ == '__main__':
    for key in EXPECTED:
        actual = r.get(key, '<missing>')
        print('%-5s %-32s -> %r' % ('OK' if actual == EXPECTED[key] else 'FAIL', key, actual))
    print(SUMMARY)
