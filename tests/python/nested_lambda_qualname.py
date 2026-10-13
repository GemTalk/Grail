"""A lambda or genexpr nested in a lambda or genexpr is named through it.

CPython's __qualname__ names every enclosing scope: ``<lambda>.<locals>.``
for an enclosing lambda, and ``<genexpr>.`` (no ``<locals>``) for an
enclosing generator expression.  Grail named neither, so a lambda inside a
lambda reported a bare ``<lambda>``, and the arity messages that quote the
qualname were wrong the same way (#1522).

The rows cover a lambda in a lambda (at module level, in a def, in a class
body, three deep), a genexpr in a lambda, a lambda and a genexpr in a
genexpr, and the arity message.  The guards: a lambda in a lambda's DEFAULT
and a lambda in a genexpr's OUTERMOST iterable are evaluated in the
enclosing scope, a list comprehension is inlined (PEP 709) and names
nothing, and a def in a def was already right.

EXPECTED is CPython 3.14's output; mismatches() is what the Smalltalk test case
asserts is empty.
"""

r = {}


def t(label, thunk):
    try:
        r[label] = repr(thunk())
    except Exception as e:
        r[label] = '%s: %s' % (type(e).__name__, e)


outer = lambda: (lambda a: a)


def in_def():
    return lambda: (lambda: 0)


class K:
    m = lambda self: (lambda: 0)


def genexpr_in_def():
    return next((lambda: 0) for _ in [1])


def listcomp_in_lambda_in_def():
    return (lambda: [lambda: 0 for _ in [1]])()[0]


def def_in_def():
    def inner():
        def innermost():
            pass
        return innermost
    return inner()


# Each object is built at MODULE level: building it inside a row's thunk
# would nest it in that lambda too.
lambda_in_lambda = outer()
three_deep = (lambda: lambda: lambda: 0)()()
genexpr_in_lambda = (lambda: (x for x in [1]))()
lambda_in_genexpr = next(lambda: 0 for _ in [1])
genexpr_in_genexpr = next((y for y in [1]) for _ in [1])
lambda_in_later_clause = next(f for _ in [1] for f in [lambda: 0])
lambda_in_default = (lambda g=lambda: 0: g)()
lambda_in_outermost_iterable = next(x for x in [lambda: 0])
lambda_in_listcomp = [lambda: 0 for _ in [1]][0]


def arity(*args, **kwargs):
    try:
        lambda_in_lambda(*args, **kwargs)
    except TypeError as e:
        return str(e)


def qualname(obj):
    return lambda: obj.__qualname__


t('lambda in a lambda', qualname(lambda_in_lambda))
t('lambda in a lambda in a def', qualname(in_def()()))
t('lambda in a lambda in a class body', qualname(K().m()))
t('three deep', qualname(three_deep))
t('genexpr in a lambda', qualname(genexpr_in_lambda))
t('lambda in a genexpr', qualname(lambda_in_genexpr))
t('genexpr in a genexpr', qualname(genexpr_in_genexpr))
t('lambda in a genexpr in a def', qualname(genexpr_in_def()))
t('lambda in a later clause of a genexpr', qualname(lambda_in_later_clause))
t('lambda in a lambda in a listcomp in a def',
  qualname(listcomp_in_lambda_in_def()))
r['arity message'] = repr(arity(1, 2))
r['keyword arity message'] = repr(arity(1, b=2))
t('guard: lambda in a default', qualname(lambda_in_default))
t('guard: lambda in the outermost iterable',
  qualname(lambda_in_outermost_iterable))
t('guard: lambda in a listcomp', qualname(lambda_in_listcomp))
t('guard: the outer lambda', qualname(outer))
t('guard: def in a def', qualname(def_in_def()))
r['guard: __name__'] = repr(lambda_in_lambda.__name__)


EXPECTED = {
    'lambda in a lambda': "'<lambda>.<locals>.<lambda>'",
    'lambda in a lambda in a def': "'in_def.<locals>.<lambda>.<locals>.<lambda>'",
    'lambda in a lambda in a class body': "'K.<lambda>.<locals>.<lambda>'",
    'three deep': "'<lambda>.<locals>.<lambda>.<locals>.<lambda>'",
    'genexpr in a lambda': "'<lambda>.<locals>.<genexpr>'",
    'lambda in a genexpr': "'<genexpr>.<lambda>'",
    'genexpr in a genexpr': "'<genexpr>.<genexpr>'",
    'lambda in a genexpr in a def': "'genexpr_in_def.<locals>.<genexpr>.<lambda>'",
    'lambda in a later clause of a genexpr': "'<genexpr>.<lambda>'",
    'lambda in a lambda in a listcomp in a def': "'listcomp_in_lambda_in_def.<locals>.<lambda>.<locals>.<lambda>'",
    'arity message': "'<lambda>.<locals>.<lambda>() takes 1 positional argument but 2 were given'",
    'keyword arity message': '"<lambda>.<locals>.<lambda>() got an unexpected keyword argument \'b\'"',
    'guard: lambda in a default': "'<lambda>'",
    'guard: lambda in the outermost iterable': "'<lambda>'",
    'guard: lambda in a listcomp': "'<lambda>'",
    'guard: the outer lambda': "'<lambda>'",
    'guard: def in a def': "'def_in_def.<locals>.inner.<locals>.innermost'",
    'guard: __name__': "'<lambda>'",
}


def mismatches():
    """The rows that differ from CPython's, as 'label: got X, CPython Y'."""
    return ['%s: got %s, CPython %s' % (k, r.get(k), v)
            for k, v in EXPECTED.items() if r.get(k) != v]
