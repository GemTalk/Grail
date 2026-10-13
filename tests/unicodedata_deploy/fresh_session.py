"""A fresh session's view of a deployed unicodedata, for
tests/scripts/run_unicodedata_deploy_test.sh (#1508).

scripts/deployUnicodedata.gs builds both Unicode databases and commits them.
A later session must find them already built -- before it makes a single
unicodedata call -- answer from them, and be left with nothing to commit.

Grail-only (gemstone.needs_commit), so this is not a tests/python fixture.
"""
import time

import gemstone

failures = []


def check(label, ok, detail=''):
    print(('  PASS  ' if ok else '  FAIL  ') + label
          + ('' if ok or not detail else '  -- ' + detail))
    if not ok:
        failures.append(label)


check('the session starts with nothing to commit', not gemstone.needs_commit)

import _ucd
import _ucd_3_2_0
import _ucd_current
import unicodedata

versions = {_ucd_current.VERSION, _ucd_3_2_0.VERSION}
cached = _ucd._databases.get(_ucd_current.VERSION)
check('both databases are in the committed cache before any call',
      set(_ucd._databases) == versions, repr(sorted(_ucd._databases)))
check('and both are already built',
      bool(_ucd._databases)
      and all(db._built for db in _ucd._databases.values()))
check('database() answers the deployed one, not a rebuild',
      cached is not None and _ucd.database(_ucd_current) is cached)

t0 = time.perf_counter()
check("normalize('NFKC', MICRO SIGN) is GREEK SMALL LETTER MU",
      unicodedata.normalize('NFKC', 'µ') == 'μ')
first_ms = (time.perf_counter() - t0) * 1000
check('ucd_3_2_0 normalizes too',
      unicodedata.ucd_3_2_0.normalize('NFKC', 'µ') == 'μ')
check("category('A') is Lu", unicodedata.category('A') == 'Lu')
check('ucd_3_2_0 reports its own combining classes',
      unicodedata.ucd_3_2_0.combining('꧀') == 0
      and unicodedata.combining('꧀') == 9)

check('none of it needs a commit', not gemstone.needs_commit,
      'cold imports: %r' % (gemstone.uncommitted_imports,))
print('  (first normalize took %.1f ms; about 550 ms when it has to build)'
      % first_ms)

if failures:
    raise AssertionError('%d check(s) failed: %s' % (len(failures), failures))
print('unicodedata-deploy: all checks passed')
