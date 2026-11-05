"""Fixture: reversed is a class, as CPython's is.

CPython's reversed is a type (Objects/enumobject.c, PyReversed_Type) whose
call answers the argument's own __reversed__ when its type has one and
otherwise a reversed object walking the sequence down by index, with
__length_hint__, __reduce__ and __setstate__ (reversed_new_impl,
reversed_next, reversed_len, reversed_reduce, reversed_setstate).  Grail's
was a function: isinstance(x, reversed) raised, it could not be
subclassed, a reversed tuple or str read as a list_iterator or
str_iterator, and none of the protocol was there.

Every check here holds under CPython 3.14, which is what makes it evidence.
"""

import pickle

r = {}


def attempt(thunk):
    try:
        return thunk()
    except Exception as exception:
        return '%s: %s' % (type(exception).__name__, exception)


class Sequence:
    def __len__(self):
        return 3

    def __getitem__(self, index):
        return index * 10


class Own:
    def __reversed__(self):
        return iter([1, 2])


class LengthOnly:
    def __len__(self):
        return 1


class ItemsOnly:
    def __getitem__(self, index):
        return index


class Reversed(reversed):
    pass


sources = [(1, 2), 'ab', b'ab', Sequence(), range(3), {'a': 1}, Own()]
r['reversed_is_a_type'] = [isinstance(reversed, type), type(reversed).__name__, reversed.__name__,
                           reversed.__qualname__, reversed.__module__]
r['the_iterator_types'] = [type(reversed(each)).__name__ for each in sources]
r['the_items'] = [list(reversed(each)) for each in sources]
r['isinstance_asks_about_a_reversed_object'] = [isinstance(reversed(Sequence()), reversed),
                                                isinstance(reversed((1,)), reversed),
                                                isinstance(reversed(range(2)), reversed)]
r['it_subclasses'] = [type(Reversed(Sequence())).__name__, list(Reversed('ab')), type(Reversed(range(2))) is Reversed]
r['the_refusals'] = [attempt(lambda: reversed(5)), attempt(lambda: reversed()), attempt(lambda: reversed([], [])),
                     attempt(lambda: reversed([], x=1)), attempt(lambda: reversed(LengthOnly())),
                     attempt(lambda: reversed(ItemsOnly()))]
walk = reversed('abc')
next(walk)
protocol = [walk.__reduce__(), walk.__length_hint__(), walk.__setstate__(99)]
protocol += [list(walk), walk.__reduce__(), walk.__length_hint__()]
r['length_hint_reduce_and_setstate'] = protocol
low = reversed('abc')
low.__setstate__(-5)
r['a_low_state_leaves_nothing'] = list(low)
half = reversed((1, 2, 3))
next(half)
reloaded = pickle.loads(pickle.dumps(half))
r['a_pickle_round_trip_resumes'] = [type(reloaded).__name__, list(reloaded), list(half)]
r['its_repr'] = repr(reversed('a')).startswith('<reversed object at 0x')

EXPECTED = {
    'reversed_is_a_type': [True, 'type', 'reversed', 'reversed', 'builtins'],
    'the_iterator_types': ['reversed', 'reversed', 'reversed', 'reversed', 'range_iterator',
                           'dict_reversekeyiterator', 'list_iterator'],
    'the_items': [[2, 1], ['b', 'a'], [98, 97], [20, 10, 0], [2, 1, 0], ['a'], [1, 2]],
    'isinstance_asks_about_a_reversed_object': [True, True, False],
    'it_subclasses': ['Reversed', ['b', 'a'], False],
    'the_refusals': ["TypeError: 'int' object is not reversible", 'TypeError: reversed expected 1 argument, got 0',
                     'TypeError: reversed expected 1 argument, got 2', 'TypeError: reversed() takes no keyword arguments',
                     "TypeError: 'LengthOnly' object is not reversible",
                     "TypeError: object of type 'ItemsOnly' has no len()"],
    'length_hint_reduce_and_setstate': [(reversed, ('abc',), 1), 2, None, ['c', 'b', 'a'], (reversed, ((),)), 0],
    'a_low_state_leaves_nothing': [],
    'a_pickle_round_trip_resumes': ['reversed', [2, 1], [2, 1]],
    'its_repr': True,
}

DISAGREEMENTS = sorted(k for k in EXPECTED if r.get(k, '<missing>') != EXPECTED[k])
SUMMARY = '%d checks, %d disagreeing %r, keys match: %s' % (
    len(EXPECTED), len(DISAGREEMENTS), DISAGREEMENTS, sorted(r) == sorted(EXPECTED))


if __name__ == '__main__':
    for key in EXPECTED:
        actual = r.get(key, '<missing>')
        print('%-5s %-40s -> %r' % ('OK' if actual == EXPECTED[key] else 'FAIL', key, actual))
    print(SUMMARY)
