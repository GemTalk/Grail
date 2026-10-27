"""Fixture: an inconsistent MRO's TypeError names the bases that could not be merged.

CPython's set_mro_error (Objects/typeobject.c:3209) names the head of every
sequence still unmerged when C3 can take none of them -- each class once, in
order, by __name__: ``Cannot create a consistent method resolution order
(MRO) for bases object, Generic``.  Grail's message stopped at ``for bases``.

Every check here holds under CPython 3.14, which is what makes it evidence.
"""

r = {}


def message(source):
    try:
        exec(source, {})
        return 'no error'
    except TypeError as e:
        return str(e)


r['class_statements'] = [
    message("class A: pass\nclass B(A): pass\nclass C(A, B): pass"),
    message("class D(object, int): pass"),
    message("class ClassA[T](object): ..."),
    message("class X: pass\nclass Y: pass\nclass P(X, Y): pass\nclass Q(Y, X): pass\nclass Z(P, Q): pass"),
    message("class Cls: pass\nclass Sub(Cls): pass\nclass Bad(Cls, Sub): pass"),
]
r['type_call'] = message("class A: pass\nclass B(A): pass\ntype('C', (A, B), {})")
r['consistent'] = message("class A: pass\nclass B(A): pass\nclass C(B, A): pass")

EXPECTED = {
    'class_statements': [
        'Cannot create a consistent method resolution order (MRO) for bases A, B',
        'Cannot create a consistent method resolution order (MRO) for bases object, int',
        'Cannot create a consistent method resolution order (MRO) for bases object, Generic',
        'Cannot create a consistent method resolution order (MRO) for bases X, Y',
        'Cannot create a consistent method resolution order (MRO) for bases Cls, Sub',
    ],
    'type_call': 'Cannot create a consistent method resolution order (MRO) for bases A, B',
    'consistent': 'no error',
}

DISAGREEMENTS = sorted(k for k in EXPECTED if r.get(k, '<missing>') != EXPECTED[k])
SUMMARY = '%d checks, %d disagreeing %r, keys match: %s' % (
    len(EXPECTED), len(DISAGREEMENTS), DISAGREEMENTS, sorted(r) == sorted(EXPECTED))


if __name__ == '__main__':
    for key in EXPECTED:
        actual = r[key]
        print('%-16s %-5s -> %r' % (key, 'OK' if actual == EXPECTED[key] else 'FAIL', actual))
    print(SUMMARY)
