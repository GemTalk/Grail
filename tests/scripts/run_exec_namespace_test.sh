#!/bin/bash
# What exec() binds dies with the namespace it was bound in, checked in FRESH
# gems:
#
# * tests/python/exec_namespace_is_collected.py -- a generator is finalized
#   (test_generators' test_generator_resurrect), a plain object and a function
#   are collected, and a function that outlives its exec() keeps what it
#   reads.  Each check agrees with CPython 3.14; the fixture prints a summary.
# * GrailMethodTableGcTestCase (runMethodTableGcTest.gs) -- the tables keyed
#   by compiled methods let an unowned method, its value and a dead doit go.
#
# Not from the SUnit suite.  A shard's session runs close to its
# temporary-memory cap, and there the VM did not reclaim a method that had
# just died: after the 59 classes shard 6 runs first, the fixture's checks
# failed under the shard's 600 MB cache and passed under a 2.5 GB one, with
# nothing in object memory holding the namespace.  What this guards is
# Grail's own hold on that memory, which a fresh gem measures on its own.
#
# Assumes a running stone and a sourced .setenv.
set -u
SCRIPT_DIR=$(cd "$(dirname "$0")" && pwd)
PROJECT_ROOT=$(cd "$SCRIPT_DIR/../.." && pwd)
if [ -f "$PROJECT_ROOT/.setenv" ]; then
    # shellcheck disable=SC1091
    source "$PROJECT_ROOT/.setenv"
fi
export GRAIL_DIR="$PROJECT_ROOT"
FIXTURE="$PROJECT_ROOT/tests/python/exec_namespace_is_collected.py"
OUT="$PROJECT_ROOT/out/exec_namespace_test.out"
EXPECTED_FIXTURE='8 checks, 0 disagreeing [], keys match: True'
EXPECTED_GC='GRAIL_GC_TESTS|6 run, 6 passed, 0 failed, 0 errors'
mkdir -p "$PROJECT_ROOT/out"

{
  "$PROJECT_ROOT/grail" "$FIXTURE"
  (cd "$PROJECT_ROOT" && LC_ALL=C topaz -lq \
     -C "GEM_TEMPOBJ_CODE_SIZE=300000;GEM_TEMPOBJ_CACHE_SIZE=900000;" \
     -S tests/scripts/runMethodTableGcTest.gs < /dev/null)
} > "$OUT" 2>&1
cat "$OUT"

EXIT=0
grep -qxF "$EXPECTED_FIXTURE" "$OUT" || {
  echo "exec-namespace: the fixture did not print '$EXPECTED_FIXTURE'"; EXIT=1; }
grep -qxF "$EXPECTED_GC" "$OUT" || {
  echo "exec-namespace: GrailMethodTableGcTestCase did not print '$EXPECTED_GC'"; EXIT=1; }
if [ "$EXIT" -eq 0 ]; then
  echo "exec-namespace: PASS (log: out/exec_namespace_test.out)"
else
  echo "exec-namespace: FAIL (log: out/exec_namespace_test.out)"
fi
exit $EXIT
