"""Fixture: a starred GenericAlias pickles, through generic_alias_iterator.

``*tuple[int]'' -- PEP 646's unpacked alias -- pickles as
``next(iter(tuple[int]))'' (ga_reduce), and the iterator pickles as
``iter(tuple[int])'' (ga_iter_reduce), so the chain ends.  Grail iterated an
alias through a tuple_iterator over the starred copy, which pickled the
starred copy again, without end: test_genericalias' test_pickle ran the gem
out of memory.

Every EXPECTED check holds under CPython 3.14, which is what makes it
evidence.
"""

import pickle

r = {}


def _try(thunk):
    try:
        return ('ok', thunk())
    except BaseException as e:
        return (type(e).__name__, str(e))


def _round_trips():
    starred, = [*tuple[int]]
    out = []
    for proto in range(pickle.HIGHEST_PROTOCOL + 1):
        loaded = pickle.loads(pickle.dumps(starred, proto))
        out.append((repr(loaded), loaded == starred, loaded.__unpacked__))
    return sorted(set(out))


def _iterator():
    it = iter(list[int])
    kind = (type(it).__name__, type(it).__module__)
    first = next(it)
    try:
        next(it)
        exhausted = 'no StopIteration'
    except StopIteration:
        exhausted = 'StopIteration'
    return kind, repr(first), first.__unpacked__, exhausted


def _iterator_reduce():
    fn, args = iter(list[int]).__reduce__()
    return fn is iter, repr(args[0]), args[0].__unpacked__


def _iterator_pickles():
    it = pickle.loads(pickle.dumps(iter(dict[str, int])))
    return repr(next(it))


r['a starred alias round-trips through every protocol'] = _try(_round_trips)
r['iterating an alias yields it once, unpacked'] = _try(_iterator)
r['the iterator reduces to iter of the alias'] = _try(_iterator_reduce)
r['the iterator itself pickles'] = _try(_iterator_pickles)
r['unpacking still works'] = _try(lambda: [repr(x) for x in [*tuple[int, str]]])


EXPECTED = {
    'a starred alias round-trips through every protocol': ('ok', [('*tuple[int]', True, True)]),
    'iterating an alias yields it once, unpacked': (
        'ok', (('generic_alias_iterator', 'builtins'), '*list[int]', True, 'StopIteration')),
    'the iterator reduces to iter of the alias': ('ok', (True, 'list[int]', False)),
    'the iterator itself pickles': ('ok', '*dict[str, int]'),
    'unpacking still works': ('ok', ['*tuple[int, str]']),
}

DISAGREEMENTS = sorted(k for k in EXPECTED if r.get(k, '<missing>') != EXPECTED[k])
SUMMARY = '%d checks, %d disagreeing %r, keys match: %s' % (
    len(EXPECTED), len(DISAGREEMENTS), DISAGREEMENTS, sorted(r) == sorted(EXPECTED))


if __name__ == '__main__':
    for key in EXPECTED:
        actual = r[key]
        ok = actual == EXPECTED[key]
        print('%-5s %-52s -> %s' % ('OK' if ok else 'FAIL', key,
                                    'as expected' if ok else repr(actual)))
    print(SUMMARY)
