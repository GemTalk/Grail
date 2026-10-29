#!/bin/bash
# ===========================================================================
# Run every SUnit class in a session of its own (#1940).
# ===========================================================================
# Usage:
#   scripts/run_isolated_classes.sh                      every PythonTestCase class
#   scripts/run_isolated_classes.sh NumbersTestCase ...  just these classes
#
# The gate (scripts/run_tests.sh) runs many classes in one session per shard,
# so a class can pass only because an EARLIER class in the same session left
# something behind -- an import in sys.modules, a SessionTemps entry, a
# transient method.  NumbersTestCase did exactly that (#1937): it passed while
# some earlier class happened to import `numbers', and failed the day #1912's
# time-based partition put it first.  Here each class gets a NEW linked topaz
# -- a new gem process, so a new session with nothing in it -- and runs alone.
# A class that depends on its predecessors fails every time, not only when a
# partition happens to isolate it.
#
# WHY A PROCESS PER CLASS, not a logout/login in one topaz: a linked gem keeps
# its C-level state across a re-login (the CPython shim's dlopen'd modules
# are refused after one -- tests/scripts/run_shim_relogin_test.sh), so a
# re-login is not a pristine session, and it would make a class that loads a
# C extension fail the NEXT class.  A new process costs about a second here.
#
# Each class session prints its SessionTemps size at login, before anything
# runs (GRAIL_CLASS_FRESH); the report insists they are all equal.  A session
# that had carried state over from an earlier class would show more.
#
# Settings (all optional):
#   GRAIL_ISOLATED_JOBS           class sessions at once.  Default: the CPU
#                                 count, capped at 4 and at the stone's free
#                                 sessions.
#   GRAIL_ISOLATED_PARTITIONS     split the classes over this many runners
#   GRAIL_ISOLATED_PARTITION      ... and run this one (0-based); CI's matrix.
#                                 GrailShardPlan places them by measured time.
#   GRAIL_ISOLATED_CLASS_TIMEOUT  seconds before a class session is killed
#                                 and reported INCOMPLETE.  Default 1200.
#   GRAIL_ISOLATED_OUT            output directory.  Default out/isolated.
#   GRAIL_TEST_COLD=1             skip the framework deploy, as run_tests.sh.
#
# Output: one log per class in $GRAIL_ISOLATED_OUT/<Class>.out, then the
# report (scripts/isolated_classes_report.sh): each failing class with its
# failing tests and a one-line reproduction, and one summary line.  Exits 0
# only when every class it was asked for RAN and PASSED: a class that never
# reported (crash, login refused, timeout) makes the run INCOMPLETE, which
# fails it -- never a pass.
# ===========================================================================

PROJECT_ROOT=$(cd "$(dirname "$0")/.." && pwd)
if [ -f "$PROJECT_ROOT/.setenv" ]; then
    # shellcheck disable=SC1091
    source "$PROJECT_ROOT/.setenv"
fi
cd "$PROJECT_ROOT" || exit 1

# The gate's own session settings (run_tests.sh's TOPAZ_CFG): a class must see
# the memory and stack depth it sees there, or a difference would read as an
# order dependence.
TOPAZ_CFG="GEM_TEMPOBJ_CODE_SIZE=300000;GEM_TEMPOBJ_CACHE_SIZE=900000;GEM_MAX_SMALLTALK_STACK_DEPTH=48000;"
OUT="${GRAIL_ISOLATED_OUT:-$PROJECT_ROOT/out/isolated}"
CLASS_TIMEOUT="${GRAIL_ISOLATED_CLASS_TIMEOUT:-1200}"

# --- one class (the worker pool below calls this script back with --one) ----
# Run "$@" with a $1-second cap; 124 if it had to be killed.  As
# run_cpython_suite.sh's run_capped: no coreutils `timeout' on macOS, and
# killing a linked topaz kills its gem.
run_capped() {
    local limit="$1"; shift
    "$@" &
    local pid=$! started=$SECONDS
    while kill -0 "$pid" 2>/dev/null; do
        sleep 1
        if [ $((SECONDS - started)) -ge "$limit" ]; then
            kill -9 "$pid" 2>/dev/null
            wait "$pid" 2>/dev/null
            return 124
        fi
    done
    wait "$pid"
}

if [ "${1:-}" = --one ]; then
    cls="$2"
    . "$PROJECT_ROOT/scripts/launch_gate.sh"
    launch_gate_init "${GRAIL_ISOLATED_JOBS:-1}" > /dev/null
    launch_gate "class $cls" 0
    t0=$SECONDS
    GRAIL_TEST_CLASS="$cls" LC_ALL=C run_capped "$CLASS_TIMEOUT" \
        topaz -lq -C "$TOPAZ_CFG" -S tests/scripts/runTestClassIsolated.gs \
        < /dev/null > "$OUT/$cls.out" 2>&1
    rc=$?
    echo "$rc" > "$OUT/$cls.rc"
    [ "$rc" = 124 ] && echo "GRAIL_CLASS_TIMEOUT|class=$cls|limit=${CLASS_TIMEOUT}s" >> "$OUT/$cls.out"
    printf '%-6s %4ds  %s\n' "$([ "$rc" = 0 ] && echo ok || echo FAILED)" "$((SECONDS - t0))" "$cls"
    exit 0
