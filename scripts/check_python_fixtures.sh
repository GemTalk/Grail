#!/bin/bash

# Run every SELF-RUNNING fixture in tests/python/ under CPython and fail if any
# check disagrees with it.
#
# WHY: these fixtures encode "what CPython does" and are then used as the
# expectation for Grail.  A fixture written from a Grail session rather than
# measured against CPython pins Grail's CURRENT behaviour -- bug and all -- and
# then reads as conformance evidence forever after.  That has happened four
# times so far (exec_class_definition.py, exception_naming.py, code_filename.py,
# and a near-miss in handler_raise.py); code_filename.py asserted
# ``FrameSummary._line'', a slot CPython has never had.  Under CPython that
# check RAISES, so one run would have caught it.
#
# WHAT IS AND IS NOT COVERED -- read this before trusting a green run.  Only
# fixtures with a TOP-LEVEL ``if __name__ == '__main__':'' block are run: 15 of
# the 258 files in tests/python.  The other 243 are driven from Smalltalk and
# most cannot run here at all -- they exercise Grail-specific behaviour, return
# values for the harness to compare rather than booleans, or are deliberately
# unimportable.  So this gate does NOT prove the corpus agrees with CPython; it
# holds the line for fixtures that have opted in, and makes opting in the cheap
# default for new ones.  Three of the four bugs above were in files that are NOT
# self-running and this gate would not have caught them -- converting more
# fixtures is what widens the net, not tightening this script.
#
# OPTING IN: end the fixture with a top-level ``__main__'' block that prints one
# line per check.  Two conventions are recognised, both already in the tree:
#
#     print('%-4s %s' % ('OK' if fn() is True else 'FAIL', fn.__name__))
#     print('%-12s %s %s' % (label, 'OK ' if actual == expected else 'DIFF', actual))
#
# The status word is taken from the first or second whitespace-separated field,
# so prose and separator lines are ignored -- deliberately, because
# live_frames.py prints a separator containing the word "FAIL" and a grep-based
# gate would trip over it.
#
# A check that documents a GRAIL limitation (CPython is expected to disagree)
# prints XFAIL instead; see the ``grail_only'' list in live_frames.py.  XPASS --
# such a check passing under CPython -- is a FAILURE here, because it means the
# difference the check documents no longer exists and the check is stale.
#
# Needs CPython 3.11+ (exception groups); ground truth for the tree is 3.14.
#
# Usage: scripts/check_python_fixtures.sh [-v]

set -uo pipefail

ROOT=$(cd "$(dirname "$0")/.." && pwd)
# Overridable so the gate itself can be tested against a synthetic fixture dir
# -- see tests/scripts/test_python_fixture_gate.sh.
FIXTURES=${GRAIL_FIXTURE_DIR:-$ROOT/tests/python}
VERBOSE=${1:-}

PY=${PYTHON:-python3}
if ! command -v "$PY" >/dev/null 2>&1; then
    echo "check_python_fixtures: no '$PY' on PATH" >&2
    exit 2
fi

# 3.11 is the floor: exception_groups.py needs ExceptionGroup.
if ! "$PY" -c 'import sys; sys.exit(0 if sys.version_info >= (3, 11) else 1)'; then
    echo "check_python_fixtures: $PY is $("$PY" -V 2>&1), need 3.11+" >&2
    exit 2
fi

# Self-running == a __main__ block at column 0.  module_higher_arity_def.py has
# the same string INSIDE a function (it checks that the idiom is False on
# import) and must not be run as a script: its checks assert
# __name__ == 'module_higher_arity_def', which running it would falsify.
#
# Built with a read loop rather than `mapfile' so this runs on the bash 3.2 that
# macOS still ships, not just the bash 5 on the CI runner.
FILES=()
while IFS= read -r f; do
    FILES+=("$f")
done < <(grep -l "^if __name__ == '__main__':" "$FIXTURES"/*.py | sort)

if [ ${#FILES[@]} -eq 0 ]; then
    echo "check_python_fixtures: no self-running fixtures found in $FIXTURES" >&2
    exit 2
fi

failed=0
total_ok=0
total_x=0

for file in "${FILES[@]}"; do
    rel=${file#"$ROOT"/}
    out=$(cd "$FIXTURES" && "$PY" "$file" 2>&1)
    rc=$?

    if [ $rc -ne 0 ]; then
        echo "FAIL $rel -- exited $rc"
        echo "$out" | sed 's/^/       /' | tail -15
        failed=$((failed + 1))
        continue
    fi

    # Classify each line by its status word, taken from field 1 or field 2.
    counts=$(echo "$out" | awk '
        function isstat(w) {
            return w == "OK" || w == "FAIL" || w == "DIFF" || w == "XFAIL" || w == "XPASS"
        }
        { s = "" }
        isstat($1) { s = $1; n = $2 }
        s == "" && isstat($2) { s = $2; n = $1 }
        s != "" { c[s]++; if (s != "OK" && s != "XFAIL") bad = bad " " n }
        END {
            printf "%d %d %d %d %d%s\n", c["OK"], c["FAIL"], c["DIFF"], \
                c["XFAIL"], c["XPASS"], bad
        }')

    read -r ok bad diff xfail xpass rest <<<"$counts"
    results=$((ok + bad + diff + xfail + xpass))

    # A fixture that prints nothing recognisable is broken, not passing -- the
    # failure mode this catches is a __main__ block that stops printing.
    if [ "$results" -eq 0 ]; then
        echo "FAIL $rel -- ran cleanly but printed no check results"
        failed=$((failed + 1))
        continue
    fi

    if [ "$bad" -gt 0 ] || [ "$diff" -gt 0 ] || [ "$xpass" -gt 0 ]; then
        echo "FAIL $rel -- $bad FAIL, $diff DIFF, $xpass XPASS of $results"
        for name in $rest; do echo "       $name"; done
        failed=$((failed + 1))
        continue
    fi

    total_ok=$((total_ok + ok))
    total_x=$((total_x + xfail))
    if [ -n "$VERBOSE" ]; then
        if [ "$xfail" -gt 0 ]; then
            echo "ok   $rel -- $ok OK, $xfail XFAIL"
        else
            echo "ok   $rel -- $ok OK"
        fi
    fi
done

echo
echo "checked ${#FILES[@]} self-running fixtures under $("$PY" -V 2>&1): $total_ok OK, $total_x XFAIL"

if [ $failed -gt 0 ]; then
    echo "$failed fixture(s) disagree with CPython -- the FIXTURE is wrong unless"
    echo "the check documents a Grail limitation, which belongs in a grail_only"
    echo "list printing XFAIL.  See the header of $0."
    exit 1
fi

echo "all self-running fixtures agree with CPython"
exit 0
