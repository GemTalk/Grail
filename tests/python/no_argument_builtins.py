"""Fixture: object and the singletons' types refuse arguments, and object.__new__ a non-type.

``object(5)`` is CPython's ``TypeError: object() takes no arguments``
(Objects/typeobject.c, object_new), and the types of None, Ellipsis and
NotImplemented refuse in their own words (Objects/object.c:2219, 2345,
Objects/sliceobject.c:31).  ``object.__new__(5)`` is ``object.__new__(X): X
is not a type object (int)`` (Objects/typeobject.c:9822-9828).  Grail
compiled a one-argument call of these classes to ``object.__new__(cls)``'s
own selector, so ``object(5)`` sent ``new`` to 5 -- an uncatchable
Smalltalk error -- and ``object(A)`` made an A.  Every check here holds
under CPython 3.14, which is what makes it evidence.
"""

r = {}


def outcome(make):
    try:
        made = make()
        return ('ok', type(made).__name__)
    except Exception as exc:
        return (type(exc).__name__, str(exc))


class A:
    pass


through_a_variable = object

r['object_refuses_arguments'] = [outcome(lambda: object(5)), outcome(lambda: object(5, 6)),
                                 outcome(lambda: object(x=1)), outcome(lambda: object(A)),
                                 outcome(lambda: through_a_variable(5))]
r['object_new_refuses_a_non_type'] = [outcome(lambda: object.__new__(5)),
                                      outcome(lambda: object.__new__('a')),
                                      outcome(lambda: type(None).__new__(5))]
r['singleton_types_refuse_arguments'] = [outcome(lambda: type(None)(5)),
                                         outcome(lambda: type(None)(a=1, b=2)),
                                         outcome(lambda: type(...)(1)),
                                         outcome(lambda: type(NotImplemented)(1, 2))]
r['legal'] = [outcome(object), outcome(through_a_variable), outcome(lambda: object.__new__(A)),
              outcome(lambda: object.__new__(object)), outcome(A), outcome(lambda: list([1])),
              outcome(lambda: int('5'))]
r['singletons_without_arguments'] = [type(None)() is None, type(...)() is Ellipsis,
                                     type(NotImplemented)() is NotImplemented]


def no_arguments(name):
    return ('TypeError', name + ' takes no arguments')


EXPECTED = {
    'object_refuses_arguments': [no_arguments('object()')] * 5,
    'object_new_refuses_a_non_type': [
        ('TypeError', 'object.__new__(X): X is not a type object (int)'),
        ('TypeError', 'object.__new__(X): X is not a type object (str)'),
        ('TypeError', 'NoneType.__new__(X): X is not a type object (int)')],
    'singleton_types_refuse_arguments': [no_arguments('NoneType'), no_arguments('NoneType'),
                                         no_arguments('EllipsisType'),
                                         no_arguments('NotImplementedType')],
    'legal': [('ok', 'object'), ('ok', 'object'), ('ok', 'A'), ('ok', 'object'), ('ok', 'A'),
              ('ok', 'list'), ('ok', 'int')],
    'singletons_without_arguments': [True, True, True],
}

DISAGREEMENTS = sorted(k for k in EXPECTED if r.get(k, '<missing>') != EXPECTED[k])
SUMMARY = '%d checks, %d disagreeing %r, keys match: %s' % (
    len(EXPECTED), len(DISAGREEMENTS), DISAGREEMENTS, sorted(r) == sorted(EXPECTED))


if __name__ == '__main__':
    for key in EXPECTED:
        ok = r[key] == EXPECTED[key]
        print('%-34s %s' % (key, 'OK' if ok else 'FAIL'))
        if not ok:
            print('    got  %r' % (r[key],))
            print('    want %r' % (EXPECTED[key],))
    print(SUMMARY)
