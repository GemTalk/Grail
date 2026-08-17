# GRAIL trim of test.support.script_helper: everything here spawns a
# fresh Python subprocess, which Grail's subprocess stub cannot do --
# convert to clean SKIPs instead of opaque OSErrors (see the harness
# plan in docs/CPython_Suite_Scoreboard.md).
#
# make_script is the ONE exception and is implemented for real; see below.

import os

import unittest


def _skip(*args, **kwargs):
    raise unittest.SkipTest("subprocess unavailable under Grail")


assert_python_ok = _skip
assert_python_failure = _skip
spawn_python = _skip
kill_python = _skip
run_python_until_end = _skip


def make_script(script_dir, script_basename, source, omit_suffix=False):
    """Write ``source`` to ``<script_dir>/<script_basename>.py`` and answer the
    path -- a faithful port of CPython's script_helper.make_script.

    It was a ``_skip`` alias, which is why this needs saying: make_script does
    NOT spawn anything.  It writes a file.  It sits in script_helper only
    because its CPython callers go on to RUN the file in a subprocess, and
    being lumped in with the real subprocess entry points made every caller
    skip -- including the ones that just want a module on disk to import,
    which Grail can do perfectly well.  test.support.import_helper's
    ready_to_import is exactly that caller, and test_super's
    test_shadowed_global is why it matters: it needs a module whose body
    binds the name ``super''.

    Two deliberate omissions from CPython's version:

      * ``encoding='utf-8''' is not passed -- Grail's open() has no encoding
        parameter, and its text mode is UTF-8 already.
      * ``importlib.invalidate_caches()'' is not called -- Grail's importlib
        has no such entry point, and nothing needs invalidating: the file is
        newly created under a fresh temporary name, so no loader state names
        it yet.

    The bytes branch is kept, since CPython's contract allows a bytes source."""

    script_filename = script_basename
    if not omit_suffix:
        script_filename += os.extsep + 'py'
    script_name = os.path.join(script_dir, script_filename)
    if isinstance(source, str):
        with open(script_name, 'w') as script_file:
            script_file.write(source)
    else:
        with open(script_name, 'wb') as script_file:
            script_file.write(source)
    return script_name


def interpreter_requires_environment():
    return False
