#!/bin/bash

# Self-test for scripts/check_cpython_regressions.sh -- the CPython scoreboard
# gate.  Pure text-in / exit-code-out: no stone, no gem, runs in ~a second, so
# it is cheap enough to run before the heavy conformance job.
#
# The gate is what stands between a conformance regression and a green CI run,
# and its rules are subtle (a status change and a count change can disagree
# about which direction is "worse"), so each rule gets a case here.
#
# Usage: tests/scripts/test_regression_gate.sh

set -uo pipefail

ROOT=$(cd "$(dirname "$0")/../.." && pwd)
GATE="$ROOT/scripts/check_cpython_regressions.sh"
TMP=$(mktemp -d)
trap 'rm -rf "$TMP"' EXIT

pass=0
fail=0

# Write a one-row scoreboard.  Columns match the real file:
#   | module | status | tests | fail | err | skip | detail |
board() {
    local path="$1" status="$2" tests="$3" f="$4" e="$5"
    {
        echo '| Module | Status | Tests | Fail | Error | Skip | Detail |'
        echo '| --- | --- | --- | --- | --- | --- | --- |'
        echo "| test.test_probe | $status | $tests | $f | $e | 0 |  |"
    } > "$path"
}

# check NAME EXPECTED_EXIT EXPECTED_SUBSTRING  BASE_STATUS BASE_T BASE_F BASE_E  CUR_STATUS CUR_T CUR_F CUR_E
check() {
    local name="$1" want_exit="$2" want_text="$3"; shift 3
    board "$TMP/base.md" "$1" "$2" "$3" "$4"; shift 4
    board "$TMP/cur.md"  "$1" "$2" "$3" "$4"

    local out rc
    out=$("$GATE" "$TMP/base.md" "$TMP/cur.md" 2>&1)
    rc=$?

    if [ "$rc" != "$want_exit" ]; then
        echo "FAIL $name: exit $rc, want $want_exit"
        echo "     output: $out"
        fail=$((fail + 1))
        return
    fi
    if ! printf '%s' "$out" | grep -q -- "$want_text"; then
        echo "FAIL $name: output lacks '$want_text'"
        echo "     output: $out"
        fail=$((fail + 1))
        return
    fi
    pass=$((pass + 1))
}

# --- the rule this file was added for -------------------------------------
# A module that could not even be imported ran ZERO tests, so its fail+err is 0
# by definition.  Making it import is an improvement even though the count
# jumps from 0 to "every test that doesn't pass yet" -- the plain count rule
# would call that a regression and fail the gate on a genuine fix.
check "IMPORTERROR unblocked to ERROR" 0 "unblocked" \
      IMPORTERROR 0 0 0    ERROR 370 94 249

# Same reasoning for the other statuses under which nothing runs.
check "CRASH unblocked to ERROR"   0 "unblocked"  CRASH   0 0 0   ERROR 50 1 2
check "TIMEOUT unblocked to FAIL"  0 "unblocked"  TIMEOUT 0 0 0   FAIL  50 1 0
check "STERROR unblocked to OK"    0 "unblocked"  STERROR 0 0 0   OK    50 0 0

# Unblocking must NOT excuse a later count regression: once the module runs,
# the baseline carries real counts and ordinary gating resumes.
check "running module, counts grow" 1 "REGRESSION" ERROR 370 94 249  ERROR 370 95 249

# --- pre-existing rules, so the change above didn't loosen them ------------
check "counts grow"          1 "fail+err 5 -> 9"        ERROR 40 2 3   ERROR 40 4 5
check "counts shrink"        0 "improved"               ERROR 40 4 5   ERROR 40 2 3
check "reaches OK"           0 "improved"               ERROR 40 1 1   OK    40 0 0
# An OK module that stops passing is a regression by STATUS.  Counts are held
# equal so the count rule (which fires first, and would report this as
# "fail+err 0 -> 1") cannot be what catches it.
check "OK stops passing"     1 "status OK -> FAIL"      OK    40 0 0   FAIL  40 0 0
check "OK gains a failure"   1 "REGRESSION"             OK    40 0 0   FAIL  40 1 0
check "new IMPORTERROR"      1 "-> IMPORTERROR"         ERROR 40 1 1   IMPORTERROR 0 0 0
check "new CRASH"            1 "-> CRASH"               ERROR 40 1 1   CRASH 0 0 0
check "unchanged"            0 "0 regression"           ERROR 40 1 1   ERROR 40 1 1

# --- a module absent from the baseline is reported, not silently passed ----
# This is the shape that once produced a VACUOUS green gate: a truncated
# scoreboard made every missing module read as "no baseline" and exit 0.  The
# gate cannot judge what it has never seen, so the contract is only that it
# SAYS so -- callers must also check the row count.
#
# An EMPTY baseline is the extreme case, and it used to be worse than silent:
# awk's FNR == NR file split misreads the first row of the CURRENT file as its
# own baseline, so the scoreboard was gated against ITSELF.  Every row must be
# reported as unbaselined instead.
: > "$TMP/base.md"
board "$TMP/cur.md" ERROR 40 9 9
out=$("$GATE" "$TMP/base.md" "$TMP/cur.md" 2>&1); rc=$?
if [ "$rc" = 0 ] && printf '%s' "$out" | grep -q 'no baseline'; then
    pass=$((pass + 1))
else
    echo "FAIL empty-baseline row not reported: exit $rc, output: $out"
    fail=$((fail + 1))
fi

echo "regression-gate self-test: $pass passed, $fail failed"
[ "$fail" -eq 0 ] || exit 1
