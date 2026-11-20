#!/bin/bash
# Behavioural test for scripts/redeploy_verdict.sh, install.sh's verdict on its
# redeploy step (scripts/redeployModules.gs).
#
# WHAT IT GUARDS.  On 2026-11-19 the redeploy session ran out of temporary
# object memory part-way, printed no summary line, and install.sh still said
# "Successful install of Grail!" and exited 0.  A step that did not finish
# must fail the install and say where its output is; one that finished with
# failed modules stays a warning; one with nothing failed is quiet.
#
# Needs no stone: the report and the full output are files the test writes.
set -u
ROOT=$(cd "$(dirname "$0")/../.." && pwd)
VERDICT="$ROOT/scripts/redeploy_verdict.sh"
SCRATCH=$(mktemp -d "${TMPDIR:-/tmp}/grail-redeploy-verdict-test.XXXXXX")
trap 'rm -rf "$SCRATCH"' EXIT
FAILED=0
ok()  { echo "  ok   - $1"; }
bad() { echo "  FAIL - $1"; FAILED=1; }
check() { if eval "$2"; then ok "$1"; else bad "$1"; fi; }

REPORT="$SCRATCH/report.out"
FULL="$SCRATCH/redeployModules.out"
run() { "$VERDICT" "$REPORT" "$FULL" > "$SCRATCH/said" 2>&1; echo $? > "$SCRATCH/rc"; }
rc() { cat "$SCRATCH/rc"; }
said() { grep -q -- "$1" "$SCRATCH/said"; }

# Finished, nothing failed.
printf '%s\n' 'redeployModules: moved  abc (same source): /old/abc.py -> /new/abc.py' \
    'redeployModules: 12 rebuilt, 2 skipped, 0 failed, in 900 ms' > "$REPORT"
: > "$FULL"
run
check "a finished run with nothing failed exits 0" '[ "$(rc)" = 0 ]'
check "and prints the report" 'said "12 rebuilt, 2 skipped, 0 failed"'
check "and no warning" '! said "Warning" && ! said "ERROR"'

# Finished, some modules failed: a warning.
printf '%s\n' 'redeployModules: FAILED  flask: not retried, its import of types is refused (see REFUSED below)' \
    'redeployModules: REFUSED  types: deployed from /old/types.py, ...' \
    'redeployModules: 10 rebuilt, 0 skipped, 1 failed, in 900 ms' > "$REPORT"
run
check "a finished run with failed modules exits 2 (a warning)" '[ "$(rc)" = 2 ]'
check "and says so" 'said "Warning: rebuilding the deployed modules failed"'
check "and prints the FAILED lines" 'said "FAILED  flask"'

# Did not finish: no summary line.
printf '%s\n' 'redeployModules: moved  abc (same source): /old/abc.py -> /new/abc.py' > "$REPORT"
printf '%s\n' 'GemStone: Error         Fatal' 'VM temporary object memory is full ' ', old space overflow' > "$FULL"
run
check "a run with no summary line exits 1" '[ "$(rc)" = 1 ]'
check "and says it did not finish" 'said "did not finish"'
check "and names the full output" "said '$FULL'"
check "and shows how it ended" 'said "VM temporary object memory is full"'

# Did not even start: no report at all.
rm -f "$REPORT" "$FULL"
run
check "a missing report exits 1" '[ "$(rc)" = 1 ]'

# install.sh fails the install on the verdict's 1.
check "install.sh exits on a run that did not finish" \
    "grep -A8 'redeploy_verdict.sh\" ' '$ROOT/install.sh' | grep -q 'exit 1'"

if [ "$FAILED" = 0 ]; then
    echo "redeploy-verdict: all checks passed"
else
    echo "redeploy-verdict: FAILED"
fi
exit "$FAILED"
