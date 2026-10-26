"""Fixture: ``import _datetime`` works and answers datetime's own classes.

``_datetime`` is CPython's C datetime accelerator; datetime.py re-exports it,
so the two modules hold the SAME classes.  Grail's datetime is native and had
no module of that name, so test_types -- which imports it at module level --
could not be imported at all.

The C API capsule, ``datetime_CAPI``, has no Grail counterpart; that row is a
known divergence rather than an expectation.

Every EXPECTED check holds under CPython 3.14, which is what makes it
evidence.
"""

import datetime

r = {}


def _try(thunk):
    try:
        return ('ok', thunk())
    except BaseException as e:
        return (type(e).__name__, str(e))


def _imported():
    import _datetime
    return _datetime.__name__


def _same_classes():
    import _datetime
    return [getattr(_datetime, n) is getattr(datetime, n)
            for n in ('date', 'datetime', 'time', 'timedelta', 'timezone',
                      'tzinfo', 'UTC')]


def _constants():
    import _datetime
    return (_datetime.MINYEAR, _datetime.MAXYEAR)


def _names():
    import _datetime
    return sorted(n for n in dir(_datetime)
                  if not n.startswith('_') and n != 'datetime_CAPI')


def _has_capi():
    import _datetime
    return hasattr(_datetime, 'datetime_CAPI')


r['the accelerator imports'] = _try(_imported)
r['its classes are datetime\'s own'] = _try(_same_classes)
r['MINYEAR and MAXYEAR'] = _try(_constants)
r['its public names, the capsule aside'] = _try(_names)
r['the C API capsule'] = _try(_has_capi)


EXPECTED = {
    'the accelerator imports': ('ok', '_datetime'),
    'its classes are datetime\'s own': ('ok', [True] * 7),
    'MINYEAR and MAXYEAR': ('ok', (1, 9999)),
    'its public names, the capsule aside': (
        'ok', ['MAXYEAR', 'MINYEAR', 'UTC', 'date', 'datetime', 'time',
               'timedelta', 'timezone', 'tzinfo']),
}

KNOWN_DIVERGENCES = {
    # CPython: ('ok', True) -- a PyCapsule holding the C API.  Grail's datetime
    # is native and has no C API to export.
    'the C API capsule': ('ok', False),
}

DISAGREEMENTS = sorted(k for k in EXPECTED if r.get(k, '<missing>') != EXPECTED[k])
SUMMARY = '%d checks, %d disagreeing %r, keys match: %s' % (
    len(EXPECTED), len(DISAGREEMENTS), DISAGREEMENTS,
    sorted(r) == sorted(list(EXPECTED) + list(KNOWN_DIVERGENCES)))


if __name__ == '__main__':
    for key in EXPECTED:
        actual = r[key]
        ok = actual == EXPECTED[key]
        print('%-5s %-40s -> %s' % ('OK' if ok else 'FAIL', key,
                                    'as expected' if ok else repr(actual)))
    for key, expected in KNOWN_DIVERGENCES.items():
        actual = r[key]
        print('%-5s %-40s -> %r' % ('OK' if actual == expected else 'XFAIL',
                                    key, actual))
    print(SUMMARY)
