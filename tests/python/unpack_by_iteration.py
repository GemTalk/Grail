"""Fixture: tuple unpacking follows CPython's UNPACK_SEQUENCE / UNPACK_EX.

test_unpack's doctests (which first ran in 0294a688) failed 12 examples.
Grail turned anything that was not a sequence into a list before checking
the count, and passed an object with only __getitem__ through unchecked.
That gave four visible differences:

* ``x, y, z = it'' read the WHOLE iterator; CPython takes one value more
  than there are targets, so next(it) afterwards is 4 for iter(range(100)).
* ``a, b = Seq()'' over a three-item __getitem__ sequence succeeded, and
  ``a, b, c, d = Seq()'' raised IndexError; CPython asks for exactly one value
  more (index 3 here) and raises ValueError.
* ``a, b, c = 7'' said ``'int' object is not iterable''; UNPACK says ``cannot
  unpack non-iterable int object''.
* An exact tuple, list or dict reports its size in ``too many values to
  unpack (expected 2, got 3)''; anything else omits it.

A for-loop target is unpacked by the same check, so it is covered too.

Asking for that one extra value exposed functools' CacheInfo, whose
__getitem__ ran off its end with a raw kernel error instead of IndexError, so
``hits, misses, maxsize, currsize = f.cache_info()'' died (test_functools'
test_lru); it is checked here as the tuple CPython's is.

Every EXPECTED check holds under CPython 3.14, which is what makes it
evidence.
"""

r = {}


def _err(thunk):
    try:
        return thunk()
    except Exception as e:
        return type(e).__name__ + ': ' + str(e)


class Seq:
    def __getitem__(self, i):
        if 0 <= i < 3:
            return i
        raise IndexError


class BozoError(Exception):
    pass


class BadSeq:
    def __getitem__(self, i):
        if 0 <= i < 3:
            return i
        if i == 3:
            raise BozoError('asked for index 3')
        raise IndexError


class BadLength:
    def __len__(self):
        return 1

    def __getitem__(self, i):
        return i * 2


class OwnTypeError:
    def __iter__(self):
        raise TypeError('mine')


class ListSub(list):
    pass


def _two(v):
    a, b = v
    return a, b


def _three(v):
    a, b, c = v
    return a, b, c


def _four(v):
    a, b, c, d = v
    return a


def _star(v):
    a, *b, c = v
    return a, b, c


def _iterator_left_over():
    it = iter(range(100))
    try:
        x, y, z = it
    except ValueError as e:
        return str(e), next(it)


def _star_takes_all():
    it = iter(range(5))
    a, *b = it
    return a, b, list(it)


def _for(items):
    out = []
    for a, b in items:
        out.append((a, b))
    return out


def _for_star(items):
    return [(a, b) for a, *b in [list(x) for x in items]]


def _gen(n):
    return (i for i in range(n))


r['exact_too_many'] = (_err(lambda: _two((1, 2, 3))), _err(lambda: _two([1, 2, 3])),
                       _err(lambda: _two({1: 1, 2: 2, 3: 3})))
r['other_too_many'] = (_err(lambda: _two('abc')), _err(lambda: _two(range(3))),
                       _err(lambda: _two({1, 2, 3})), _err(lambda: _two(ListSub([1, 2, 3]))),
                       _err(lambda: _two(_gen(3))))
r['not_enough'] = (_err(lambda: _four((1, 2, 3))), _err(lambda: _four(_gen(3))),
                   _err(lambda: _four(Seq())))
r['star_not_enough'] = (_err(lambda: _star([1])), _err(lambda: _star(_gen(1))))
r['getitem_sequence'] = (_err(lambda: _three(Seq())), _err(lambda: _two(Seq())),
                         _err(lambda: _star(Seq())))
r['getitem_raises_past_end'] = (_err(lambda: _three(BadSeq())),
                                _err(lambda: _four(BadSeq())))
r['len_is_not_consulted'] = _err(lambda: _three(BadLength()))
r['iterator_left_over'] = _err(_iterator_left_over)
r['star_takes_all'] = _err(_star_takes_all)
r['non_iterable'] = (_err(lambda: _two(7)), _err(lambda: _two(None)), _err(lambda: _two(1.5)),
                     _err(lambda: _two(len)))
