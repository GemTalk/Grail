"""Fixture: an f-string standing first in a body is not a docstring.

CPython lifts only a plain string literal into __doc__.  An f-string --
even one with no fields, or a plain string implicitly concatenated with one
-- is an expression CPython evaluates and discards, so the function, class
or module has no docstring.  Grail folds a field-less f-string to its text
and took it for one.

Every check here holds under CPython 3.14, which is what makes it evidence.
"""

r = {}


def plain():
    '''A docstring'''


def fstring():
    f'''Not a docstring'''


def concatenated():
    '''Not a docstring''' \
    f''


def empty_fstring():
    f''


class Cls:
    f'Not a docstring'


ns = {}
exec("f'Not a module docstring'\nx = 1", ns)
r['functions'] = [plain.__doc__, fstring.__doc__, concatenated.__doc__, empty_fstring.__doc__]
r['class'] = Cls.__doc__
r['module'] = ns.get('__doc__')

EXPECTED = {
    'functions': ['A docstring', None, None, None],
    'class': None,
    'module': None,
}

DISAGREEMENTS = sorted(k for k in EXPECTED if r.get(k, '<missing>') != EXPECTED[k])
SUMMARY = '%d checks, %d disagreeing %r, keys match: %s' % (
    len(EXPECTED), len(DISAGREEMENTS), DISAGREEMENTS, sorted(r) == sorted(EXPECTED))


if __name__ == '__main__':
    for key in EXPECTED:
        actual = r[key]
        print('%-10s %-5s -> %r' % (key, 'OK' if actual == EXPECTED[key] else 'FAIL', actual))
    print(SUMMARY)
