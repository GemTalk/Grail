"""``enumerate`` is a TYPE, and ``reversed`` honours the sequence protocol.

enumerate used to be a builtins FUNCTION returning a materialized
list_iterator.  Three things follow from being a lazy type instead, all of
which CPython promises: ``class MyEnum(enumerate)`` has something to
subclass (a NameError before this, and where test.test_enumerate stopped at
import), ``type(enumerate(s)) is enumerate``, and an exception from the
source arrives when iteration reaches it rather than at construction.

reversed had no old-style sequence path at all: a class answering __len__
and __getitem__ fell through to the env-0 ``reverseDo:``, an uncatchable
Smalltalk MNU rather than a working iterator.

Every expectation below was checked against CPython 3.14.
"""

import pickle

RESULTS = {}


def check(name, fn, expected):
    try:
        RESULTS[name] = (fn() == expected)
    except Exception as exc:
        RESULTS[name] = 'raised %s: %s' % (type(exc).__name__, exc)


def raises_typeerror(fn):
    def run():
        try:
            fn()
        except TypeError:
            return 'TypeError'
        return 'no error'
    return run


# ------------------------------------------------------------- the type

check('is_a_type', lambda: isinstance(enumerate, type), True)
check('result_type_is_enumerate',
      lambda: type(enumerate('abc')) is enumerate, True)
check('iter_returns_self',
      lambda: (lambda e: iter(e) is e)(enumerate('abc')), True)
check('basic_pairs', lambda: list(enumerate('abc')),
      [(0, 'a'), (1, 'b'), (2, 'c')])
check('start_positional', lambda: list(enumerate('abc', 5)),
      [(5, 'a'), (6, 'b'), (7, 'c')])
check('start_keyword', lambda: list(enumerate('abc', start=5)),
      [(5, 'a'), (6, 'b'), (7, 'c')])
check('iterable_keyword', lambda: list(enumerate(iterable='abc')),
      [(0, 'a'), (1, 'b'), (2, 'c')])
check('both_keywords_reversed_order',
      lambda: list(enumerate(start=5, iterable='abc')),
      [(5, 'a'), (6, 'b'), (7, 'c')])
check('empty_source', lambda: list(enumerate('')), [])


class MyEnum(enumerate):
    pass


check('subclassable', lambda: list(MyEnum('ab')), [(0, 'a'), (1, 'b')])
check('subclass_type_is_subclass',
      lambda: type(MyEnum('ab')) is MyEnum, True)
check('subclass_takes_start', lambda: list(MyEnum('ab', 3)),
      [(3, 'a'), (4, 'b')])


# ------------------------------------------------------- argument errors

check('no_arguments', raises_typeerror(lambda: enumerate()), 'TypeError')
check('non_iterable', raises_typeerror(lambda: enumerate(1)), 'TypeError')
check('start_not_an_int',
      raises_typeerror(lambda: enumerate('abc', 'a')), 'TypeError')
check('too_many_arguments',
      raises_typeerror(lambda: enumerate('abc', 2, 3)), 'TypeError')
check('unknown_keyword_with_good_positional',
      raises_typeerror(lambda: enumerate(iterable=[], x=3)), 'TypeError')
check('unknown_keyword_only',
      raises_typeerror(lambda: enumerate(x=0)), 'TypeError')
# bool IS an int in Python, so it is accepted as a start.
check('bool_start_accepted', lambda: list(enumerate('ab', True)),
      [(1, 'a'), (2, 'b')])


class NoIter:
    """Has __next__ but neither __iter__ nor __getitem__."""
    def __next__(self):
        raise StopIteration


class BadIter:
    """__iter__ answers something that is not an iterator."""
    def __iter__(self):
        return self


check('not_iterable_at_construction',
      raises_typeerror(lambda: enumerate(NoIter())), 'TypeError')
check('iter_returns_non_iterator',
      raises_typeerror(lambda: enumerate(BadIter())), 'TypeError')


# --------------------------------------------------------------- laziness

class Boom:
    def __iter__(self):
        return self
    def __next__(self):
        raise ZeroDivisionError('boom')


def _construction_does_not_consume():
    enumerate(Boom())          # must NOT raise here
    return 'constructed'


check('construction_is_lazy', _construction_does_not_consume, 'constructed')


def _exception_propagates():
    try:
        list(enumerate(Boom()))
    except ZeroDivisionError:
        return 'ZeroDivisionError'
    return 'no error'


check('source_exception_propagates', _exception_propagates,
      'ZeroDivisionError')


# The old-style sequence protocol (__getitem__ only) is enumerable.
class GetItemOnly:
    def __init__(self, s):
        self.s = s
    def __getitem__(self, i):
        return self.s[i]


check('getitem_only_source', lambda: list(enumerate(GetItemOnly('abc'))),
      [(0, 'a'), (1, 'b'), (2, 'c')])


# ---------------------------------------------------------------- pickling

def _roundtrip(it):
    return pickle.loads(pickle.dumps(it))


check('pickle_preserves_type',
      lambda: type(_roundtrip(enumerate([10, 20]))) is enumerate, True)
check('pickle_preserves_contents',
      lambda: list(_roundtrip(enumerate([10, 20]))), [(0, 10), (1, 20)])


def _pickle_resumes():
    it = enumerate([10, 20, 30])
    next(it)
    return list(_roundtrip(it))


check('pickle_resumes_where_it_left_off', _pickle_resumes,
      [(1, 20), (2, 30)])
check('pickle_keeps_start',
      lambda: list(_roundtrip(enumerate([10, 20], 7))), [(7, 10), (8, 20)])


# ---------------------------------------------------------------- reversed

class Seq:
    """__len__ + __getitem__ and nothing else -- reversible in CPython."""
    def __init__(self, n):
        self.n = n
    def __len__(self):
        return self.n
    def __getitem__(self, i):
        if i < 0 or i >= self.n:
            raise IndexError(i)
        return str(i)


check('reversed_sequence_protocol', lambda: list(reversed(Seq(5))),
      ['4', '3', '2', '1', '0'])
check('reversed_empty_sequence', lambda: list(reversed(Seq(0))), [])
check('reversed_builtins_unchanged', lambda: list(reversed('abc')),
      ['c', 'b', 'a'])
check('reversed_range_unchanged', lambda: list(reversed(range(4))),
      [3, 2, 1, 0])


class NoLen:
    def __getitem__(self, i):
        return 1


class NoGetItem:
    def __len__(self):
        return 2


class Blocked:
    def __getitem__(self, i):
        return 1
    def __len__(self):
        return 2
    __reversed__ = None


check('reversed_without_len',
      raises_typeerror(lambda: reversed(NoLen())), 'TypeError')
check('reversed_without_getitem',
      raises_typeerror(lambda: reversed(NoGetItem())), 'TypeError')
# ``__reversed__ = None`` BLOCKS: the class would reverse perfectly well
# through the sequence protocol, which is exactly what the block refuses.
check('reversed_blocked_by_none',
      raises_typeerror(lambda: reversed(Blocked())), 'TypeError')


class OwnReversed:
    def __reversed__(self):
        return iter(['own'])


check('reversed_prefers_dunder', lambda: list(reversed(OwnReversed())),
      ['own'])
