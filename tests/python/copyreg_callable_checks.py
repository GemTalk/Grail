"""Fixture: copyreg.pickle checks that its functions are callable.

CPython raises TypeError for a reduction function or a constructor that is
not callable; Grail recorded the first and ignored the second
(test_copyreg's test_noncallable_reduce / test_noncallable_constructor).
The reduction function is recorded BEFORE the constructor is checked, as in
CPython.

Every EXPECTED check holds under CPython 3.14, which is what makes it
evidence.
"""

import copyreg

r = {}


def _err(thunk):
    try:
        return thunk()
    except Exception as e:
        return type(e).__name__ + ': ' + str(e)


class C:
    pass


class D:
    pass


def pickle_c(c):
    return C, ()


r['noncallable_reduce'] = (_err(lambda: copyreg.pickle(C, 'not a callable')),
                           C in copyreg.dispatch_table)
r['noncallable_constructor'] = (_err(lambda: copyreg.pickle(D, pickle_c, 'not a callable')),
                                copyreg.dispatch_table.get(D) is pickle_c)
r['constructor_alone'] = (_err(lambda: copyreg.constructor(3)), copyreg.constructor(len))
r['callable_ok'] = (copyreg.pickle(C, pickle_c), copyreg.pickle(C, pickle_c, C),
                    copyreg.pickle(C, pickle_c, None), copyreg.dispatch_table.get(C) is pickle_c)
copyreg.dispatch_table.pop(C, None)
copyreg.dispatch_table.pop(D, None)

EXPECTED = {
    'noncallable_reduce': ('TypeError: reduction functions must be callable', False),
    'noncallable_constructor': ('TypeError: constructors must be callable', True),
    'constructor_alone': ('TypeError: constructors must be callable', None),
    'callable_ok': (None, None, None, True),
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
        print('%-5s %-24s -> %s' % ('OK' if ok else 'FAIL', key,
                                    'as expected' if ok else repr(actual)))
    print(SUMMARY)
