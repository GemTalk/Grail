"""Fixture: rebuilding a module leaves no method of the old source behind
for a name the new source binds (issue #1219).

A module-level def compiles to one Smalltalk selector per call shape:
``def f(a, b)`` to the fixed ``f:_:`` plus the varargs ``_f:kw:``, and
``def f(a, b=None)`` to ``_f:kw:`` alone.  A rebuild -- ``importlib.reload``,
or a fresh gem rebuilding a stale committed module into its instance --
recompiles the module class in place and only ever ADDED methods, so after
that edit the old ``f:_:`` survived and ``f(1, 2)`` ran the OLD body while
``f(1)`` ran the new one.  The same happened to a def turned into a
variable or a class.

Each case writes a module, imports it, rewrites it and reloads it.  EXPECTED
is CPython 3.14's output.

Kept as in CPython's reload: a def the new source does not mention at all is
still there (``deleted_def_kept``) -- reload re-executes the body over the
old namespace.  KNOWN_DIVERGENCES: a function object fetched BEFORE the
reload runs the new body in Grail (a function handle names its selector, not
a frozen body), where CPython's old function object runs the old one.
"""
import importlib
import os
import shutil
import sys
import tempfile

# No bytecode: CPython validates a .pyc by source mtime and size, and a
# rewrite of the same size within the same second would reuse the old one.
sys.dont_write_bytecode = True
_DIR = tempfile.mkdtemp(prefix='grail_1219_')
sys.path.insert(0, _DIR)
_seq = [0]


def _write(name, src):
    with open(os.path.join(_DIR, name + '.py'), 'w') as f:
        f.write(src)


def _fresh_name(stem):
    _seq[0] += 1
    return 'rebuild_%s_%d_%d' % (stem, os.getpid(), _seq[0])


def _call(thunk):
    try:
        return repr(thunk())
    except Exception as e:
        return '%s: %s' % (type(e).__name__, e)


def rebuilt(stem, old, new):
    """Import ``old`` as a fresh module, rewrite it to ``new``, reload; answer
    (module, name)."""
    name = _fresh_name(stem)
    _write(name, old)
    importlib.invalidate_caches()
    mod = importlib.import_module(name)
    _write(name, new)
    importlib.invalidate_caches()
    return importlib.reload(mod), name


r = {}

OLD2 = 'def f(a, b):\n    return "old"\n'
m, _ = rebuilt('default', OLD2, 'def f(a, b=None):\n    return "new"\n')
r['gains_default'] = (_call(lambda: m.f(1, 2)), _call(lambda: m.f(1)))

m, _ = rebuilt('grows', 'def f(a):\n    return "old"\n', 'def f(a, b):\n    return "new"\n')
r['gains_parameter'] = (_call(lambda: m.f(1)), _call(lambda: m.f(1, 2)))

m, _ = rebuilt('shrinks', OLD2, 'def f(a):\n    return "new"\n')
r['loses_parameter'] = (_call(lambda: m.f(1, 2)), _call(lambda: m.f(1)))

m, _ = rebuilt('star', OLD2, 'def f(a, *rest):\n    return "new"\n')
r['gains_star'] = (_call(lambda: m.f(1, 2)), _call(lambda: m.f(1, 2, 3)))

m, _ = rebuilt('kwonly', OLD2, 'def f(a, *, b):\n    return "new"\n')
r['becomes_keyword_only'] = (_call(lambda: m.f(1, 2)), _call(lambda: m.f(1, b=2)))

m, _ = rebuilt('body', OLD2, 'def f(a, b):\n    return "new body"\n')
r['body_only'] = _call(lambda: m.f(1, 2))

m, _ = rebuilt('tovar', OLD2, 'f = 5\n')
r['def_becomes_variable'] = _call(lambda: m.f)

m, _ = rebuilt('tocls', OLD2, 'class f:\n    def __init__(self, a, b):\n        self.s = "new"\n')
r['def_becomes_class'] = _call(lambda: m.f(1, 2).s)

m, _ = rebuilt('gone', 'def g(a):\n    return "old"\ndef f():\n    return 1\n',
               'def f():\n    return 2\n')
r['deleted_def_kept'] = (_call(lambda: m.f()), hasattr(m, 'g'), _call(lambda: m.g(1)))

m, _ = rebuilt('method', 'class K:\n    def m(self, a):\n        return "old"\n',
               'class K:\n    def m(self, a=None):\n        return "new"\n')
r['method_gains_default'] = (_call(lambda: m.K().m(1)), _call(lambda: m.K().m()))

# A caller compiled against the OLD shape, in another module.
_callee = _fresh_name('callee')
_caller = _fresh_name('caller')
_write(_callee, OLD2)
_write(_caller, 'import %s as callee\ndef two():\n    return callee.f(1, 2)\n'
                'def one():\n    return callee.f(1)\n' % _callee)
importlib.invalidate_caches()
_callee_mod = importlib.import_module(_callee)
_caller_mod = importlib.import_module(_caller)
_before = _call(_caller_mod.two)
_cached = _callee_mod.f
_write(_callee, 'def f(a, b=None):\n    return "new"\n')
importlib.invalidate_caches()
importlib.reload(_callee_mod)
r['other_module_caller'] = (_before, _call(_caller_mod.two), _call(_caller_mod.one))
r['handle_fetched_before'] = _call(lambda: _cached(1, 2))

sys.path.remove(_DIR)
shutil.rmtree(_DIR, ignore_errors=True)


EXPECTED = {
    'gains_default': ("'new'", "'new'"),
    'gains_parameter': ("TypeError: f() missing 1 required positional argument: 'b'", "'new'"),
    'loses_parameter': ('TypeError: f() takes 1 positional argument but 2 were given', "'new'"),
    'gains_star': ("'new'", "'new'"),
    'becomes_keyword_only': ('TypeError: f() takes 1 positional argument but 2 were given', "'new'"),
    'body_only': "'new body'",
    'def_becomes_variable': '5',
    'def_becomes_class': "'new'",
    'deleted_def_kept': ('2', True, "'old'"),
    'method_gains_default': ("'new'", "'new'"),
    'other_module_caller': ("'old'", "'new'", "'new'"),
}

KNOWN_DIVERGENCES = {
    # Grail runs the new body: the handle names a selector, and the reload
    # recompiled it.
    'handle_fetched_before': "'old'",
}

def mismatches():
    """The rows that differ from CPython, as 'key: got X, CPython Y' -- what the
    Smalltalk test case asserts is empty.  A known divergence that now agrees
    is reported too, so it gets moved into EXPECTED."""
    bad = ['%s: got %r, CPython %r' % (k, r.get(k), v)
           for k, v in EXPECTED.items() if r.get(k) != v]
    bad += ['%s now matches CPython; move it to EXPECTED' % k
            for k, v in KNOWN_DIVERGENCES.items() if r.get(k) == v]
    return bad


if __name__ == '__main__':
    for key, expected in EXPECTED.items():
        actual = r.get(key)
        print('%-4s %s -> %r' % ('OK' if actual == expected else 'FAIL', key, actual))
    for key, expected in KNOWN_DIVERGENCES.items():
        actual = r.get(key)
        print('%-5s %s -> %r' % ('OK' if actual == expected else 'XFAIL', key, actual))
    for extra in sorted(set(r) - set(EXPECTED) - set(KNOWN_DIVERGENCES)):
        print('FAIL %s is not in EXPECTED' % extra)
