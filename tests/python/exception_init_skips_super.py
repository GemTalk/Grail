"""Fixture: an exception keeps its constructor arguments even when its
__init__ never calls super().__init__.

CPython stores ``args`` in BaseException_new, before any __init__ runs
(Objects/exceptions.c:60-85), so ``class E(Exception): def __init__(self, x):
self.x = x`` still has ``E('foo').args == ('foo',)``, and str(), repr() and
pickling all read it.  Grail allocated such an instance with no args at all
(test_exceptions testAttributes, NaiveException).

What __new__ stores is the RAW arguments: the per-type parsing is __init__'s
for SyntaxError and ImportError, whose fields stay None when it is skipped, and
__new__'s for OSError and exception groups.  Every check here holds under
CPython 3.14, which is what makes it evidence.
"""

import pickle

r = {}


def outcome(make):
    try:
        return make()
    except Exception as exc:
        return (type(exc).__name__, str(exc))


class Naive(Exception):
    def __init__(self, x):
        self.x = x


class Pair(Exception):
    def __init__(self, a, b=0):
        pass


class Located(SyntaxError):
    def __init__(self, msg, code):
        super().__init__(msg)


class Unparsed(SyntaxError):
    def __init__(self, msg, location):
        pass


class Unimported(ImportError):
    def __init__(self, a, b):
        pass


class ParsedLater(OSError):
    def __init__(self, a, b):
        pass


class Missing(KeyError):
    def __init__(self, key):
        pass


class Group(ExceptionGroup):
    def __init__(self, message, exceptions):
        pass


class Extra(ExceptionGroup):
    def __init__(self, message, exceptions, extra):
        pass


r['naive'] = outcome(lambda: (Naive('foo').args, str(Naive('foo')), repr(Naive('foo')), Naive('foo').x))
r['positional_only'] = outcome(lambda: (Pair(1, 2).args, Pair(1, b=2).args, str(Pair(1, 2))))
r['pickled'] = outcome(lambda: (pickle.loads(pickle.dumps(Naive('foo'))).args,
                                pickle.loads(pickle.dumps(Naive('foo'))).x))
r['syntax_error_init_reparses'] = outcome(lambda: (Located('m', 5).args, Located('m', 5).msg,
                                                   Located('m', 5).filename))
r['syntax_error_fields_unset'] = outcome(lambda: (Unparsed('m', ('f', 1, 2, 't')).args,
                                                  Unparsed('m', ('f', 1, 2, 't')).msg,
                                                  Unparsed('m', ('f', 1, 2, 't')).filename))
r['import_error'] = outcome(lambda: (Unimported(1, 2).args, Unimported(1, 2).msg))
r['os_error_parses_in_init'] = outcome(lambda: (ParsedLater(2, 'x').args, ParsedLater(2, 'x').errno))
r['key_error'] = outcome(lambda: (Missing('k').args, str(Missing('k'))))
r['group'] = outcome(lambda: (Group('m', [ValueError()]).message, len(Group('m', [ValueError()]).exceptions)))
r['group_new_checks_arity'] = outcome(lambda: Extra('m', [ValueError()], 1))
r['explicit_new'] = outcome(lambda: (Naive.__new__(Naive, 'foo', 'bar').args,
                                     SyntaxError.__new__(SyntaxError, 'm', ('f', 1, 2, 't')).filename))


def _raised():
    try:
        raise Naive('boom')
    except Naive as exc:
        return exc.args, str(exc)


r['raised'] = outcome(_raised)

EXPECTED = {
    'naive': (('foo',), 'foo', "Naive('foo')", 'foo'),
    'positional_only': ((1, 2), (1,), '(1, 2)'),
    'pickled': (('foo',), 'foo'),
    'raised': (('boom',), 'boom'),
    'syntax_error_init_reparses': (('m',), 'm', None),
    'syntax_error_fields_unset': (('m', ('f', 1, 2, 't')), None, None),
    'import_error': ((1, 2), None),
    'os_error_parses_in_init': ((), None),
    'key_error': (('k',), "'k'"),
    'group': ('m', 1),
    'group_new_checks_arity': ('TypeError', 'BaseExceptionGroup.__new__() takes exactly 2 arguments (3 given)'),
    'explicit_new': (('foo', 'bar'), None),
}

DISAGREEMENTS = sorted(k for k in EXPECTED if r.get(k, '<missing>') != EXPECTED[k])
SUMMARY = '%d checks, %d disagreeing %r, keys match: %s' % (
    len(EXPECTED), len(DISAGREEMENTS), DISAGREEMENTS, sorted(r) == sorted(EXPECTED))


if __name__ == '__main__':
    for key in EXPECTED:
        actual = r[key]
        print('%-28s %-5s -> %r' % (key, 'OK' if actual == EXPECTED[key] else 'FAIL', actual))
    print(SUMMARY)
