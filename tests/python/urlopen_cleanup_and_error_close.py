"""``urllib.request.urlcleanup`` exists, and an HTTPError is a closable
response.

Two small gaps in urllib, both of which cost far more than their size.

``urlcleanup`` was absent.  Callers invoke it defensively to reset global
state between requests -- test_urllib2_localnet's TestUrlopen registers
it with ``addCleanup`` in setUp -- so its absence raised AttributeError
before a single test in that class could run: fifteen tests lost to one
missing name.

``HTTPError`` carried read/info/geturl but not ``close``.  In CPython an
HTTPError IS a response (it subclasses addinfourl), so callers use the
error exactly as they would a successful response --

    except urllib.error.URLError as f:
        data = f.read()
        f.close()

-- and that ordinary pairing raised AttributeError on the second line,
AFTER the read had worked.

Every expectation was checked against CPython 3.14 first.
"""

import io
import urllib.error
import urllib.request

RESULTS = {}


def check(name, got, want):
    RESULTS[name] = (got == want) or 'got: %r' % (got,)


# -- urlcleanup ---------------------------------------------------------

check('urlcleanup_exists', callable(urllib.request.urlcleanup), True)
check('urlcleanup_returns_none', urllib.request.urlcleanup(), None)

# Defensive callers invoke it repeatedly, often with nothing to clean.
urllib.request.urlcleanup()
check('urlcleanup_is_repeatable', urllib.request.urlcleanup(), None)


# -- HTTPError is a response -------------------------------------------

def _error(body=b'Bad bad bad...'):
    fp = io.BytesIO(body) if body is not None else None
    return urllib.error.HTTPError(
        'http://example.invalid/weeble', 404, 'Not Found', {}, fp)


_e = _error()
check('read_then_close', (_e.read(), _e.close()), (b'Bad bad bad...', None))
check('close_is_idempotent', _e.close(), None)
check('code_survives_close', _e.code, 404)


def _read_after_close():
    err = _error(b'x')
    err.close()
    try:
        err.read()
        return 'no raise'
    except ValueError:
        return 'ValueError'


# The fp is CLOSED, not dropped -- so a read afterwards raises from the
# file itself rather than quietly answering b''.
check('reading_after_close_raises', _read_after_close(), 'ValueError')

check('close_without_a_body', _error(None).close(), None)

check('geturl_still_works', _error().geturl(), 'http://example.invalid/weeble')
check('getcode_still_works', _error().getcode(), 404)


# An HTTPError is usable as a context manager, as a response is.

def _with_block():
    err = _error(b'ctx')
    with err as f:
        data = f.read()
    try:
        err.read()
        closed = False
    except ValueError:
        closed = True
    return (data, closed)


check('usable_as_a_context_manager', _with_block(), (b'ctx', True))


# It is still an exception, and still raisable and catchable as one.

def _raise_and_catch():
    try:
        raise _error(b'x')
    except urllib.error.URLError as exc:
        return (type(exc).__name__, exc.code, str(exc))


check('still_an_exception',
      _raise_and_catch(),
      ('HTTPError', 404, 'HTTP Error 404: Not Found'))


if __name__ == '__main__':
    for _name in sorted(RESULTS):
        _v = RESULTS[_name]
        print('%-4s %s' % ('OK' if _v is True else 'FAIL', _name),
              '' if _v is True else _v)
