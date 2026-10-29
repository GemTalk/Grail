"""Fixture: classmethod.__get__(obj) binds type(obj), the Python type.

With no owner, CPython's classmethod binds the type of the object it is
reached through (Objects/funcobject.c:1468-1469), and its __get__ wrapper
refuses neither being given (Objects/typeobject.c:9693-9701).  Grail took
the object's Smalltalk class, so ``classmethod(f).__get__(0)`` bound
SmallInteger: it printed as ``<class 'int'>`` but was not ``int``
(test_descr test_classmethods).  Every check here holds under CPython 3.14,
which is what makes it evidence.
"""

r = {}


def f(cls, arg=None):
    return (cls, arg)


ff = classmethod(f)


class C:
    pass


class I(int):
    pass


def owner(obj, *rest):
    try:
        return ff.__get__(obj, *rest).__self__
    except TypeError as exc:
        return ('TypeError', str(exc))


r['bound_to_the_python_type'] = [owner(0) is int, owner(True) is bool, owner('a') is str,
                                 owner(1.5) is float, owner([]) is list, owner(C()) is C,
                                 owner(I(3)) is I, owner(int) is type]
r['called_through_it'] = [ff.__get__(0)(42) == (int, 42), ff.__get__(0, int)(42) == (int, 42)]
r['an_owner_given_wins'] = [owner(0, str) is str, owner(None, int) is int]
r['neither_given'] = [owner(None), owner(None, None)]

EXPECTED = {
    'bound_to_the_python_type': [True] * 8,
    'called_through_it': [True, True],
    'an_owner_given_wins': [True, True],
    'neither_given': [('TypeError', '__get__(None, None) is invalid')] * 2,
}

DISAGREEMENTS = sorted(k for k in EXPECTED if r.get(k, '<missing>') != EXPECTED[k])
SUMMARY = '%d checks, %d disagreeing %r, keys match: %s' % (
    len(EXPECTED), len(DISAGREEMENTS), DISAGREEMENTS, sorted(r) == sorted(EXPECTED))


if __name__ == '__main__':
    for key in EXPECTED:
        ok = r[key] == EXPECTED[key]
        print('%-26s %s' % (key, 'OK' if ok else 'FAIL'))
        if not ok:
            print('    got  %r' % (r[key],))
            print('    want %r' % (EXPECTED[key],))
    print(SUMMARY)
