#!/bin/bash
# run_pydantic_slice.sh -- run one of pydantic's test modules under Grail with
# run_pydantic_tests.py, carrying on past a test that takes the process down
# (docs/Support_Pydantic.md, Phase 6).
#
#     tests/pydantic/run_pydantic_slice.sh <pydantic-sdist>/tests/test_main.py <out>
#
# A Smalltalk error that no Python ``except'' sees, or a Rust panic, ends the
# gem, and with it every test after the one that raised it.  So the run is
# restarted with --resume: the test that started and never reported is
# recorded as ``crashed'' with the last line the process printed, and the
# tests already reported are skipped.  <out> then holds one RESULT line per
# test, ready for compare_results.py.
#
# Needs pydantic and the abi3 pydantic_core on PYTHONPATH, e.g.
#     PYTHONPATH=<venv>/lib/python3.14/site-packages
set -u
TEST=$1
OUT=$2
HERE=$(cd "$(dirname "$0")" && pwd)
ROOT=$(cd "$HERE/../.." && pwd)
: > "$OUT"
for _ in $(seq 1 200); do
    "$ROOT/grail" "$HERE/run_pydantic_tests.py" "$TEST" --resume "$OUT" > "$OUT.part" 2>&1
    grep -a -E '^(START|RESULT|TOTAL)\|' "$OUT.part" | grep -v '^START|' >> "$OUT"
    grep -q -a '^TOTAL|' "$OUT.part" && break
    crashed=$(grep -a -E '^(START|RESULT)\|' "$OUT.part" | tail -1)
    case $crashed in
        START\|*) ;;
        *) echo "no test to blame; stopping" >&2; tail -5 "$OUT.part" >&2; break ;;
    esac
    why=$(grep -a -v -E '^(START|RESULT)\|' "$OUT.part" | grep -a -v '^\s*$' | tail -1 | tr '|' '/' | cut -c1-200)
    echo "RESULT|${crashed#START|}|crashed|$why" >> "$OUT"
    echo "crashed: ${crashed#START|}: $why" >&2
done
rm -f "$OUT.part"
grep -a '^RESULT|' "$OUT" | cut -d'|' -f3 | sort | uniq -c >&2
