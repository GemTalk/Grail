#!/bin/bash
# Behavioural test for unittest.main()'s exit status and its __main__ default.
#
# WHAT IT GUARDS.  main() used to return its result instead of exiting, so a
# failing run left the process at 0: the summary said FAILED (failures=1) and
# ./grail still exited 0.  Any CI step that calls main() therefore reported
# every failing run as GREEN -- the worst shape of wrong, because nothing looks
# broken.  main() also refused to run without an explicit module argument, so
# the ordinary closing line of a test file,
#
#     if __name__ == "__main__":
#         unittest.main()
#
# raised TypeError rather than running anything.
#
# WHY A SHELL TEST.  Neither can be asserted from inside a fixture.  The exit
# status would end the process doing the asserting, and the __main__ default
# needs sys.modules['__main__'], which exists in a script but not in the
# embedded/topaz session the Python fixtures are also loaded from.  So this runs
# real scripts and compares each status with CPython's on the same file.
#
# tests/python/unittest_main_exit_status.py covers the rest in-process.
#
# Usage: tests/scripts/run_unittest_main_exit_test.sh
# Needs a stone (it runs ./grail); exits 0 when every case matches CPython.

set -u

ROOT=$(cd "$(dirname "$0")/../.." && pwd)
cd "$ROOT" || exit 2

PYTHON=${PYTHON:-python3}
WORK=$(mktemp -d)
trap 'rm -rf "$WORK"' EXIT

# IR codegen is unavailable on some 4.0 builds (the builder needs a server
# newer than the product); the text arm is what those machines can run, and the
# exit status this test is about does not depend on the arm.
export GRAIL_IR_CODEGEN=${GRAIL_IR_CODEGEN:-0}

cat > "$WORK/failing.py" <<'PY'
import unittest


class T(unittest.TestCase):
    def test_passes(self):
        pass

    def test_fails(self):
        self.assertEqual(1, 2)


if __name__ == "__main__":
    unittest.main()
PY

cat > "$WORK/passing.py" <<'PY'
import unittest


class T(unittest.TestCase):
    def test_passes(self):
        pass


if __name__ == "__main__":
    unittest.main()
PY

cat > "$WORK/erroring.py" <<'PY'
import unittest


class T(unittest.TestCase):
    def test_raises(self):
        raise RuntimeError("boom")


if __name__ == "__main__":
    unittest.main()
PY

cat > "$WORK/failing_explicit_module.py" <<'PY'
import sys
import unittest


class T(unittest.TestCase):
    def test_fails(self):
        self.assertEqual(1, 2)


if __name__ == "__main__":
    # The spelling that produced the SILENT GREEN: main() printed
    # "FAILED (failures=1)" and returned, so the process exited 0.
    unittest.main(module=sys.modules["__main__"])
PY

failures=0

check() {
    # check <label> <script> -- runs it under CPython and ./grail, compares
    # the two exit statuses, and requires the expected one.
    local label=$1 script=$2 want=$3
    local cpython_status grail_status

    "$PYTHON" "$script" >/dev/null 2>&1
    cpython_status=$?
    ./grail "$script" >/dev/null 2>&1
    grail_status=$?

    if [ "$grail_status" = "$want" ] && [ "$cpython_status" = "$want" ]; then
        echo "  ok   - $label (both exit $want)"
    else
        echo "  FAIL - $label: grail exited $grail_status, CPython exited" \
             "$cpython_status, expected $want"
        failures=$((failures + 1))
    fi
}

echo "unittest.main() exit status, against CPython on the same files:"
# Each script closes with a bare unittest.main(), so passing these at all is
# what says the __main__ default works -- it used to raise TypeError.
check "a failing test exits 1"  "$WORK/failing.py"  1
check "an erroring test exits 1" "$WORK/erroring.py" 1
check "a passing test exits 0"  "$WORK/passing.py"  0
# BOTH spellings are here because the two faults showed up in opposite
# directions.  With a bare main() every script exited 1 on the TypeError, so a
# FAILING one exited 1 for the wrong reason and only a PASSING one revealed
# anything.  The silent green -- a failing run exiting 0 -- needed an explicit
# module=, which is how the issue reproduced it.
check "a failing test with an explicit module= exits 1" \
      "$WORK/failing_explicit_module.py" 1

if [ "$failures" -eq 0 ]; then
    echo "unittest-main-exit: all checks passed"
    exit 0
fi
echo "unittest-main-exit: $failures check(s) failed" >&2
exit 1
