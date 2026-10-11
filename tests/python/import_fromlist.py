"""Fixture: ``__import__``'s fromlist, and ``from M import name``'s error,
as CPython does them (issue #1223).

CPython's ``__import__`` consults the fromlist only for a PACKAGE, and only
to import submodules: it never raises for a name it cannot find, and it
ignores the list entirely for a plain module.  The ``from M import name``
STATEMENT raises ``cannot import name`` itself, when it reads the name
(IMPORT_FROM), after trying ``sys.modules['M.name']``.

Grail raised that ImportError inside ``__import__``, so a direct call failed
where CPython answers the module; it ran the list for plain modules too; a
non-str item read as a missing name; and an EMPTY name -- ``fromlist=['']``,
a common way to get a dotted name's leaf module -- reached the kernel with an
empty Symbol and ended the process with an uncatchable error.

Not covered here, because a test case cannot commit: ``from PKG import mod``
in a fresh gem now imports a COMMITTED submodule this session has not
imported, so its staleness check runs.  ``in_session_del`` pins the
in-session half, where CPython keeps the attribute.

EXPECTED is CPython 3.14's output.
"""
import os
import shutil
import sys
import tempfile

sys.dont_write_bytecode = True
_DIR = tempfile.mkdtemp(prefix='grail_1223_')
sys.path.insert(0, _DIR)
_PKG = 'fl1223_%d' % os.getpid()


def _write(rel, src):
    path = os.path.join(_DIR, rel)
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, 'w') as f:
        f.write(src)


_write(_PKG + '/__init__.py', 'PKG_ATTR = 1\n')
_write(_PKG + '/test_a.py', 'class TA:\n    pass\n')
_write(_PKG + '/sub/__init__.py', '')
_write(_PKG + '/sub/leaf.py', 'V = "old"\n')


def _name(m):
    """A module by its name relative to the scratch package, so EXPECTED does
    not carry the process id."""
    n = getattr(m, '__name__', None)
    if isinstance(n, str) and n.startswith(_PKG):
        return 'PKG' + n[len(_PKG):]
    return n if isinstance(n, str) else repr(m)


def _call(thunk):
    try:
        return _name(thunk())
    except BaseException as e:
        return '%s: %s' % (type(e).__name__, str(e).replace(_PKG, 'PKG').replace(_DIR, 'DIR'))


r = {}
P = _PKG
r['empty_name_package'] = _call(lambda: __import__(P, fromlist=['']))
r['empty_name_module'] = _call(lambda: __import__(P + '.test_a', fromlist=['']))
r['empty_name_stdlib'] = [_call(lambda: __import__('json', fromlist=[''])),
                          _call(lambda: __import__('json.decoder', fromlist=[''])),
                          _call(lambda: __import__('math', fromlist=['']))]
r['missing_name_package'] = _call(lambda: __import__(P, fromlist=['nosuch']))
r['missing_name_module'] = _call(lambda: __import__(P + '.test_a', fromlist=['nosuch']))
r['missing_name_stdlib'] = [_call(lambda: __import__('json', fromlist=['nope'])),
                            _call(lambda: __import__('math', fromlist=['nosuch'])),
                            _call(lambda: __import__('os.path', fromlist=['nope']))]
r['non_str_package'] = _call(lambda: __import__(P, fromlist=[1]))
r['non_str_module'] = _call(lambda: __import__(P + '.test_a', fromlist=[1]))
r['submodule_loaded'] = (_call(lambda: __import__(P, fromlist=['test_a'])),
                         P + '.test_a' in sys.modules)
r['attribute_of_module'] = _call(lambda: __import__(P + '.test_a', fromlist=['TA']))
r['star_package'] = _call(lambda: __import__(P, fromlist=['*']))


def _stmt(src):
    ns = {}
    try:
        exec(src.replace('@P@', P), ns)
        return _name(ns.get('x'))
    except BaseException as e:
        return '%s: %s' % (type(e).__name__, str(e).replace(_PKG, 'PKG').replace(_DIR, 'DIR'))


r['stmt_missing_in_package'] = _stmt('from @P@ import nosuch as x')
r['stmt_submodule'] = _stmt('from @P@ import test_a as x')
r['stmt_nested_submodule'] = _stmt('from @P@.sub import leaf as x')
r['stmt_attribute'] = _stmt('from @P@ import PKG_ATTR as x')


def _error_fields():
    try:
        exec('from %s import nosuch' % P, {})
    except ImportError as e:
        return (e.name == P, e.name_from, e.path is not None,
                type(e).__name__)
    return 'no error'


r['stmt_error_fields'] = _error_fields()


def _in_session_del():
    """CPython counts the package's attribute however it got there: after
    the submodule leaves sys.modules, ``from PKG.sub import leaf`` answers
    the OLD object and does not import again."""
    import importlib
    mod = importlib.import_module(P + '.sub.leaf')
    del sys.modules[P + '.sub.leaf']
    _write(P + '/sub/leaf.py', 'V = "newer"\n')
    ns = {}
    exec('from %s.sub import leaf' % P, ns)
    return (ns['leaf'].V, ns['leaf'] is mod, P + '.sub.leaf' in sys.modules)


r['in_session_del'] = _in_session_del()

sys.path.remove(_DIR)
shutil.rmtree(_DIR, ignore_errors=True)


EXPECTED = {
    'empty_name_package': 'PKG',
    'empty_name_module': 'PKG.test_a',
    'empty_name_stdlib': ['json', 'json.decoder', 'math'],
    'missing_name_package': 'PKG',
    'missing_name_module': 'PKG.test_a',
    'missing_name_stdlib': ['json', 'math', 'posixpath'],
    'non_str_package': "TypeError: Item in ``from list'' must be str, not int",
    'non_str_module': 'PKG.test_a',
    'submodule_loaded': ('PKG', True),
    'attribute_of_module': 'PKG.test_a',
    'star_package': 'PKG',
    'stmt_missing_in_package': "ImportError: cannot import name 'nosuch' from 'PKG' (DIR/PKG/__init__.py)",
    'stmt_submodule': 'PKG.test_a',
    'stmt_nested_submodule': 'PKG.sub.leaf',
    'stmt_attribute': '1',
    'stmt_error_fields': (True, 'nosuch', True, 'ImportError'),
    'in_session_del': ('old', True, False),
}

def mismatches():
    """The rows that differ from CPython, as 'key: got X, CPython Y' -- what
    the Smalltalk test case asserts is empty."""
    return ['%s: got %r, CPython %r' % (k, r.get(k), v)
            for k, v in EXPECTED.items() if r.get(k) != v]


if __name__ == '__main__':
    for key, expected in EXPECTED.items():
        actual = r.get(key)
        print('%-4s %s -> %r' % ('OK' if actual == expected else 'FAIL', key, actual))
    for extra in sorted(set(r) - set(EXPECTED)):
        print('FAIL %s is not in EXPECTED' % extra)
