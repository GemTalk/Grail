#!/bin/bash

# Regression gate for the CPython conformance scoreboard.
#
# run_cpython_suite.sh is a pure measurement harness (always exits 0); this
# script turns it into a CI gate.  It compares a freshly-regenerated scoreboard
# (CURRENT) against a committed baseline (BASELINE) and FAILS (exit 1) if any
# module got worse -- more failures/errors, an OK module that stopped passing,
# or a new CRASH/TIMEOUT/IMPORTERROR/STERROR.  Improvements never fail the gate
# (they just mean the committed scoreboard is due for a refresh).
#
# Usage:
#   ./scripts/run_cpython_suite.sh                 # regenerate docs/…Scoreboard.md
#   ./scripts/check_cpython_regressions.sh         # gate the result vs git HEAD
#   ./scripts/check_cpython_regressions.sh BASE CUR   # explicit files (tests)
#
# Both files are the scoreboard markdown; rows look like
#   | test.test_x | ERROR | 628 | 146 | 58 | 0 | detail |
# i.e. | module | status | tests | fail | err | skip | detail |.

PROJECT_ROOT=$(cd "$(dirname "$0")/.." && pwd)
CURRENT="${2:-$PROJECT_ROOT/docs/CPython_Suite_Scoreboard.md}"

# Baseline: explicit arg, else the committed version at git HEAD.
if [ -n "$1" ]; then
    BASELINE="$1"
else
    BASELINE="$(mktemp)"
    trap 'rm -f "$BASELINE"' EXIT
    if ! git -C "$PROJECT_ROOT" show HEAD:docs/CPython_Suite_Scoreboard.md > "$BASELINE" 2>/dev/null; then
        echo "cpython gate: no committed baseline scoreboard at HEAD -- skipping (nothing to compare)."
        exit 0
    fi
fi

if [ ! -f "$CURRENT" ]; then
    echo "cpython gate: current scoreboard '$CURRENT' not found (run run_cpython_suite.sh first)." >&2
    exit 2
fi

awk '
    function trim(s) { gsub(/^ +| +$/, "", s); return s }
    function is_hard(st) { return (st == "CRASH" || st == "TIMEOUT" || st == "STERROR") }
    # A status under which NO test ever ran, so its fail+err count is 0 by
    # definition rather than by merit.  Comparing counts across such a status is
    # meaningless: unblocking an IMPORTERROR always looks like a huge regression
    # (0 fail+err -> however many tests in the module do not pass yet) when it
    # is the opposite.  Once the module runs, the refreshed baseline carries the
    # real counts and ordinary count-gating resumes at the tighter number.
    # NB: this awk program is single-quoted in the shell -- no apostrophes.
    function no_tests_ran(st) {
        return (st == "IMPORTERROR" || st == "CRASH" || st == "TIMEOUT" || st == "STERROR")
    }
    # module | status | tests | fail | err | skip | detail  -> f[2]|f[3]|f[5]|f[6]
    #
    # Split on FILENAME, not the usual ``FNR == NR'': with an EMPTY baseline awk
    # never reads a record from it, so FNR == NR would still be true for the
    # first record of the CURRENT file and that row would be filed as its own
    # baseline -- gating the scoreboard against itself and passing silently.
    FILENAME == ARGV[1] {
        if ($0 ~ /^\| test\./) {
            split($0, f, /\|/)
            m = trim(f[2]); bstat[m] = trim(f[3]); bfe[m] = trim(f[5]) + trim(f[6]); bseen[m] = 1
        }
        next
    }
    $0 ~ /^\| test\./ {
        split($0, f, /\|/)
        m = trim(f[2]); cstat = trim(f[3]); cfe = trim(f[5]) + trim(f[6])
        if (!(m in bseen)) { printf "new       %s: %s (%d fail+err) -- no baseline\n", m, cstat, cfe; next }
        reg = ""
        # Unblocked: the baseline never ran a test, and now the module does.
        # An improvement regardless of the new counts -- and the count rule
        # below must NOT see it (see no_tests_ran above).
        unblocked = (no_tests_ran(bstat[m]) && !no_tests_ran(cstat))
        if (unblocked)                                 reg = ""
        else if (cfe > bfe[m])                         reg = sprintf("fail+err %d -> %d", bfe[m], cfe)
        else if (bstat[m] == "OK" && cstat != "OK")    reg = sprintf("status OK -> %s", cstat)
        else if (is_hard(cstat) && !is_hard(bstat[m])) reg = sprintf("status %s -> %s", bstat[m], cstat)
        else if (cstat == "IMPORTERROR" && bstat[m] != "IMPORTERROR") reg = sprintf("status %s -> IMPORTERROR", bstat[m])
        if (reg != "") { printf "REGRESSION %s: %s\n", m, reg; nreg++ }
        else if (unblocked) {
            printf "unblocked  %s: %s -> %s/%d (was 0 tests run)\n", m, bstat[m], cstat, cfe; nimp++
        }
        else if (cfe < bfe[m] || (bstat[m] != "OK" && cstat == "OK")) {
            printf "improved   %s: %s/%d -> %s/%d\n", m, bstat[m], bfe[m], cstat, cfe; nimp++
        }
    }
    END {
        printf "cpython regression gate: %d regression(s), %d improvement(s)\n", nreg + 0, nimp + 0
        if (nreg > 0) exit 1
    }
' "$BASELINE" "$CURRENT"
