"""Fixture: a type parameter list refuses what CPython's grammar and compiler refuse.

CPython's grammar gives a TypeVarTuple or a ParamSpec no bound -- ``cannot use
bound with ParamSpec``, or ``constraints`` for a tuple, at the colon -- and
lets only a TypeVarTuple's default be starred (Grammar/python.gram,
type_param and invalid_type_param).  Its code generator refuses a parameter
without a default after one with a default (Python/codegen.c).  Grail compiled
all of these; valid lists, defaults and bounds of every kind still compile.

Every check here holds under CPython 3.14, which is what makes it evidence.
"""

r = {}


def outcome(source):
    try:
        compile(source, '<test string>', 'exec')
        return 'ok'
    except SyntaxError as e:
        return e.msg, e.offset


r['non_default_after_default'] = [outcome(s) for s in (
    "def func[T=int, U](): pass", "class C[T=int, U]: pass", "type A[T=int, U] = int",
    "type A[T=int, *U] = int", "def f[T=int, **P](): pass")]
r['starred_default'] = [outcome(s) for s in (
    "type Alias[T = *int] = int", "type Alias[**P = *int] = int")]
r['bound_on_variadics'] = [outcome(s) for s in (
    "def func1[**A: str](): pass", "def func1[**A: (int, str)](): pass",
    "class X[**A: str]: pass", "type X[**A: (int, str)] = int",
    "def func1[*A: str](): pass", "def func1[*A: (int, str)](): pass", "type X[*A: str] = int")]
r['grammar_before_compiler'] = outcome("def f[T=int, U, **P: str](): pass")
r['still_compile'] = [outcome(s) for s in (
    "def f[T: int = str](): pass", "type A[*Ts = *tuple[int]] = int",
    "def f[T: (int, str) = int](): pass", "class C[T, *Ts, **P]: pass",
    "def f[**P = [int, str]](): pass", "type A[T = dict[str, int], U = list[T]] = int",
    "class C[T: (int,)]: pass", "type A[T = int, *Ts = *tuple[str]] = int",
    "class C[T = f(a=1)]: pass")]

DEFAULT = "non-default type parameter '%s' follows default type parameter"
EXPECTED = {
    'non_default_after_default': [(DEFAULT % 'U', 17), (DEFAULT % 'U', 16), (DEFAULT % 'U', 15),
                                  (DEFAULT % 'U', 15), (DEFAULT % 'P', 14)],
    'starred_default': [('invalid syntax', 16), ('invalid syntax', 18)],
    'bound_on_variadics': [
        ('cannot use bound with ParamSpec', 14), ('cannot use constraints with ParamSpec', 14),
        ('cannot use bound with ParamSpec', 12), ('cannot use constraints with ParamSpec', 11),
        ('cannot use bound with TypeVarTuple', 13), ('cannot use constraints with TypeVarTuple', 13),
        ('cannot use bound with TypeVarTuple', 10)],
    'grammar_before_compiler': ('cannot use bound with ParamSpec', 20),
    'still_compile': ['ok'] * 9,
}

DISAGREEMENTS = sorted(k for k in EXPECTED if r.get(k, '<missing>') != EXPECTED[k])
SUMMARY = '%d checks, %d disagreeing %r, keys match: %s' % (
    len(EXPECTED), len(DISAGREEMENTS), DISAGREEMENTS, sorted(r) == sorted(EXPECTED))


if __name__ == '__main__':
    for key in EXPECTED:
        actual = r[key]
        print('%-5s %-26s -> %r' % ('OK' if actual == EXPECTED[key] else 'FAIL',
                                    key, actual))
    print(SUMMARY)