r['own_type_error_propagates'] = _err(lambda: _two(OwnTypeError()))
r['empty_target'] = (_err(lambda: exec('() = [42]')), _err(lambda: exec('() = []')))
r['dict_unpacks_keys'] = _err(lambda: _two({'k': 1, 'j': 2}))
r['for_target'] = (_err(lambda: _for([(1, 2), [3, 4]])), _err(lambda: _for([(1, 2, 3)])),
                   _err(lambda: _for([7])), _err(lambda: _for([_gen(2)])),
                   _err(lambda: _for([{1: 1, 2: 2, 3: 3}])), _err(lambda: _for([Seq()])))
r['for_star_target'] = _err(lambda: _for_star([(1, 2, 3), (4,)]))


def _cache_info():
    import functools

    @functools.lru_cache(maxsize=20)
    def f(x):
        return x

    f(1)
    f(1)
    ci = f.cache_info()
    hits, misses, maxsize, currsize = ci
    return ((hits, misses, maxsize, currsize), list(ci), ci[-1], ci[1:3],
            _err(lambda: ci[4]))


r['cache_info_unpacks'] = _err(_cache_info)

EXPECTED = {
    'exact_too_many': ('ValueError: too many values to unpack (expected 2, got 3)',
                       'ValueError: too many values to unpack (expected 2, got 3)',
                       'ValueError: too many values to unpack (expected 2, got 3)'),
    'other_too_many': ('ValueError: too many values to unpack (expected 2)',
                       'ValueError: too many values to unpack (expected 2)',
                       'ValueError: too many values to unpack (expected 2)',
                       'ValueError: too many values to unpack (expected 2)',
                       'ValueError: too many values to unpack (expected 2)'),
    'not_enough': ('ValueError: not enough values to unpack (expected 4, got 3)',
                   'ValueError: not enough values to unpack (expected 4, got 3)',
                   'ValueError: not enough values to unpack (expected 4, got 3)'),
    'star_not_enough': ('ValueError: not enough values to unpack (expected at least 2, got 1)',
                        'ValueError: not enough values to unpack (expected at least 2, got 1)'),
    'getitem_sequence': ((0, 1, 2), 'ValueError: too many values to unpack (expected 2)',
                         (0, [1], 2)),
    'getitem_raises_past_end': ('BozoError: asked for index 3', 'BozoError: asked for index 3'),
    'len_is_not_consulted': 'ValueError: too many values to unpack (expected 3)',
    'iterator_left_over': ('too many values to unpack (expected 3)', 4),
    'star_takes_all': (0, [1, 2, 3, 4], []),
    'non_iterable': ('TypeError: cannot unpack non-iterable int object',
                     'TypeError: cannot unpack non-iterable NoneType object',
                     'TypeError: cannot unpack non-iterable float object',
                     'TypeError: cannot unpack non-iterable builtin_function_or_method object'),
    'own_type_error_propagates': 'TypeError: mine',
    'empty_target': ('ValueError: too many values to unpack (expected 0, got 1)', None),
    'dict_unpacks_keys': ('k', 'j'),
    'for_target': ([(1, 2), (3, 4)],
                   'ValueError: too many values to unpack (expected 2, got 3)',
                   'TypeError: cannot unpack non-iterable int object',
                   [(0, 1)],
                   'ValueError: too many values to unpack (expected 2, got 3)',
                   'ValueError: too many values to unpack (expected 2)'),
    'for_star_target': [(1, [2, 3]), (4, [])],
    'cache_info_unpacks': ((1, 1, 20, 1), [1, 1, 20, 1], 1, (1, 20),
                           'IndexError: tuple index out of range'),
}

KNOWN_DIVERGENCES = {}

DISAGREEMENTS = sorted(k for k in EXPECTED if r.get(k, '<missing>') != EXPECTED[k])
SUMMARY = '%d checks, %d disagreeing %r, keys match: %s' % (
    len(EXPECTED), len(DISAGREEMENTS), DISAGREEMENTS,
    sorted(r) == sorted(list(EXPECTED) + list(KNOWN_DIVERGENCES)))


if __name__ == '__main__':
    for key in EXPECTED:
        actual = r[key]
        ok = actual == EXPECTED[key]
        print('%-5s %-28s -> %s' % ('OK' if ok else 'FAIL', key,
                                    'as expected' if ok else repr(actual)))
    print(SUMMARY)
