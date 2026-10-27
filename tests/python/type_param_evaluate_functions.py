"""Fixture: type parameters and aliases expose PEP 649 evaluate functions, and retry a lazy value.

CPython (Objects/typevarobject.c) gives TypeVar, ParamSpec and TypeVarTuple
``evaluate_bound``, ``evaluate_constraints`` and ``evaluate_default`` -- and
TypeAliasType ``evaluate_value`` -- as ATTRIBUTES: the lazy function a PEP 695
declaration compiled, which takes a ``format``; a ``_typing._ConstEvaluator``
over a value given outright; or None when there is nothing to evaluate.  A
lazy value that raises is retried on the next read.  Grail had plain methods
answering the value, no _ConstEvaluator, and dropped a lazy value's thunk
before running it, so a NameError once was an AttributeError ever after.
has_default() evaluated a lazy default rather than asking whether one was
declared, so ``class C[T = Undefined]`` failed to define; and a plain
``type X = V`` built a different class from typing.TypeAliasType, with no
__module__ and no evaluate_value.

Every check here holds under CPython 3.14, which is what makes it evidence.
"""

import annotationlib
from typing import NoDefault, ParamSpec, TypeAliasType, TypeVar, TypeVarTuple

r = {}
VALUE, FORWARDREF, STRING = (annotationlib.Format.VALUE, annotationlib.Format.FORWARDREF,
                             annotationlib.Format.STRING)


def formats(evaluate):
    return [evaluate(1)] + [annotationlib.call_evaluate_function(evaluate, f)
                            for f in (VALUE, FORWARDREF, STRING)]


def f[T: int = int, **P = int, *Ts = int](): pass


T, P, Ts = f.__type_params__
type Alias = int
r['lazy'] = [formats(e) for e in (Alias.evaluate_value, T.evaluate_bound, T.evaluate_default,
                                  P.evaluate_default, Ts.evaluate_default)]
r['lazy_function'] = [T.evaluate_bound.__name__, T.evaluate_bound is T.evaluate_bound,
                      Alias.evaluate_value.__name__]


def unsupported(evaluate):
    try:
        evaluate(STRING)
        return 'no error'
    except NotImplementedError:
        return 'NotImplementedError'


r['lazy_refuses_string'] = unsupported(T.evaluate_bound)
r['plain_alias'] = [isinstance(Alias, TypeAliasType), Alias.__module__ == __name__,
                    type(Alias) is type(TypeAliasType('Other', int))]

T2 = TypeVar('T2', bound=int, default=int)
r['const'] = [formats(e) for e in (TypeAliasType('Alias2', int).evaluate_value, T2.evaluate_bound,
                                   T2.evaluate_default, ParamSpec('P2', default=int).evaluate_default,
                                   TypeVarTuple('Ts2', default=int).evaluate_default)]


def g[C: (int, str)](): pass


C2 = TypeVar('C2', int, str)
r['constraints'] = [formats(e) for e in (g.__type_params__[0].evaluate_constraints,
                                         C2.evaluate_constraints)]
r['const_repr'] = [repr(TypeVar('B', bound=int).evaluate_bound), repr(TypeVar('D').evaluate_default)]
ConstEvaluator = type(T2.evaluate_bound)


def refusal(operation):
    try:
        operation()
        return 'no error'
    except TypeError as e:
        return str(e)


def set_attribute():
    ConstEvaluator.attribute = 1


r['const_type'] = [ConstEvaluator.__module__, ConstEvaluator.__name__,
                   refusal(ConstEvaluator), refusal(set_attribute),
                   refusal(lambda: T2.evaluate_bound(format=1))]


def h[U](): pass


U = h.__type_params__[0]
D = TypeVar('D')
r['absent'] = [U.evaluate_bound, U.evaluate_constraints, U.evaluate_default,
               D.evaluate_bound, D.evaluate_constraints, D.evaluate_default(VALUE)]


def lazy_retry():
    class Foo[A: Undefined, B: (Undefined,), E = Undefined]: pass
    type Late = Undefined
    A, B, E = Foo.__type_params__
    reads = (lambda: A.__bound__, lambda: B.__constraints__, lambda: E.__default__,
             lambda: Late.__value__)
    errors = []
    for read in reads + reads:
        try:
            read()
            errors.append('no error')
        except NameError:
            errors.append('NameError')
    globals()['Undefined'] = 'defined'
    try:
        values = [read() for read in reads]
    finally:
        del globals()['Undefined']
    return errors, values, [read() for read in reads]


r['lazy_retry'] = lazy_retry()

EXPECTED = {
    'lazy': [[int, int, int, 'int']] * 5,
    'lazy_function': ['T', True, 'Alias'],
    'lazy_refuses_string': 'NotImplementedError',
    'plain_alias': [True, True, True],
    'const': [[int, int, int, 'int']] * 5,
    'constraints': [[(int, str), (int, str), (int, str), '(int, str)']] * 2,
    'const_repr': ["<constevaluator <class 'int'>>", '<constevaluator typing.NoDefault>'],
    'const_type': ['_typing', '_ConstEvaluator',
                   "cannot create '_typing._ConstEvaluator' instances",
                   "cannot set 'attribute' attribute of immutable type '_typing._ConstEvaluator'",
                   'constevaluator.__call__() takes no keyword arguments'],
    'absent': [None, None, None, None, None, NoDefault],
    'lazy_retry': (['NameError'] * 8, ['defined', ('defined',), 'defined', 'defined'],
                   ['defined', ('defined',), 'defined', 'defined']),
}

DISAGREEMENTS = sorted(k for k in EXPECTED if r.get(k, '<missing>') != EXPECTED[k])
SUMMARY = '%d checks, %d disagreeing %r, keys match: %s' % (
    len(EXPECTED), len(DISAGREEMENTS), DISAGREEMENTS, sorted(r) == sorted(EXPECTED))


if __name__ == '__main__':
    for key in EXPECTED:
        actual = r[key]
        print('%-5s %-20s -> %r' % ('OK' if actual == EXPECTED[key] else 'FAIL', key, actual))
    print(SUMMARY)
