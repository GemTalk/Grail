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
    # module | status | tests | fail | err | skip | detail  -> f[2]|f[3]|f[5]|f[6]
    FNR == NR {
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
        if (cfe > bfe[m])                              reg = sprintf("fail+err %d -> %d", bfe[m], cfe)
        else if (bstat[m] == "OK" && cstat != "OK")    reg = sprintf("status OK -> %s", cstat)
        else if (is_hard(cstat) && !is_hard(bstat[m])) reg = sprintf("status %s -> %s", bstat[m], cstat)
        else if (cstat == "IMPORTERROR" && bstat[m] != "IMPORTERROR") reg = sprintf("status %s -> IMPORTERROR", bstat[m])
        if (reg != "") { printf "REGRESSION %s: %s\n", m, reg; nreg++ }
        else if (cfe < bfe[m] || (bstat[m] != "OK" && cstat == "OK")) {
            printf "improved   %s: %s/%d -> %s/%d\n", m, bstat[m], bfe[m], cstat, cfe; nimp++
        }
    }
    END {
        printf "cpython regression gate: %d regression(s), %d improvement(s)\n", nreg + 0, nimp + 0
        if (nreg > 0) exit 1
    }
' "$BASELINE" "$CURRENT"
