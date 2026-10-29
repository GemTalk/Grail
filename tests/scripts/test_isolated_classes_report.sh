#!/bin/bash

# Self-test for scripts/isolated_classes_report.sh, the verdict of the nightly
# isolated-class run (#1940).  Needs no stone: it scores made-up outputs.
#
# The rules checked here are the ones whose failure would be SILENT -- a run
# that reads green although a class never ran, a partition is missing, or the
# sessions were not really new.  A real failure is easy to notice; a vacuous
# pass is not (.claude/CLAUDE.md has the history).
#
# Usage: tests/scripts/test_isolated_classes_report.sh

set -uo pipefail

ROOT=$(cd "$(dirname "$0")/../.." && pwd)
REPORT="$ROOT/scripts/isolated_classes_report.sh"
TMP=$(mktemp -d)
trap 'rm -rf "$TMP"' EXIT

pass=0
fail=0
ok()  { pass=$((pass + 1)); }
bad() { echo "FAIL $*"; fail=$((fail + 1)); }

# partition DIR IDX N SUITE_CLASSES CLASS... -- a plan.txt for one runner
partition() {
    local dir="$1" idx="$2" n="$3" sc="$4"; shift 4
    mkdir -p "$dir"
    echo "GRAIL_ISOLATED_PLAN|partition=$idx|partitions=$n|digest=42|classes=$#|tests=0|plannedMs=0|suiteClasses=$sc|suiteTests=0" > "$dir/plan.txt"
    for c in "$@"; do echo "GRAIL_ISOLATED_CLASS|$c|2" >> "$dir/plan.txt"; done
}
# passed DIR CLASS [FRESH] -- a class that ran and passed
passed() {
    printf 'GRAIL_CLASS_FRESH|class=%s|sessionTemps=%s\nGRAIL_CLASS_RESULT|class=%s|ms=5|tests=2|2 run, 2 passed, 0 failed, 0 errors\n' \
        "$2" "${3:-3}" "$2" > "$1/$2.out"
    echo 0 > "$1/$2.rc"
}
# failed DIR CLASS -- a class with one failing test
failed() {
    cat > "$1/$2.out" <<EOF
GRAIL_CLASS_FRESH|class=$2|sessionTemps=3
GRAIL_CLASS_RESULT|class=$2|ms=5|tests=2|2 run, 1 passed, 1 failed, 0 errors
GRAIL_DEFECT|[FAIL] $2>>testNeedsAnImport
GRAIL_DEFECT|    numbers.Integral is not registered
GRAIL_DEFECT|    repro: $2 debug: #testNeedsAnImport
EOF
    echo 1 > "$1/$2.rc"
}

run_report() { # $1=case name, rest = report args; sets OUTPUT and RC
    OUTPUT=$("$REPORT" "${@:2}" 2>&1)
    RC=$?
    printf '%s\n' "$OUTPUT" > "$TMP/$1.log"
}

# --- all pass -----------------------------------------------------------------
d="$TMP/green"; partition "$d/p0" 0 2 3 A B; partition "$d/p1" 1 2 3 C
passed "$d/p0" A; passed "$d/p0" B; passed "$d/p1" C
run_report green --partitions 2 "$d/p0" "$d/p1"
[ "$RC" -eq 0 ] && ok || bad "an all-pass run exits $RC: $OUTPUT"
printf '%s\n' "$OUTPUT" | grep -q '^isolated classes passed (3 classes' && ok || bad "an all-pass run says: $OUTPUT"

# --- a failing class: named, with its test and a reproduction -----------------
d="$TMP/red"; partition "$d/p0" 0 1 2 A NumbersTestCase
passed "$d/p0" A; failed "$d/p0" NumbersTestCase
run_report red "$d/p0"
[ "$RC" -ne 0 ] && ok || bad "a failing class exits 0"
printf '%s\n' "$OUTPUT" | grep -q '^FAILED  *NumbersTestCase' && ok || bad "the failing class is not named: $OUTPUT"
printf '%s\n' "$OUTPUT" | grep -q 'NumbersTestCase>>testNeedsAnImport' && ok || bad "the failing test is not named: $OUTPUT"
printf '%s\n' "$OUTPUT" | grep -q 'repro: scripts/run_isolated_classes.sh NumbersTestCase$' && ok || bad "no one-line repro: $OUTPUT"
printf '%s\n' "$OUTPUT" | grep -q '^isolated classes FAILED' && ok || bad "summary does not say FAILED: $OUTPUT"

# --- a class that never reported is INCOMPLETE, never a pass ------------------
d="$TMP/crash"; partition "$d/p0" 0 1 3 A B C
passed "$d/p0" A
printf 'GRAIL_CLASS_FRESH|class=B|sessionTemps=3\n' > "$d/p0/B.out"; echo 139 > "$d/p0/B.rc"
printf '[Error] Login failed: the maximum number of users are already logged in\n' > "$d/p0/C.out"; echo 1 > "$d/p0/C.rc"
run_report crash "$d/p0"
[ "$RC" -ne 0 ] && ok || bad "a crashed class exits 0"
printf '%s\n' "$OUTPUT" | grep -q '^INCOMPLETE  *B -- no result' && ok || bad "a crash is not INCOMPLETE: $OUTPUT"
printf '%s\n' "$OUTPUT" | grep -q '^INCOMPLETE  *C -- login refused' && ok || bad "a refused login is not INCOMPLETE: $OUTPUT"
printf '%s\n' "$OUTPUT" | grep -q '^isolated classes INCOMPLETE' && ok || bad "summary does not say INCOMPLETE: $OUTPUT"
printf '%s\n' "$OUTPUT" | grep -q 'passed (' && bad "an incomplete run reads as passed: $OUTPUT" || ok