fi

if [ -z "${GEMSTONE:-}" ]; then
    echo "Error: \$GEMSTONE is not set (source .setenv)." >&2
    exit 1
fi

T0=$SECONDS
rm -rf "$OUT"
mkdir -p "$OUT"

# The framework closures are deployed first, as run_tests.sh does: what the
# gate binds warm, every class here binds warm too.  That is committed state,
# the same for every session -- not an order dependence.
if [ -z "${GRAIL_TEST_COLD:-}" ]; then
    GRAIL_DIR="$PROJECT_ROOT" LC_ALL=C topaz -lq -C "$TOPAZ_CFG" -S scripts/deployFrameworks.gs < /dev/null \
        | grep -E "deployFrameworks|skipped" || { echo "framework deploy FAILED" >&2; exit 1; }
fi

# --- which classes ----------------------------------------------------------
if [ "$#" -gt 0 ]; then
    # Named classes: one partition holding exactly these.
    echo "GRAIL_ISOLATED_PLAN|partition=0|partitions=1|digest=named|classes=$#|tests=0|plannedMs=0|suiteClasses=$#|suiteTests=0" > "$OUT/plan.txt"
    for c in "$@"; do echo "GRAIL_ISOLATED_CLASS|$c|0"; done >> "$OUT/plan.txt"
else
    GRAIL_DIR="$PROJECT_ROOT" \
    GRAIL_ISOLATED_PARTITIONS="${GRAIL_ISOLATED_PARTITIONS:-1}" \
    GRAIL_ISOLATED_PARTITION="${GRAIL_ISOLATED_PARTITION:-0}" \
        LC_ALL=C topaz -lq -C "$TOPAZ_CFG" -S tests/scripts/listIsolatedClasses.gs < /dev/null \
        | grep '^GRAIL_ISOLATED_' > "$OUT/plan.txt"
    if ! grep -q '^GRAIL_ISOLATED_PLAN|' "$OUT/plan.txt"; then
        echo "Error: could not list the test classes (tests/scripts/listIsolatedClasses.gs)" >&2
        exit 1
    fi
fi
sed -n 's/^GRAIL_ISOLATED_CLASS|\([^|]*\)|.*/\1/p' "$OUT/plan.txt" > "$OUT/classes.txt"
N_CLASSES=$(grep -c . "$OUT/classes.txt" || true)
head -1 "$OUT/plan.txt"

# --- how many at once -------------------------------------------------------
CPUS=$(getconf _NPROCESSORS_ONLN 2>/dev/null || sysctl -n hw.logicalcpu 2>/dev/null || echo 2)
JOBS="${GRAIL_ISOLATED_JOBS:-$(( CPUS < 4 ? CPUS : 4 ))}"
# Never more class sessions than the stone has room for: a session refused at
# login is reported INCOMPLETE (so it cannot pass), but it is a wasted run.
BUDGET=$(LC_ALL=C topaz -lq -C "$TOPAZ_CFG" -S tests/scripts/checkSessionBudget.gs < /dev/null 2>/dev/null \
         | sed -n 's/.*GRAIL_SESSION_BUDGET|max=\([0-9]*\)|inuse=\([0-9]*\)|free=\([0-9]*\).*/\3/p')
if [ -n "$BUDGET" ] && [ "$BUDGET" -lt "$JOBS" ]; then
    echo "stone has $BUDGET free session(s); running $BUDGET class sessions at once instead of $JOBS"
    JOBS=$BUDGET
fi
[ "$JOBS" -ge 1 ] 2>/dev/null || JOBS=1
echo "isolated classes: $N_CLASSES class(es), $JOBS at a time, each in a new session (timeout ${CLASS_TIMEOUT}s)"

# --- run --------------------------------------------------------------------
export GRAIL_ISOLATED_JOBS="$JOBS" GRAIL_ISOLATED_OUT="$OUT" GRAIL_ISOLATED_CLASS_TIMEOUT="$CLASS_TIMEOUT"
export GRAIL_DIR="$PROJECT_ROOT"
tr '\n' '\0' < "$OUT/classes.txt" | xargs -0 -n 1 -P "$JOBS" "$PROJECT_ROOT/scripts/run_isolated_classes.sh" --one

echo "TIMING | isolated classes           | $((SECONDS - T0))s"
# One partition of several is judged on its own classes here; whether the
# partitions together covered the suite is the CI summary job's question.
if [ "$#" -eq 0 ] && [ "${GRAIL_ISOLATED_PARTITIONS:-1}" -gt 1 ]; then
    "$PROJECT_ROOT/scripts/isolated_classes_report.sh" --one-partition "$OUT"
else
    "$PROJECT_ROOT/scripts/isolated_classes_report.sh" "$OUT"
fi
