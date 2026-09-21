"""map(), filter() and zip() objects survive a pickle round trip.

CPython gives each of the three a `__reduce__` naming the TYPE and the live
source iterators -- `(map, (func, *iterators))` -- so an object pickles as "call
this again with these sources", and because the sources are iterators already
positioned, a HALF-CONSUMED object resumes where it left off.

Grail answered `NotImplemented` from the inherited `__reduce__`, so pickle fell
back to saving the class by reference and died with

    PicklingError: Can't pickle <class 'map_iterator'>: module '__main__' not
    found

-- which is true: Grail's map() is a BoundMethod on the builtins module and the
object it answers is a `map_iterator`, a class that is not reachable as
`builtins.map_iterator`. The fix names the CALLABLE instead, which is the same
object CPython ends up calling and does pickle as `builtins.map`.

`strict=` is the awkward half. It is keyword-only, so it cannot ride in the
positional argument tuple; CPython gives it a third `__reduce__` element and a
`__setstate__`, and it has to survive the round trip or a strict object silently
becomes a lenient one -- a wrong ANSWER rather than an error.

The callables here are all builtins because a lambda does not pickle in CPython
either; using one would test pickle's function support, not this.

Every expectation was measured against CPython 3.14.6.
"""

import pickle

RESULTS = {}


def check(name, got, want):
    RESULTS[name] = (got == want) or ('got: ' + repr(got)[:160])


def _round_trip(obj):
    return pickle.loads(pickle.dumps(obj))


# ------------------------------------------------ the plain round trip

check('map_round_trips', list(_round_trip(map(str, [1, 2, 3]))), ['1', '2', '3'])

check('filter_round_trips', list(_round_trip(filter(None, [0, 1, 2, 3]))),
      [1, 2, 3])

check('zip_round_trips', list(_round_trip(zip([1, 2], [3, 4]))),
      [(1, 3), (2, 4)])


# The TYPE has to come back, not merely something iterable: CPython's
# check_iter_pickle asserts type(itorg) == type(it) before it compares items.
def _type_name_after(obj):
    return type(_round_trip(obj)).__name__ == type(obj).__name__


check('map_keeps_its_type', _type_name_after(map(str, [1])), True)
check('filter_keeps_its_type', _type_name_after(filter(None, [1])), True)
check('zip_keeps_its_type', _type_name_after(zip([1], [2])), True)


# ------------------------------------- a half-consumed object resumes

def _after_one_next(obj):
    next(obj)
    return list(_round_trip(obj))


check('map_resumes_after_next', _after_one_next(map(str, [1, 2, 3])),
      ['2', '3'])

check('filter_resumes_after_next', _after_one_next(filter(None, [1, 2, 3])),
      [2, 3])

check('zip_resumes_after_next', _after_one_next(zip([1, 2, 3], [4, 5, 6])),
      [(2, 5), (3, 6)])


# ------------------------------------------------ more than one source

check('map_two_iterables', list(_round_trip(map(divmod, [7, 8], [2, 3]))),
      [(3, 1), (2, 2)])

check('zip_three_iterables',
      list(_round_trip(zip([1, 2], [3, 4], [5, 6]))),
      [(1, 3, 5), (2, 4, 6)])


# filter(None, ...) must reconstruct with None, not with some stand-in: None is
# what makes filter keep truthy items rather than call something.
check('filter_none_predicate_survives',
      list(_round_trip(filter(None, [0, 1, '', 'a', [], [2]]))),
      [1, 'a', [2]])

check('filter_callable_predicate_survives',
      list(_round_trip(filter(bool, [0, 1, 2]))), [1, 2])


# ------------------------------------------------------- strict= survives

def _strict_verdict(obj):
    """A strict object that lost its flag answers a SHORT LIST instead of
    raising, which is why this returns the outcome rather than asserting a
    raise: the wrong answer and the right one are both 'a list'."""
    try:
        return list(obj)
    except ValueError as exc:
        return 'ValueError: ' + str(exc)


check('zip_strict_survives_pickle',
      _strict_verdict(_round_trip(zip([1, 2], [3], strict=True))),
      'ValueError: zip() argument 2 is shorter than argument 1')

# divmod, not str: a two-iterable map calls func(x, y), and str(1, 3) is
# str(object, encoding) -- a TypeError that would mask what this checks.
check('map_strict_survives_pickle',
      _strict_verdict(_round_trip(map(divmod, [1, 2], [3], strict=True))),
      'ValueError: map() argument 2 is shorter than argument 1')

# ...and a NON-strict object must not acquire the flag from the state slot.
check('zip_non_strict_stays_lenient',
      _strict_verdict(_round_trip(zip([1, 2], [3]))), [(1, 3)])

check('map_non_strict_stays_lenient',
      _strict_verdict(_round_trip(map(divmod, [1, 2], [3]))), [(0, 1)])

# A strict object that is long enough still yields normally.
check('zip_strict_equal_lengths',
      _strict_verdict(_round_trip(zip([1, 2], [3, 4], strict=True))),
      [(1, 3), (2, 4)])


# --------------------------------------------- every protocol, not just one
_by_proto = []
for _p in range(pickle.HIGHEST_PROTOCOL + 1):
    _by_proto.append(list(pickle.loads(pickle.dumps(map(str, [1, 2]), _p))))
check('every_protocol_round_trips', _by_proto,
      [['1', '2']] * (pickle.HIGHEST_PROTOCOL + 1))


if __name__ == '__main__':
    for _name in sorted(RESULTS):
        _v = RESULTS[_name]
        print('%-4s %s' % ('OK' if _v is True else 'FAIL', _name),
              '' if _v is True else _v)
