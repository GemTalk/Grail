"""A submodule whose import fails partway is not left bound on its package
(#1651).

CPython binds ``pkg.sub`` on ``pkg`` only once ``sub`` has finished loading,
and drops ``sys.modules["pkg.sub"]`` when it fails, so every later import of a
failed submodule fails the same way.  Grail binds the child when it REGISTERS
it, before the body runs (so a circular import sees the partial module), and
used to leave that binding behind on failure: a second ``from pkg import sub``
read the attribute and answered the half-built module, and the error moved away
from its cause.

Two submodules fail, each imported twice: one with ``from pkg import sub``
after an ImportError halfway through its body, one with ``import pkg.sub``
after a RuntimeError.  Self-running: ``python3 failed_submodule_import.py``
prints one line per check against the values CPython 3.14 answers.
"""
import importlib
import os
import shutil
import sys
import tempfile

_PACKAGE = "grail_fsi_pkg"
_root = tempfile.mkdtemp(prefix="grail_failed_submodule_")


def _write(name, source):
    with open(os.path.join(_root, _PACKAGE, name), "w") as stream:
        stream.write(source)


def _outcome(attempt):
    try:
        return "ok -> " + attempt()
    except Exception as e:
        return "%s: %s" % (type(e).__name__, e)


def _from_import_half():
    from grail_fsi_pkg import half
    return "imported, X %s, Y %s" % (hasattr(half, "X"), hasattr(half, "Y"))


def _import_statement_half2():
    import grail_fsi_pkg.half2
    return "imported"


def _import_module_half():
    importlib.import_module(_PACKAGE + ".half")
    return "imported"


os.mkdir(os.path.join(_root, _PACKAGE))
_write("__init__.py", "")
_write("half.py", "X = 1\nimport grail_fsi_no_such_module\nY = 2\n")
_write("half2.py", "X = 1\nraise RuntimeError('half2 stops here')\n")
sys.path.insert(0, _root)
r = {}
try:
    r["half_first"] = _outcome(_from_import_half)
    r["half_second"] = _outcome(_from_import_half)
    r["half_in_sys_modules"] = "%s.half" % _PACKAGE in sys.modules
    r["half_bound_on_package"] = hasattr(sys.modules[_PACKAGE], "half")
    r["half_import_module"] = _outcome(_import_module_half)
    r["half2_first"] = _outcome(_import_statement_half2)
    r["half2_second"] = _outcome(_import_statement_half2)
    r["half2_in_sys_modules"] = "%s.half2" % _PACKAGE in sys.modules
    r["half2_bound_on_package"] = hasattr(sys.modules[_PACKAGE], "half2")
finally:
    sys.path.remove(_root)
    for _name in (_PACKAGE + ".half", _PACKAGE + ".half2", _PACKAGE):
        sys.modules.pop(_name, None)
    shutil.rmtree(_root, ignore_errors=True)

EXPECTED = {
    'half2_bound_on_package': False,
    'half2_first': 'RuntimeError: half2 stops here',
    'half2_in_sys_modules': False,
    'half2_second': 'RuntimeError: half2 stops here',
    'half_bound_on_package': False,
    'half_first': "ModuleNotFoundError: No module named 'grail_fsi_no_such_module'",
    'half_import_module': "ModuleNotFoundError: No module named 'grail_fsi_no_such_module'",
    'half_in_sys_modules': False,
    'half_second': "ModuleNotFoundError: No module named 'grail_fsi_no_such_module'",
}

DISAGREEMENTS = sorted(k for k in EXPECTED if r.get(k, "<missing>") != EXPECTED[k])
SUMMARY = "%d checks, %d disagreeing %r, keys match: %s" % (
    len(EXPECTED), len(DISAGREEMENTS), DISAGREEMENTS, sorted(r) == sorted(EXPECTED))


if __name__ == '__main__':
    for k in sorted(EXPECTED):
        actual = r[k]
        print('%-24s %s %r' % (k, 'OK ' if actual == EXPECTED[k] else 'DIFF', actual))
