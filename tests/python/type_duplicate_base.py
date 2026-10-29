"""Fixture: three-argument type() refuses the same base twice, as a class statement does.

CPython refuses a class whose bases name one class twice with ``duplicate
base class A``, whether a class statement or ``type('X', (A, A), {})``
builds it (Objects/typeobject.c:3169-3197, check_duplicates).  Grail's
class statement and type.__new__ asked, and the builtin call did not: it
built the class over A once (test_descr test_mro_disagreement).  Every
check here holds under CPython 3.14, which is what makes it evidence.
"""

r = {}


def outcome(make):
    try:
        return [k.__name__ for k in make().__mro__]
    except TypeError as exc:
        return ('TypeError', str(exc))


class A(object):
    pass


class B(A):
    pass


class C(object):
    pass


def statement():
    class X(A, A):
        pass
    return X


MRO = 'Cannot create a consistent method resolution order (MRO) for bases '

r['duplicates'] = [outcome(lambda: type('X', (A, A), {})), outcome(lambda: type('X', (int, int), {})),
                   outcome(lambda: type('X', (A, C, A), {})), outcome(statement)]
r['inconsistent_orders'] = [outcome(lambda: type('X', (A, B), {})), outcome(lambda: type('X', (A, C, B), {}))]
r['legal'] = [outcome(lambda: type('X', (B, A), {})), outcome(lambda: type('X', (A, C), {})),
              outcome(lambda: type('X', (A,), {}))]

EXPECTED = {
    'duplicates': [('TypeError', 'duplicate base class A'), ('TypeError', 'duplicate base class int'),
                   ('TypeError', 'duplicate base class A'), ('TypeError', 'duplicate base class A')],
    'inconsistent_orders': [('TypeError', MRO + 'A, B'), ('TypeError', MRO + 'A, C, B')],
    'legal': [['X', 'B', 'A', 'object'], ['X', 'A', 'C', 'object'], ['X', 'A', 'object']],
}

DISAGREEMENTS = sorted(k for k in EXPECTED if r.get(k, '<missing>') != EXPECTED[k])
SUMMARY = '%d checks, %d disagreeing %r, keys match: %s' % (
    len(EXPECTED), len(DISAGREEMENTS), DISAGREEMENTS, sorted(r) == sorted(EXPECTED))


if __name__ == '__main__':
    for key in EXPECTED:
        ok = r[key] == EXPECTED[key]
        print('%-22s %s' % (key, 'OK' if ok else 'FAIL'))
        if not ok:
            print('    got  %r' % (r[key],))
            print('    want %r' % (EXPECTED[key],))
    print(SUMMARY)
