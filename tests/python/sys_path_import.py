"""Fixtures for three import-machinery rules, each independently broken.

Driven by PythonTests>>ImportMachineryTestCase.  Each check answers True when the
behaviour matches CPython, so a failure names the specific rule.

1. ``sys.path'' has to be consulted.  Appending a directory to sys.path is THE
   documented way to extend the import search path, and Grail's resolver did not
   look at it at all -- it searched grailDir, the bundled stdlib, and a
   Grail-specific ``extraSearchRoots'' list that only code written for Grail could
   reach.  So ``sys.path.append(d); import m'' raised ModuleNotFoundError no
   matter what was in d.

2. ``from PKG import missing_name'' has to raise ImportError, saying
   ``cannot import name 'x' from 'PKG' (path)'' and carrying name / name_from /
   path.  Grail raised ModuleNotFoundError naming ``PKG.x'' as a missing MODULE,
   which is a different (and wrong) claim about what went wrong.  ImportError is
   ModuleNotFoundError's base class, so the ``try: from . import x except
   ImportError: pass'' hooks the old behaviour served keep working.

3. Deleting a str key from a Symbol-keyed dictionary has to work.  sys.modules is
   a SymbolDictionary: lookup compares by equality so a str key is FOUND, but
   removal matches by identity so it removed nothing and GemStone signalled an
   UNCATCHABLE LookupError.  ``del sys.modules[name]'' and
   ``sys.modules.pop(name, None)'' both did this to every caller --
   test.support.import_helper's unload/forget, which every temp-module test uses
   for cleanup, among them.

Run this file under CPython (``python3 tests/python/sys_path_import.py'') to see
what it produces -- that is where the expectations come from.

NOT asserted here: that sys.path is re-read on every import rather than cached
once.  Grail does re-read it (importlib>>___sysPathRoots___ is called per
resolution, deliberately, since sys.path is a list a caller may append to or pop
from at will), but the property cannot be checked portably from a file that also
runs standalone -- then its own directory is already sys.path[0], so no amount of
appending and popping can make the probe module unimportable.  Two attempts at
asserting it produced checks that failed under CPython for that reason, which is
worth recording rather than leaving as a puzzle for the next reader.
"""

import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
PROBE = 'importable_probe_mod'


def _with_here_on_path(fn):
    """Run fn() with this directory on sys.path and the probe module unloaded,
    then restore both -- the append-then-pop-in-cleanup idiom, which is also what
    makes rule 3 load-bearing."""
    sys.path.append(HERE)
    try:
        sys.modules.pop(PROBE, None)
        return fn()
    finally:
        sys.modules.pop(PROBE, None)
        sys.path.pop()


def a_directory_on_sys_path_is_searched():
    """Rule 1.  The module is reachable by BARE name only through sys.path."""
    def go():
        mod = __import__(PROBE)
        return getattr(mod, 'blech', 'missing') is None
    return _with_here_on_path(go) is True


def a_module_found_via_sys_path_lands_in_sys_modules():
    def go():
        __import__(PROBE)
        return PROBE in sys.modules
    return _with_here_on_path(go) is True


def a_from_import_of_a_present_name_works():
    def go():
        ns = {}
        exec('from %s import blech' % PROBE, ns)
        return 'blech' in ns
    return _with_here_on_path(go) is True


def a_from_import_of_a_missing_name_raises_importerror():
    """Rule 2.  Not ModuleNotFoundError: the module was found, the NAME was not."""
    def go():
        try:
            exec('from %s import bluch' % PROBE, {})
        except ImportError as e:
            return type(e).__name__ == 'ImportError'
        return False
    return _with_here_on_path(go) is True


def the_missing_name_error_reads_like_cpythons():
    def go():
        try:
            exec('from %s import bluch' % PROBE, {})
        except ImportError as e:
            text = str(e)
            return (("cannot import name 'bluch' from '%s'" % PROBE) in text
                    and 'importable_probe_mod.py' in text)
        return False
    return _with_here_on_path(go) is True


def the_missing_name_error_carries_name_and_name_from():
    """What a suggestion would be computed from, and what stdlib code reads."""
    def go():
        try:
            exec('from %s import bluch' % PROBE, {})
        except ImportError as e:
            return (getattr(e, 'name', None) == PROBE
                    and getattr(e, 'name_from', None) == 'bluch')
        return False
    return _with_here_on_path(go) is True


def deleting_a_module_from_sys_modules_works():
    """Rule 3.  This raised an UNCATCHABLE Smalltalk LookupError, so it could not
    even be worked around from Python."""
    _with_here_on_path(lambda: __import__(PROBE))
    sys.path.append(HERE)
    try:
        __import__(PROBE)
        del sys.modules[PROBE]
        return PROBE not in sys.modules
    finally:
        sys.modules.pop(PROBE, None)
        sys.path.pop()


def popping_a_module_from_sys_modules_works():
    """The two-argument form, which is what test.support's unload() uses."""
    sys.path.append(HERE)
    try:
        __import__(PROBE)
        popped = sys.modules.pop(PROBE, None)
        return popped is not None and PROBE not in sys.modules
    finally:
        sys.modules.pop(PROBE, None)
        sys.path.pop()


def popping_an_absent_key_returns_the_default():
    return sys.modules.pop('no_such_module_at_all_xyz', 'fallback') == 'fallback'


def deleting_an_absent_key_raises_keyerror():
    """The error has to be a catchable Python KeyError, not a Smalltalk one."""
    try:
        del sys.modules['no_such_module_at_all_xyz']
    except KeyError:
        return True
    return False


if __name__ == '__main__':
    checks = [
        a_directory_on_sys_path_is_searched,
        a_module_found_via_sys_path_lands_in_sys_modules,
        a_from_import_of_a_present_name_works,
        a_from_import_of_a_missing_name_raises_importerror,
        the_missing_name_error_reads_like_cpythons,
        the_missing_name_error_carries_name_and_name_from,
        deleting_a_module_from_sys_modules_works,
        popping_a_module_from_sys_modules_works,
        popping_an_absent_key_returns_the_default,
        deleting_an_absent_key_raises_keyerror,
    ]
    for fn in checks:
        print('%-4s %s' % ('OK' if fn() is True else 'FAIL', fn.__name__))
