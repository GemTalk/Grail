"""A frame's f_globals is its module's namespace, whether or not sys.modules
still lists the module.

Grail derives f_globals from a frame's co_filename by finding the module with
that __file__, and it looked only in sys.modules.  So once a module had been
popped from sys.modules, or replaced there by a stand-in, every frame of its
code answered None.  CPython's f_globals is the function's own globals, so
it never depends on sys.modules.

Test suites do this all the time: ``mock.patch.dict(sys.modules, ...)``,
import tests, and stand-in modules.  pytest's unittest support filters a
failing test's traceback with ``x.frame.f_globals.get('__unittest')``, and a
None there ended the whole session with an INTERNALERROR.  s3transfer,
opentelemetry-api and pyparsing each lost every test after the first such
failure.

Every expectation was measured against CPython 3.14.
"""

import importlib
import os
import sys
import tempfile
import types

RESULTS = {}


def check(name, got, want):
    RESULTS[name] = (got == want) or ('got: ' + repr(got)[:200])


_dir = tempfile.mkdtemp()
# A name of its own per load: the harness loads this fixture once per test,
# and a module re-imported under the same name from a different file reports
# its first file's co_filename in Grail -- a separate defect this fixture is
# not about.
_NAME = 'frame_globals_probe_' + os.path.basename(_dir).replace('-', '_')
with open(os.path.join(_dir, _NAME + '.py'), 'w') as _fh:
    _fh.write('MARK = "probe"\n'
              'def boom():\n'
              '    raise ValueError("boom")\n'
              'def here():\n'
              '    return sys_getframe()\n'
              'import sys\n'
              'sys_getframe = sys._getframe\n')
sys.path.insert(0, _dir)
try:
    _mod = importlib.import_module(_NAME)
finally:
    sys.path.remove(_dir)


def _innermost_globals():
    """The module's own frame, as a traceback reports it, by its MARK."""
    try:
        _mod.boom()
    except ValueError as exc:
        tb = exc.__traceback__
        while tb.tb_next is not None:
            tb = tb.tb_next
        g = tb.tb_frame.f_globals
        return None if g is None else g.get('MARK')


def _every_frame_has_globals():
    try:
        _mod.boom()
    except ValueError as exc:
        tb = exc.__traceback__
        out = []
        while tb is not None:
            out.append(tb.tb_frame.f_globals is not None)
            tb = tb.tb_next
        return out


saved = sys.modules[_NAME]
try:
    check('a_registered_module', _innermost_globals(), 'probe')

    del sys.modules[_NAME]
    check('a_module_removed_from_sys_modules', _innermost_globals(), 'probe')
    check('every_frame_still_has_globals', _every_frame_has_globals(), [True, True])

    sys.modules[_NAME] = types.ModuleType(_NAME)
    check('a_module_replaced_in_sys_modules', _innermost_globals(), 'probe')
finally:
    sys.modules[_NAME] = saved

check('after_it_is_restored', _innermost_globals(), 'probe')

_frame = _mod.here()
del sys.modules[_NAME]
try:
    check('a_live_frame_read_after_removal',
          (_frame.f_globals or {}).get('MARK'), 'probe')
finally:
    sys.modules[_NAME] = saved
del sys.modules[_NAME]

SUMMARY = '%d checks, %d disagreeing' % (len(RESULTS), sum(1 for v in RESULTS.values() if v is not True))

if __name__ == '__main__':
    for _name in sorted(RESULTS):
        _v = RESULTS[_name]
        print('%-4s %s' % ('OK' if _v is True else 'FAIL', _name),
              '' if _v is True else _v)
