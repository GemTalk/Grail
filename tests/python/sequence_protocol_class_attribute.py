"""Fixture: a __getitem__ given as a class attribute makes its object a sequence.

CPython fills a type's slots from its attributes, whatever they hold
(Objects/typeobject.c:11308 update_one_slot), so ``__getitem__ =
property(...)`` gives the class sq_item, and iter() walks an instance by index
until IndexError.  Grail honoured such a __getitem__ for ``obj[i]`` but every
iteration -- list(), a for loop, ``in``, unpacking -- refused the object as
not iterable, because the sequence test saw compiled defs only (test_descr
test_properties: ``for i in D()`` must reach the property's ZeroDivisionError).
``__iter__ = None`` still opts out.  Every check here holds under CPython
3.14, which is what makes it evidence.
"""

r = {}


class Raising:
    __getitem__ = property(lambda self: 1 / 0)


class Sequence:
    __getitem__ = property(lambda self: (lambda index: [10, 20][index]))


class SizedSequence:
    __getitem__ = property(lambda self: (lambda index: [10, 20][index]))
    __len__ = property(lambda self: (lambda: 2))


class OptedOut:
    __getitem__ = property(lambda self: (lambda index: [10, 20][index]))
    __iter__ = None


def outcome(thunk):
    try:
        return thunk()
    except Exception as exc:
        return type(exc).__name__


r['iteration_reaches_the_property'] = outcome(lambda: list(Raising()))
r['consumers'] = [outcome(lambda: list(Sequence())),
                  outcome(lambda: tuple(Sequence())),
                  outcome(lambda: [x for x in Sequence()]),
                  outcome(lambda: next(iter(Sequence()))),
                  outcome(lambda: sorted(set(Sequence())))]
r['membership'] = [outcome(lambda: 20 in Sequence()), outcome(lambda: 30 in Sequence())]
r['unpacking'] = outcome(lambda: (lambda first, second: (first, second))(*Sequence()))
r['reversed'] = outcome(lambda: list(reversed(SizedSequence())))
r['iter_none_opts_out'] = outcome(lambda: list(OptedOut()))

EXPECTED = {
    'iteration_reaches_the_property': 'ZeroDivisionError',
    'consumers': [[10, 20], (10, 20), [10, 20], 10, [10, 20]],
    'membership': [True, False],
    'unpacking': (10, 20),
    'reversed': [20, 10],
    'iter_none_opts_out': 'TypeError',
}

DISAGREEMENTS = sorted(k for k in EXPECTED if r.get(k, '<missing>') != EXPECTED[k])
SUMMARY = '%d checks, %d disagreeing %r, keys match: %s' % (
    len(EXPECTED), len(DISAGREEMENTS), DISAGREEMENTS, sorted(r) == sorted(EXPECTED))


if __name__ == '__main__':
    for key in EXPECTED:
        ok = r[key] == EXPECTED[key]
        print('%-31s %s' % (key, 'OK' if ok else 'FAIL'))
        if not ok:
            print('    got  %r' % (r[key],))
            print('    want %r' % (EXPECTED[key],))
    print(SUMMARY)
