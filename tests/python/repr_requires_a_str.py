"""A ``__repr__`` that answers something other than a str.

CPython's PyObject_Repr refuses it -- ``TypeError: __repr__ returned
non-string (type int)`` -- and every place that takes a repr goes through
PyObject_Repr.  Grail handed the value on: ``repr(x)`` answered an int,
``'{!r}'.format(x)`` and ``ascii(x)`` formatted it, and ``repr([x])`` failed
with a Smalltalk doesNotUnderstand: rather than a Python error.

A str SUBCLASS is a valid result, and so is a str holding a lone surrogate.

``str(x)`` on a class with only ``__repr__`` is NOT checked here: CPython
reports that one as ``__str__ returned non-string``, which is the separate
``__str__`` check.

Every EXPECTED value was produced by running these functions under CPython
3.14 (``--emit``), not written by hand.
"""

import sys


def _outcome(fn):
    try:
        return ('ok', fn())
    except BaseException as exc:
        return (type(exc).__name__, str(exc))


class R:
    def __init__(self, v):
        self.v = v

    def __repr__(self):
        return self.v


class S(str):
    pass


def repr_refuses_a_non_str():
    return tuple(_outcome(lambda: repr(R(v))) for v in (5, None, b'x', 1.5, ['l']))


def a_str_subclass_and_a_surrogate_are_accepted():
    sub = repr(R(S('sub')))
    lone = repr(R('\udc80'))
    return type(sub).__name__, sub, ascii(lone)


def every_formatting_route_checks():
    o = R(5)
    routes = (
        lambda: '%r' % (o,),
        lambda: '%a' % (o,),
        lambda: b'%r' % (o,),
        lambda: f'{o!r}',
        lambda: f'{o!a}',
        lambda: '{!r}'.format(o),
        lambda: '{k!r}'.format_map({'k': o}),
        lambda: ascii(o),
    )
    return tuple(_outcome(r)[0] for r in routes)


def every_container_repr_checks():
    o = R(5)

    class Holder:
        pass

    h = Holder()
    h.attr = o
    d = {'k': o}
    containers = (
        lambda: repr([o]),
        lambda: repr((o,)),
        lambda: repr((1, o)),
        lambda: repr({'k': o}),
        lambda: repr({o: 1}),
        lambda: repr({o}),
        lambda: repr(frozenset({o})),
        lambda: repr(d.values()),
        lambda: repr(h.__dict__),
    )
    return tuple(_outcome(c) for c in containers)


def good_reprs_are_unchanged():
    # The controls: a raising __repr__ still propagates its own error, and
    # the recursive-container guards still answer their ellipses.
    class Boom:
        def __repr__(self):
            raise ValueError('boom')

    l = []
    l.append(l)
    d = {}
    d['d'] = d
    return (_outcome(lambda: repr(Boom())), repr(l), repr(d),
            repr([R('a'), (R('b'),), {R('c'): R('d')}]))


CHECKS = [
    repr_refuses_a_non_str,
    a_str_subclass_and_a_surrogate_are_accepted,
    every_formatting_route_checks,
    every_container_repr_checks,
    good_reprs_are_unchanged,
]

EXPECTED = {
    'repr_refuses_a_non_str': (('TypeError', '__repr__ returned non-string (type int)'), ('TypeError', '__repr__ returned non-string (type NoneType)'), ('TypeError', '__repr__ returned non-string (type bytes)'), ('TypeError', '__repr__ returned non-string (type float)'), ('TypeError', '__repr__ returned non-string (type list)')),
    'a_str_subclass_and_a_surrogate_are_accepted': ('S', 'sub', "'\\udc80'"),
    'every_formatting_route_checks': ('TypeError', 'TypeError', 'TypeError', 'TypeError', 'TypeError', 'TypeError', 'TypeError', 'TypeError'),
    'every_container_repr_checks': (('TypeError', '__repr__ returned non-string (type int)'), ('TypeError', '__repr__ returned non-string (type int)'), ('TypeError', '__repr__ returned non-string (type int)'), ('TypeError', '__repr__ returned non-string (type int)'), ('TypeError', '__repr__ returned non-string (type int)'), ('TypeError', '__repr__ returned non-string (type int)'), ('TypeError', '__repr__ returned non-string (type int)'), ('TypeError', '__repr__ returned non-string (type int)'), ('TypeError', '__repr__ returned non-string (type int)')),
    'good_reprs_are_unchanged': (('ValueError', 'boom'), '[[...]]', "{'d': {...}}", '[a, (b,), {c: d}]'),
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