# --- a class with no log at all (the pool never got to it) --------------------
d="$TMP/nolog"; partition "$d/p0" 0 1 2 A B; passed "$d/p0" A
run_report nolog "$d/p0"
[ "$RC" -ne 0 ] && printf '%s\n' "$OUTPUT" | grep -q '^INCOMPLETE  *B -- never started' && ok || bad "a class with no log: $OUTPUT"

# --- a timed-out class --------------------------------------------------------
d="$TMP/timeout"; partition "$d/p0" 0 1 1 A
printf 'GRAIL_CLASS_FRESH|class=A|sessionTemps=3\nGRAIL_CLASS_TIMEOUT|class=A|limit=1200s\n' > "$d/p0/A.out"; echo 124 > "$d/p0/A.rc"
run_report timeout "$d/p0"
[ "$RC" -ne 0 ] && printf '%s\n' "$OUTPUT" | grep -q 'INCOMPLETE  *A -- killed after 1200s' && ok || bad "a timeout: $OUTPUT"

# --- a missing partition ------------------------------------------------------
d="$TMP/missing"; partition "$d/p0" 0 2 3 A B; passed "$d/p0" A; passed "$d/p0" B
run_report missing --partitions 2 "$d/p0"
[ "$RC" -ne 0 ] && ok || bad "a run missing a partition exits 0: $OUTPUT"
printf '%s\n' "$OUTPUT" | grep -q 'partition 1 reported 0 time' && ok || bad "the missing partition is not named: $OUTPUT"
printf '%s\n' "$OUTPUT" | grep -q '^isolated classes INCOMPLETE' && ok || bad "a missing partition is not INCOMPLETE: $OUTPUT"

# --- one partition judged alone: its classes, not the run's coverage ---------
d="$TMP/alone"; partition "$d/p3" 3 16 1102 A B; passed "$d/p3" A; passed "$d/p3" B
run_report alone --one-partition "$d/p3"
[ "$RC" -eq 0 ] && ok || bad "a green partition judged alone exits $RC: $OUTPUT"
failed "$d/p3" B
run_report alone-red --one-partition "$d/p3"
[ "$RC" -ne 0 ] && ok || bad "a red partition judged alone exits 0: $OUTPUT"
rm "$d/p3/B.out"
run_report alone-short --one-partition "$d/p3"
[ "$RC" -ne 0 ] && printf '%s\n' "$OUTPUT" | grep -q 'INCOMPLETE  *B' && ok || bad "a partition judged alone misses a class: $OUTPUT"

# --- a plan.txt cut short (its class list does not match its own count) ------
d="$TMP/cut"; partition "$d/p0" 0 1 2 A B; passed "$d/p0" A; passed "$d/p0" B
sed -i.bak '$d' "$d/p0/plan.txt"; sed -i.bak 's/suiteClasses=2/suiteClasses=1/' "$d/p0/plan.txt"
run_report cut "$d/p0"
[ "$RC" -ne 0 ] && printf '%s\n' "$OUTPUT" | grep -q 'plans 2 classes but lists 1' && ok || bad "a truncated plan: $OUTPUT"

# --- a partition whose runner never got as far as a plan ---------------------
d="$TMP/noplan"; partition "$d/p0" 0 2 1 A; passed "$d/p0" A; mkdir -p "$d/p1"
run_report noplan --partitions 2 "$d/p0" "$d/p1"
[ "$RC" -ne 0 ] && printf '%s\n' "$OUTPUT" | grep -q 'no plan.txt' && ok || bad "a runner with no plan: $OUTPUT"

# --- partitions that planned differently --------------------------------------
d="$TMP/digest"; partition "$d/p0" 0 2 2 A; partition "$d/p1" 1 2 2 B
sed -i.bak 's/digest=42/digest=43/' "$d/p1/plan.txt"
passed "$d/p0" A; passed "$d/p1" B
run_report digest --partitions 2 "$d/p0" "$d/p1"
[ "$RC" -ne 0 ] && printf '%s\n' "$OUTPUT" | grep -q 'different splits' && ok || bad "different digests: $OUTPUT"

# --- classes that do not add up to the suite ----------------------------------
d="$TMP/short"; partition "$d/p0" 0 1 5 A; passed "$d/p0" A
run_report short "$d/p0"
[ "$RC" -ne 0 ] && printf '%s\n' "$OUTPUT" | grep -q 'listed 1 classes but the suite holds 5' && ok || bad "a short suite: $OUTPUT"

# --- an empty run -------------------------------------------------------------
d="$TMP/empty"; partition "$d/p0" 0 1 0
run_report empty "$d/p0"
[ "$RC" -ne 0 ] && ok || bad "a run of no classes exits 0: $OUTPUT"

# --- a session that did not start empty ---------------------------------------
d="$TMP/stale"; partition "$d/p0" 0 1 3 A B C
passed "$d/p0" A 3; passed "$d/p0" B 3; passed "$d/p0" C 9
run_report stale "$d/p0"
[ "$RC" -ne 0 ] && printf '%s\n' "$OUTPUT" | grep -q 'NOT ISOLATED' && ok || bad "a carried-over session: $OUTPUT"

echo "isolated-classes report self-test: $pass passed, $fail failed"
[ "$fail" -eq 0 ]
