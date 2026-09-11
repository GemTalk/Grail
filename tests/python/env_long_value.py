# Regression fixture: os.environ values longer than the C environment can hold.
#
# GemStone's `System class >> gemEnvironmentVariable:put:` accepts at most 1023
# characters; at 1024 it raises OutOfRange (error 2061) from the GsFile user
# action underneath, and because that comes from a user action it is
# UNCATCHABLE by Python -- it escaped as a Smalltalk error, not an exception a
# test could handle.
#
# CPython has no such limit.  Measured on CPython 3.14 (darwin): a 100,000
# character value round-trips through os.environ exactly, and a child process
# inherits it.  Only an embedded NUL raises (ValueError).  So Grail must
# SUCCEED here rather than raise, which is why long values are kept in a
# session-local overlay that every read consults first.
#
# This bit in practice: test.test_urllib2_localnet's setUp writes the
# environment back, and on a machine whose PATH is long the write died there --
# one failure worse locally than in CI, where a container PATH is short, which
# looked like a platform difference and was not.
#
# NOTE the values here must round-trip EXACTLY.  Truncating a long value to fit
# would read back something other than what was stored, silently; that is worse
# than the limit, and the exact-equality checks below are what forbid it.

import os

LIMIT = 1023            # longest the C environment will take
RESULTS = {}

def _check(name, value):
    RESULTS[name] = value

# --- the CPython contract: exact round-trip at and past the boundary ---------
for n in (1, LIMIT, LIMIT + 1, 5000, 100000):
    os.environ['GRAIL_ELV'] = 'a' * n
    _check('roundtrip_%d' % n, os.environ['GRAIL_ELV'] == 'a' * n)

# --- both paths stay wired to the same view ---------------------------------
# short: reaches the real C environment, so os.getenv sees it
os.environ['GRAIL_ELV_SHORT'] = 'hello'
_check('short_via_getenv', os.getenv('GRAIL_ELV_SHORT') == 'hello')
_check('short_via_environ', os.environ['GRAIL_ELV_SHORT'] == 'hello')

# long: not in the C environment, but every Python reader still sees it
long_value = 'b' * 4000
os.environ['GRAIL_ELV_LONG'] = long_value
_check('long_via_getenv', os.getenv('GRAIL_ELV_LONG') == long_value)
_check('long_in_contains', 'GRAIL_ELV_LONG' in os.environ)
_check('long_in_keys', 'GRAIL_ELV_LONG' in list(os.environ.keys()))
_check('long_in_copy', os.environ.copy().get('GRAIL_ELV_LONG') == long_value)
_check('long_in_items', ('GRAIL_ELV_LONG', long_value) in list(os.environ.items()))
_check('long_via_get', os.environ.get('GRAIL_ELV_LONG') == long_value)

# --- a short write after a long one must win (no stale overlay) -------------
os.environ['GRAIL_ELV_LONG'] = 'now short'
_check('short_overwrites_long', os.environ['GRAIL_ELV_LONG'] == 'now short')
_check('short_overwrite_via_getenv', os.getenv('GRAIL_ELV_LONG') == 'now short')

# --- and a long write after a short one -------------------------------------
os.environ['GRAIL_ELV_LONG'] = long_value
_check('long_overwrites_short', os.environ['GRAIL_ELV_LONG'] == long_value)

# --- delete clears BOTH homes ------------------------------------------------
del os.environ['GRAIL_ELV_LONG']
_check('delete_clears_long', os.environ.get('GRAIL_ELV_LONG') is None)
_check('delete_removes_from_contains', 'GRAIL_ELV_LONG' not in os.environ)

# --- update() is the path test_urllib2_localnet actually took ---------------
os.environ.update({'GRAIL_ELV_UPD': 'c' * 3000})
_check('update_with_long', os.environ['GRAIL_ELV_UPD'] == 'c' * 3000)

# --- os.putenv must not RAISE on a long value -------------------------------
# (deliberately not asserting visibility: in CPython os.putenv writes the C
# environment and does NOT update os.environ, so os.getenv cannot see it, while
# Grail's os.environ is a live read-through and can.  That difference is older
# than this fixture and is not what this file pins -- only that the long write
# is accepted rather than raising.)
try:
    os.putenv('GRAIL_ELV_PUT', 'd' * 2500)
    _check('putenv_long_does_not_raise', True)
except Exception:
    _check('putenv_long_does_not_raise', False)

# --- setdefault and pop round-trip a long value -----------------------------
os.environ.pop('GRAIL_ELV_SD', None)
_check('setdefault_long', os.environ.setdefault('GRAIL_ELV_SD', 'e' * 2000) == 'e' * 2000)
_check('setdefault_long_reads', os.environ['GRAIL_ELV_SD'] == 'e' * 2000)
_check('pop_long', os.environ.pop('GRAIL_ELV_SD') == 'e' * 2000)
_check('pop_cleared', os.environ.get('GRAIL_ELV_SD') is None)

# --- a real-world PATH-sized value, the shape that started this -------------
saved_path = os.environ.get('PATH')
try:
    big_path = ':'.join('/opt/dir%03d/bin' % i for i in range(90))
    os.environ['PATH'] = big_path
    _check('path_sized_roundtrip', os.environ['PATH'] == big_path)
finally:
    if saved_path is not None:
        os.environ['PATH'] = saved_path
_check('path_restored', os.environ.get('PATH') == saved_path)
