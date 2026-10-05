"""A ``__str__`` that answers something other than a str.

CPython's PyObject_Str refuses it -- ``TypeError: __str__ returned non-string
(type int)`` -- and str(), %s, f-strings, format(), str.format, print() and
str(exception) all go through PyObject_Str.  Grail handed the value on:
``str(x)`` answered an int, and %s / str.format rendered a None as its
Smalltalk printString, 'aNoneType'.

The message names __str__ even when the value came from a __repr__ that
object.__str__ fell back to: CPython's object.__str__ calls the repr slot
directly, so the only check is PyObject_Str's.

The repr half is tests/python/repr_requires_a_str.py.

Every EXPECTED value was produced by running these functions under CPython
3.14 (``--emit``), not written by hand.
"""

import io
import sys


def _outcome(fn):
    try:
        return ('ok', fn())
    except BaseException as exc:
        return (type(exc).__name__, str(exc))


class S:
    def __init__(self, v):
        self.v = v

    def __str__(self):
        return self.v


class R:
    def __init__(self, v):
        self.v = v

    def __repr__(self):
        return self.v


class Sub(str):
    pass


def _print(o):
    buf = io.StringIO()
    print(o, file=buf)
    return buf.getvalue()


ROUTES = (
    ('str', lambda o: str(o)),
    ('%s', lambda o: '%s' % (o,)),
    ('f-string', lambda o: f'{o}'),
    ('f-string !s', lambda o: f'{o!s}'),
    ('format()', lambda o: format(o)),
    ('str.format', lambda o: '{}'.format(o)),
    ('str.format !s', lambda o: '{!s}'.format(o)),
    ('format_map', lambda o: '{k}'.format_map({'k': o})),
    ('print', _print),
    ('str(exception)', lambda o: str(Exception(o))),
    ('str.__new__(Sub)', lambda o: str.__new__(Sub, o)),
)


def str_refuses_a_non_str():
    return tuple(_outcome(lambda: str(S(v))) for v in (5, None, b'x', 1.5, ['l']))


def every_route_checks():
    return tuple((name, _outcome(lambda: route(S(None))))
                 for name, route in ROUTES)


def a_repr_fallback_is_reported_as_str():
    return tuple((name, _outcome(lambda: route(R(5))))
                 for name, route in ROUTES)


def valid_results_are_unchanged():
    class Boom:
        def __str__(self):
            raise ValueError('boom')

    sub = str(S(Sub('sub')))
    return (type(sub).__name__, sub,
            tuple(_outcome(lambda: route(S('ok'))) for _, route in ROUTES[:-1]),
            _outcome(lambda: str(Boom())),
            _print(None), '%s|{}'.format(None) % (None,), str(Exception(None)))


CHECKS = [
    str_refuses_a_non_str,
    every_route_checks,
    a_repr_fallback_is_reported_as_str,
    valid_results_are_unchanged,
]

EXPECTED = {
    'str_refuses_a_non_str': (('TypeError', '__str__ returned non-string (type int)'), ('TypeError', '__str__ returned non-string (type NoneType)'), ('TypeError', '__str__ returned non-string (type bytes)'), ('TypeError', '__str__ returned non-string (type float)'), ('TypeError', '__str__ returned non-string (type list)')),
    'every_route_checks': (('str', ('TypeError', '__str__ returned non-string (type NoneType)')), ('%s', ('TypeError', '__str__ returned non-string (type NoneType)')), ('f-string', ('TypeError', '__str__ returned non-string (type NoneType)')), ('f-string !s', ('TypeError', '__str__ returned non-string (type NoneType)')), ('format()', ('TypeError', '__str__ returned non-string (type NoneType)')), ('str.format', ('TypeError', '__str__ returned non-string (type NoneType)')), ('str.format !s', ('TypeError', '__str__ returned non-string (type NoneType)')), ('format_map', ('TypeError', '__str__ returned non-string (type NoneType)')), ('print', ('TypeError', '__str__ returned non-string (type NoneType)')), ('str(exception)', ('TypeError', '__str__ returned non-string (type NoneType)')), ('str.__new__(Sub)', ('TypeError', '__str__ returned non-string (type NoneType)'))),
    'a_repr_fallback_is_reported_as_str': (('str', ('TypeError', '__str__ returned non-string (type int)')), ('%s', ('TypeError', '__str__ returned non-string (type int)')), ('f-string', ('TypeError', '__str__ returned non-string (type int)')), ('f-string !s', ('TypeError', '__str__ returned non-string (type int)')), ('format()', ('TypeError', '__str__ returned non-string (type int)')), ('str.format', ('TypeError', '__str__ returned non-string (type int)')), ('str.format !s', ('TypeError', '__str__ returned non-string (type int)')), ('format_map', ('TypeError', '__str__ returned non-string (type int)')), ('print', ('TypeError', '__str__ returned non-string (type int)')), ('str(exception)', ('TypeError', '__str__ returned non-string (type int)')), ('str.__new__(Sub)', ('TypeError', '__str__ returned non-string (type int)'))),
    'valid_results_are_unchanged': ('Sub', 'sub', (('ok', 'ok'), ('ok', 'ok'), ('ok', 'ok'), ('ok', 'ok'), ('ok', 'ok'), ('ok', 'ok'), ('ok', 'ok'), ('ok', 'ok'), ('ok', 'ok\n'), ('ok', 'ok')), ('ValueError', 'boom'), 'None\n', 'None|None', 'None'),
}

RESULTS = {}
for _fn in CHECKS:
    _got = _outcome(_fn)
    _got = _got[1] if _got[0] == 'ok' else _got
    _want = EXPECTED.get(_fn.__name__)
    RESULTS[_fn.__name__] = (_got == _want) or 'got: %r' % (_got,)


if __name__ == '__main__':
    if sys.argv[1:] == ['--emit']:
        for _fn in CHECKS:
            print('    %r: %r,' % (_fn.__name__, _fn()))
    else:
        for _name in sorted(RESULTS):
            _v = RESULTS[_name]
            print('%-4s %s' % ('OK' if _v is True else 'FAIL', _name),
                  '' if _v is True else _v)
