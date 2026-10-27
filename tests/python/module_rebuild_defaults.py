"""Fixture: a rebuilt module's def evaluates its defaults again (GemTalk/Grail#1884).

A module-level def compiles to a method, and its defaults are memoised per
module INSTANCE at first use.  A rebuild -- importlib.reload, the lazy bind of
a stale deployed module, an install's redeploy -- runs the body again INTO the
same instance, so the memo kept the first body's values while the globals they
came from were created anew.  dataclasses.py is where it showed:

    MISSING = _MISSING_TYPE()
    def field(*, default=MISSING, default_factory=MISSING, ...):
        if default is not MISSING and default_factory is not MISSING:
            raise ValueError('cannot specify both default and default_factory')

Once field() had been called, a rebuild of dataclasses left ``default`` the
OLD sentinel, and every ``field(default_factory=list)`` raised -- werkzeug.routing
in GemDB's redeploy.  CPython re-executing a def evaluates its defaults again.

Each case writes a module, imports it, calls it, then reloads it.  EXPECTED is
CPython 3.14's output.
"""
import importlib
import os
import shutil
import sys
import tempfile

sys.dont_write_bytecode = True
_DIR = tempfile.mkdtemp(prefix='grail_1884_')
sys.path.insert(0, _DIR)
_seq = [0]

SOURCE = '''
class _MISSING_TYPE:
    pass
MISSING = _MISSING_TYPE()

def field(*, default=MISSING, default_factory=MISSING):
    if default is not MISSING and default_factory is not MISSING:
        raise ValueError('cannot specify both default and default_factory')
    return 'factory' if default_factory is not MISSING else 'default'

def positional(x=MISSING):
    return x is MISSING

def appended(item, into=[]):
    into.append(item)
    return list(into)
'''


def _call(thunk):
    try:
        return thunk()
    except Exception as e:
        return '%s: %s' % (type(e).__name__, e)


_seq[0] += 1
_name = 'rebuild_defaults_%d_%d' % (os.getpid(), _seq[0])
with open(os.path.join(_DIR, _name + '.py'), 'w') as f:
    f.write(SOURCE)
importlib.invalidate_caches()
m = importlib.import_module(_name)

r = {}
r['before'] = (_call(lambda: m.field(default_factory=list)),
               _call(lambda: m.positional()),
               _call(lambda: m.appended(1)), _call(lambda: m.appended(2)))
_old_missing = m.MISSING
importlib.reload(m)
r['sentinel_is_new'] = m.MISSING is not _old_missing
r['keyword_only_default'] = (_call(lambda: m.field(default_factory=list)),
                             _call(lambda: m.field(default=1)),
                             _call(lambda: m.field()))
r['positional_default'] = _call(lambda: m.positional())
r['dunder_defaults'] = (m.positional.__defaults__[0] is m.MISSING,
                        m.field.__kwdefaults__['default'] is m.MISSING)
r['mutable_default_is_fresh'] = _call(lambda: m.appended(3))
importlib.reload(m)
r['second_reload'] = (_call(lambda: m.field(default_factory=dict)),
                      _call(lambda: m.positional()))

sys.path.remove(_DIR)
shutil.rmtree(_DIR, ignore_errors=True)

EXPECTED = {
    'before': ('factory', True, [1], [1, 2]),
    'sentinel_is_new': True,
    'keyword_only_default': ('factory', 'default', 'default'),
    'positional_default': True,
    'dunder_defaults': (True, True),
    'mutable_default_is_fresh': [3],
    'second_reload': ('factory', True),
}

DISAGREEMENTS = sorted(k for k in EXPECTED if r.get(k, '<missing>') != EXPECTED[k])
SUMMARY = '%d checks, %d disagreeing %r, keys match: %s' % (
    len(EXPECTED), len(DISAGREEMENTS), DISAGREEMENTS, sorted(r) == sorted(EXPECTED))


if __name__ == '__main__':
    for key in EXPECTED:
        actual = r.get(key)
        print('%-4s %s' % ('OK' if actual == EXPECTED[key] else 'FAIL', key))
        if actual != EXPECTED[key]:
            print('   got %r, want %r' % (actual, EXPECTED[key]))
    print(SUMMARY)
