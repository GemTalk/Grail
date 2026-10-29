"""A failed import unloads only the modules whose own import failed.

CPython's ``_load_unlocked`` deletes ``sys.modules[name]`` for the module whose
body raised and for nothing else, so the submodules that finished loading on
the way to the failure stay cached and a retry does not run them again.  Grail
unloaded the failed module's whole ``name.*`` subtree, so a retry re-executed
modules CPython reuses -- and re-executing one that defines a ``slots=True``
dataclass left its instances without their slots, so the retry raised
``AttributeError: 'P' object has no attribute 'env_vars'`` instead of the
original error.  FastAPI's test_telemetry met it through logfire's CLI.

Two packages, each imported twice.  ``grail_fpi_deep`` is the reduced logfire
case: the package imports ``_int.cli``, which imports ``_int.config`` and
``_int.params`` and then fails.  ``grail_fpi_flat`` fails in its own
``__init__`` after importing a submodule.  Every module body records itself in
``grail_fpi_runs.RUNS`` as it starts.  Self-running: ``python3
failed_package_import.py`` prints one line per check against the values
CPython 3.14 answers.
"""
import os
import shutil
import sys
import tempfile

_root = tempfile.mkdtemp(prefix="grail_failed_package_")
_DEEP = "grail_fpi_deep"
_FLAT = "grail_fpi_flat"
_RECORD = "from grail_fpi_runs import RUNS\nRUNS.append(__name__)\n"


def _write(relpath, source):
    path = os.path.join(_root, relpath)
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w") as stream:
        stream.write(source)


def _outcome(attempt):
    try:
        return "ok -> " + attempt()
    except Exception as e:
        return "%s: %s" % (type(e).__name__, e)


def _import_deep():
    import grail_fpi_deep
    return "imported"


def _import_flat():
    import grail_fpi_flat
    return "imported"


def _loaded(package):
    return sorted(k for k in sys.modules if k == package or k.startswith(package + "."))


def _runs_since(mark):
    return [name.split(".", 1)[1] if "." in name else "<package>"
            for name in sys.modules["grail_fpi_runs"].RUNS[mark:]]


_write("grail_fpi_runs.py", "RUNS = []\n")
_write(_DEEP + "/__init__.py", _RECORD + "from ._int import cli\n")
_write(_DEEP + "/_int/__init__.py", _RECORD)
_write(_DEEP + "/_int/params.py", _RECORD +
       "from dataclasses import dataclass\n"
       "@dataclass(slots=True)\n"
       "class P:\n"
       "    env_vars: list\n"
       "PARAMS = {'a': P(['GRAIL_FPI'])}\n")
_write(_DEEP + "/_int/config.py", _RECORD +
       "from . import params\n"
       "GLOBAL = params.PARAMS['a'].env_vars\n")
_write(_DEEP + "/_int/cli.py", _RECORD +
       "from .config import GLOBAL\n"
       "import grail_fpi_no_such_module\n")
_write(_FLAT + "/__init__.py", _RECORD +
       "from . import sub\n"
       "raise RuntimeError('flat stops here')\n")
_write(_FLAT + "/sub.py", _RECORD)
sys.path.insert(0, _root)
r = {}
try:
    import grail_fpi_runs
    r["deep_first"] = _outcome(_import_deep)
    r["deep_runs_first"] = _runs_since(0)
    r["deep_loaded_after_failure"] = _loaded(_DEEP)
    mark = len(grail_fpi_runs.RUNS)
    r["deep_second"] = _outcome(_import_deep)
    r["deep_runs_second"] = _runs_since(mark)
    r["deep_loaded_after_retry"] = _loaded(_DEEP)
    r["deep_slots_instance_survives"] = _outcome(lambda: repr(
        sys.modules[_DEEP + "._int.params"].PARAMS["a"].env_vars))
    r["deep_config_bound_on_int"] = _outcome(lambda: repr(
        getattr(sys.modules[_DEEP + "._int"], "config", None)
        is sys.modules[_DEEP + "._int.config"]))
    mark = len(grail_fpi_runs.RUNS)
    r["flat_first"] = _outcome(_import_flat)
    r["flat_loaded_after_failure"] = _loaded(_FLAT)
    r["flat_second"] = _outcome(_import_flat)
    r["flat_runs"] = _runs_since(mark)
finally:
    sys.path.remove(_root)
    for _name in list(sys.modules):
        if _name.startswith(("grail_fpi_deep", "grail_fpi_flat", "grail_fpi_runs")):
            del sys.modules[_name]
    shutil.rmtree(_root, ignore_errors=True)

EXPECTED = {
    'deep_config_bound_on_int': 'ok -> True',
    'deep_first': "ModuleNotFoundError: No module named 'grail_fpi_no_such_module'",
    'deep_loaded_after_failure': ['grail_fpi_deep._int', 'grail_fpi_deep._int.config',
                                  'grail_fpi_deep._int.params'],
    'deep_loaded_after_retry': ['grail_fpi_deep._int', 'grail_fpi_deep._int.config',
                                'grail_fpi_deep._int.params'],
    'deep_runs_first': ['<package>', '_int', '_int.cli', '_int.config', '_int.params'],
    'deep_runs_second': ['<package>', '_int.cli'],
    'deep_second': "ModuleNotFoundError: No module named 'grail_fpi_no_such_module'",
    'deep_slots_instance_survives': "ok -> ['GRAIL_FPI']",
    'flat_first': 'RuntimeError: flat stops here',
    'flat_loaded_after_failure': ['grail_fpi_flat.sub'],
    'flat_runs': ['<package>', 'sub', '<package>'],
    'flat_second': 'RuntimeError: flat stops here',
}

DISAGREEMENTS = sorted(k for k in EXPECTED if r.get(k, "<missing>") != EXPECTED[k])
SUMMARY = "%d checks, %d disagreeing %r, keys match: %s" % (
    len(EXPECTED), len(DISAGREEMENTS), DISAGREEMENTS, sorted(r) == sorted(EXPECTED))


if __name__ == '__main__':
    for k in sorted(EXPECTED):
        actual = r[k]
        print('%-30s %s %r' % (k, 'OK ' if actual == EXPECTED[k] else 'DIFF', actual))
