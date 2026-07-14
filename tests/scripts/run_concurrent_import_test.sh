#!/bin/bash
# Interleaved-commit concurrency test for the reduced-conflict canonical
# registries (docs/Persistent_Modules_and_Classes.md par.10.7 phase 8).
#
# Linked topaz allows one session per process, so TRUE interleaving uses two
# concurrent topaz PROCESSES (as the parallel test shards do), synchronised
# through marker files: both workers cold-import DISJOINT modules flag-on
# (uncommitted registry writes in overlapping transactions), then commit in
# sequence. Worker B's commit succeeding -- and a fresh verifier session
# seeing BOTH entries -- is the merge assertion. A same-module race is out
# of scope (documented last-writer-wins; concurrent first imports of the
# SAME new module can also conflict on PythonModules, a plain
# SymbolDictionary -- deploys should come from one session).
#
# Assumes a running stone and a sourced .setenv (mirrors run_tests.sh).
set -u
SCRIPT_DIR=$(cd "$(dirname "$0")" && pwd)
PROJECT_ROOT=$(cd "$SCRIPT_DIR/../.." && pwd)
if [ -z "${GEMSTONE:-}" ] && [ -f "$PROJECT_ROOT/.setenv" ]; then
    # shellcheck disable=SC1091
    source "$PROJECT_ROOT/.setenv"
fi
TOPAZ_CFG="GEM_TEMPOBJ_CODE_SIZE=300000;GEM_TEMPOBJ_CACHE_SIZE=500000;"
export GRAIL_DIR="$PROJECT_ROOT"

SYNC=$(mktemp -d "${TMPDIR:-/tmp}/grail_cc.XXXXXX")
export GRAIL_CC_SYNC="$SYNC"
trap 'rm -rf "$SYNC"' EXIT

for role in a b; do
  cat > "$SYNC/grail_ccmod_$role.py" <<EOF
# Concurrency-test fixture (worker $role) -- disjoint module per worker.
class Marker_$role:
    pass

value = 41
EOF
done

EXIT=0
LC_ALL=C topaz -lq -C "$TOPAZ_CFG" -S "$SCRIPT_DIR/concurrentImportPrep.gs" < /dev/null \
  > "$SYNC/prep.out" 2>&1 || { echo "concurrent-import: PREP FAILED (see below)"; cat "$SYNC/prep.out"; exit 1; }

GRAIL_CC_ROLE=a LC_ALL=C topaz -lq -C "$TOPAZ_CFG" -S "$SCRIPT_DIR/concurrentImportWorker.gs" < /dev/null \
  > "$SYNC/worker_a.out" 2>&1 &
PID_A=$!
GRAIL_CC_ROLE=b LC_ALL=C topaz -lq -C "$TOPAZ_CFG" -S "$SCRIPT_DIR/concurrentImportWorker.gs" < /dev/null \
  > "$SYNC/worker_b.out" 2>&1 &
PID_B=$!
wait "$PID_A" || EXIT=$?
wait "$PID_B" || EXIT=$?
grep -h "commit ->" "$SYNC"/worker_*.out 2>/dev/null
grep -hA6 "conflicts (informational):" "$SYNC"/worker_*.out 2>/dev/null

if [ "$EXIT" -ne 0 ]; then
  echo "concurrent-import: a worker FAILED"
  tail -20 "$SYNC/worker_a.out"; tail -20 "$SYNC/worker_b.out"
fi

LC_ALL=C topaz -lq -C "$TOPAZ_CFG" -S "$SCRIPT_DIR/concurrentImportVerify.gs" < /dev/null \
  > "$SYNC/verify.out" 2>&1 || EXIT=$?
grep -E "passed|FAILED|  " "$SYNC/verify.out" | head -10

exit $EXIT
