# GRAIL trim of test.support.script_helper: everything here spawns a
# fresh Python subprocess, which Grail's subprocess stub cannot do --
# convert to clean SKIPs instead of opaque OSErrors (see the harness
# plan in docs/CPython_Suite_Scoreboard.md).

import unittest


def _skip(*args, **kwargs):
    raise unittest.SkipTest("subprocess unavailable under Grail")


assert_python_ok = _skip
assert_python_failure = _skip
spawn_python = _skip
kill_python = _skip
make_script = _skip
run_python_until_end = _skip


def interpreter_requires_environment():
    return False
