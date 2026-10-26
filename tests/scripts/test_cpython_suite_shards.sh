#!/bin/bash

# Self-test for the two stone-free modes of scripts/run_cpython_suite.sh that
# let the nightly run the suite as several CI jobs:
#
#   --plan-shards N   split the manifest into N lines of modules
#   --report-only     score the out/cpython outputs the shards left behind
#
# A plan that drops a module, or runs one twice, would not fail anything on its
# own: the board would just be built from whatever ran.  So the rules checked
# here are the ones that keep the sharded board equal to an unsharded one --
# every manifest module in exactly one shard, a module with no output scored as
# a failure rather than left off the board, and rows in manifest order.  Runs
# with $GEMSTONE unset, as the plan and gate jobs do.
#
# Usage: tests/scripts/test_cpython_suite_shards.sh

set -uo pipefail

ROOT=$(cd "$(dirname "$0")/../.." && pwd)
SUITE="$ROOT/scripts/run_cpython_suite.sh"
TMP=$(mktemp -d)
trap 'rm -rf "$TMP"' EXIT

pass=0
fail=0

ok()  { pass=$((pass + 1)); }
bad() { echo "FAIL $*"; fail=$((fail + 1)); }

grep -vE '^[[:space:]]*(#|$)' "$ROOT/scripts/cpython_suite_manifest.txt" > "$TMP/manifest"
n_manifest=$(wc -l < "$TMP/manifest" | tr -d ' ')

suite() { # run the suite script against $TMP/out, never the real board
    env -u GEMSTONE GRAIL_CPYTHON_OUTDIR="$TMP/out" \
        GRAIL_CPYTHON_SCOREBOARD="$TMP/board.md" "$SUITE" "$@"
}

# --- --plan-shards --------------------------------------------------------

mkdir -p "$TMP/out"
# A measured duration for two modules; the rest are estimated from the
# committed board, as on a runner with no duration cache.
echo 900 > "$TMP/out/$(sed -n 1p "$TMP/manifest").sec"
echo 800 > "$TMP/out/$(sed -n 2p "$TMP/manifest").sec"
cp "$ROOT/docs/CPython_Suite_Scoreboard.md" "$TMP/board.md"

for n in 1 4 7; do
    if ! suite --plan-shards "$n" > "$TMP/plan$n" 2> "$TMP/plan$n.err"; then
        bad "--plan-shards $n exited nonzero: $(cat "$TMP/plan$n.err")"
        continue
    fi
    lines=$(wc -l < "$TMP/plan$n" | tr -d ' ')
    [ "$lines" = "$n" ] && ok || bad "--plan-shards $n printed $lines lines"
    tr ' ' '\n' < "$TMP/plan$n" | grep -v '^$' | sort > "$TMP/planned$n"
    if sort "$TMP/manifest" | cmp -s - "$TMP/planned$n"; then ok
    else bad "--plan-shards $n does not hold every manifest module exactly once"; fi
done

# The two heaviest modules go to different shards.
first=$(sed -n 1p "$TMP/manifest"); second=$(sed -n 2p "$TMP/manifest")
if grep -qw -- "$first" "$TMP/plan4" && ! grep -w -- "$first" "$TMP/plan4" | grep -qw -- "$second"; then ok
else bad "the two heaviest modules share a shard"; fi

# Planned once per run, so the same weights must give the same plan.
suite --plan-shards 4 > "$TMP/plan4b" 2>/dev/null
cmp -s "$TMP/plan4" "$TMP/plan4b" && ok || bad "--plan-shards 4 is not deterministic"

suite --plan-shards 0 > /dev/null 2>&1 && bad "--plan-shards 0 was accepted" || ok

# --- --report-only --------------------------------------------------------

rm -rf "$TMP/out"; mkdir -p "$TMP/out"
timed_out=$(sed -n 3p "$TMP/manifest")
crashed=$(sed -n 4p "$TMP/manifest")
lost=$(sed -n 5p "$TMP/manifest")
while read -r m; do
    case "$m" in
        "$lost") continue ;;   # its shard never reported: no files at all
        "$timed_out") echo partial > "$TMP/out/$m.out"; echo 124 > "$TMP/out/$m.rc" ;;
        "$crashed") echo partial > "$TMP/out/$m.out"; echo 139 > "$TMP/out/$m.rc" ;;
        *) echo "GRAIL_RESULT|module=$m|status=OK|tests=3|failures=0|errors=0|skipped=1|detail=" > "$TMP/out/$m.out"
           echo 0 > "$TMP/out/$m.rc" ;;
    esac
    echo 1 > "$TMP/out/$m.sec"
done < "$TMP/manifest"

if suite --report-only > "$TMP/report.log" 2>&1; then ok
else bad "--report-only exited nonzero: $(tail -3 "$TMP/report.log")"; fi

grep -E '^\| test\.' "$TMP/board.md" | sed 's/^| \([^ ]*\) .*/\1/' > "$TMP/rows"
cmp -s "$TMP/manifest" "$TMP/rows" && ok || bad "board rows are not the manifest, in manifest order"

row() { grep -F "| $1 |" "$TMP/board.md"; }
row "$timed_out" | grep -q '| TIMEOUT |' && ok || bad "rc 124 with no result line is not TIMEOUT: $(row "$timed_out")"
row "$crashed" | grep -q '| CRASH |.*topaz exit 139' && ok || bad "rc 139 with no result line is not CRASH: $(row "$crashed")"
row "$lost" | grep -q '| CRASH |.*did not run' && ok || bad "a module with no output is not CRASH: $(row "$lost")"
n_ok=$(grep -c '| OK | 3 | 0 | 0 | 1 |' "$TMP/board.md")
[ "$n_ok" = $((n_manifest - 3)) ] && ok || bad "$n_ok OK rows, expected $((n_manifest - 3))"

# The .rc files are inputs here and must survive a report, so that a second
# report (or the shard's own parse before it) reads the same verdicts.
[ -f "$TMP/out/$timed_out.rc" ] && ok || bad "--report-only removed a .rc"

echo "cpython-suite shards self-test: $pass passed, $fail failed"
[ "$fail" -eq 0 ] || exit 1
