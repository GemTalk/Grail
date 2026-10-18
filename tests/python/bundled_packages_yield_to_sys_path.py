"""A user's own copy of a package Grail bundles is the one that resolves.

Grail bundles flask, werkzeug, jinja2, markupsafe, django and a few more.
They used to sit in its stdlib tree, which is searched before sys.path, so a
user's own copy (a later version, or a modified one) never resolved: the
package census reported them as SHADOWED.  They are now a fallback searched
after sys.path, so a copy on sys.path wins, as it does in CPython (#1713).

Each check puts a stand-in copy in a fresh directory at the front of sys.path
and asks the resolver about it without importing it, so the modules the
session already has are left alone.  BundledPackagesTestCase covers the
Grail-only half: the bundled copy as the fallback, and Grail's own stdlib still
beating sys.path.

Every expectation was measured against CPython 3.14.
"""

import importlib.metadata
import importlib.util
import os
import sys
import tempfile

RESULTS = {}


def check(name, got, want):
    RESULTS[name] = (got == want) or ('got: ' + repr(got)[:300])


def _try(fn):
    """fn's answer, or the exception it raised, so one check fails alone."""
    try:
        return fn()
    except Exception as exc:
        return '%s: %s' % (type(exc).__name__, exc)


BUNDLED = ('flask', 'werkzeug', 'jinja2', 'markupsafe', 'itsdangerous',
           'blinker', 'django', 'sqlparse', 'asgiref', 'twilio')

_dir = tempfile.mkdtemp()
for _name in BUNDLED:
    os.mkdir(os.path.join(_dir, _name))
    with open(os.path.join(_dir, _name, '__init__.py'), 'w') as _fh:
        _fh.write('USERS_COPY = True\n')
_info = os.path.join(_dir, 'flask-9.9.0.dist-info')
os.mkdir(_info)
with open(os.path.join(_info, 'METADATA'), 'w') as _fh:
    _fh.write('Metadata-Version: 2.1\nName: flask\nVersion: 9.9.0\n')


def _origin(name):
    """Where find_spec resolves name, asked as if it were not yet imported."""
    saved = sys.modules.pop(name, None)
    try:
        spec = importlib.util.find_spec(name)
        return None if spec is None else spec.origin
    finally:
        if saved is not None:
            sys.modules[name] = saved


def _not_the_users_copy():
    want_root = os.path.realpath(_dir)
    out = []
    for name in BUNDLED:
        origin = _origin(name)
        if origin is None or not os.path.realpath(origin).startswith(want_root + os.sep):
            out.append((name, origin))
    return out


sys.path.insert(0, _dir)
try:
    check('a_users_copy_of_every_bundled_package_resolves',
          _try(_not_the_users_copy), [])
    check('a_users_dist_info_wins',
          _try(lambda: importlib.metadata.version('flask')), '9.9.0')
finally:
    sys.path.remove(_dir)

SUMMARY = '%d checks, %d disagreeing' % (len(RESULTS), sum(1 for v in RESULTS.values() if v is not True))

if __name__ == '__main__':
    for _name in sorted(RESULTS):
        _v = RESULTS[_name]
        print('%-4s %s' % ('OK' if _v is True else 'FAIL', _name),
              '' if _v is True else _v)
