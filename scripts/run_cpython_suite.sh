#!/bin/bash

# Run the curated set of vendored CPython regression-test modules (see
# scripts/cpython_suite_manifest.txt) against Grail, one topaz session
# per module for crash + timeout isolation, and write a scoreboard.
#
# This is a CONFORMANCE MEASUREMENT harness, not a pass/fail gate: it
# always exits 0 (unless the environment is unusable) and records where
# Grail stands per module.  See docs/CPython_Suite_Scoreboard.md.
#
# Usage:
#   ./scripts/run_cpython_suite.sh                # run the whole manifest
#   ./scripts/run_cpython_suite.sh test.test_math # run just these modules
#   GRAIL_TEST_TIMEOUT=120 ./scripts/run_cpython_suite.sh
#
# Assumes a stone is already running per .topazini (like run_tests.sh).

PROJECT_ROOT=$(cd "$(dirname "$0")/.." && pwd)

# Auto-source .setenv when $GEMSTONE isn't set (same as run_tests.sh).
if [ -z "$GEMSTONE" ] && [ -f "$PROJECT_ROOT/.setenv" ]; then
    # shellcheck disable=SC1091
    source "$PROJECT_ROOT/.setenv"
fi
if [ -z "$GEMSTONE" ]; then
    echo "Error: \$GEMSTONE is not set. 'source .setenv' first." >&2
    exit 1
fi

export GRAIL_DIR="$PROJECT_ROOT"

# Same sizing as run_tests.sh: the import surface of some test modules is
# large, and GC starvation in a too-small temp-object cache looks like
# spurious failures.  Per-module isolation means only intra-module working
# set matters, so this is comfortable.
# GEM_MAX_SMALLTALK_STACK_DEPTH: CPython's default recursion limit is
# 1000 PYTHON frames; each Grail Python call spans many Smalltalk frames
# (wrapper + closure + dispatch), so the default gem depth overflows on
# tests that are fine under CPython (test_functools' fib(100)).
TOPAZ_CFG="GEM_TEMPOBJ_CODE_SIZE=300000;GEM_TEMPOBJ_CACHE_SIZE=500000;GEM_MAX_SMALLTALK_STACK_DEPTH=80000;"

# Per-module wall-clock cap, enforced by a portable poll-and-kill watchdog
# (no coreutils `timeout` dependency -- `topaz -l` is a linked gem, so
# killing the topaz pid kills its gem).  A module that exceeds this is
# classified TIMEOUT.
PER_MODULE_TIMEOUT="${GRAIL_TEST_TIMEOUT:-300}"

# Run "$@" with a PER_MODULE_TIMEOUT-second cap; return 124 if it had to be
# killed, else the process's own exit status.  Caller redirects stdout.
run_capped() {
    "$@" &
    local pid=$! waited=0
    while kill -0 "$pid" 2>/dev/null; do
        sleep 2
        waited=$((waited + 2))
        if [ "$waited" -ge "$PER_MODULE_TIMEOUT" ]; then
            kill -9 "$pid" 2>/dev/null
            wait "$pid" 2>/dev/null
            return 124
        fi
    done
    wait "$pid"
    return $?
}

OUTDIR="$PROJECT_ROOT/out/cpython"
mkdir -p "$OUTDIR"
MANIFEST="$PROJECT_ROOT/scripts/cpython_suite_manifest.txt"
DRIVER="$PROJECT_ROOT/scripts/run_one_cpython_module.gs"
SCOREBOARD_MD="$PROJECT_ROOT/docs/CPython_Suite_Scoreboard.md"
SCOREBOARD_JSON="$OUTDIR/scoreboard.json"

# Module list: explicit args override the manifest.
if [ "$#" -gt 0 ]; then
    MODULES="$*"
else
    MODULES=$(grep -vE '^[[:space:]]*(#|$)' "$MANIFEST")
fi

# Status buckets + totals (bash 3.2: plain vars, no associative arrays).
n_OK=0; n_FAIL=0; n_ERROR=0; n_SKIP=0
n_IMPORTERROR=0; n_STERROR=0; n_CRASH=0; n_TIMEOUT=0
tot_tests=0; tot_failures=0; tot_errors=0; tot_skipped=0
n_modules=0

ROWS_MD="$(mktemp)"
ROWS_JSON="$(mktemp)"
first_json=1

field() { # $1=line $2=key
    echo "$1" | sed -n "s/.*|$2=\([^|]*\).*/\1/p"
}

json_escape() { # minimal: backslash and double-quote
    printf '%s' "$1" | sed -e 's/\\/\\\\/g' -e 's/"/\\"/g'
}

echo "Running CPython suite against Grail (timeout=${PER_MODULE_TIMEOUT}s per module)"
echo

for mod in $MODULES; do
    n_modules=$((n_modules + 1))
    log="$OUTDIR/${mod}.out"
    rm -f "$log"    # `output pushnew` never rewrites; and our redirect needs a clean file

    export GRAIL_TEST_MODULE="$mod"
    run_capped topaz -lq -C "$TOPAZ_CFG" -S "$DRIVER" < /dev/null > "$log" 2>&1
    rc=$?

    line=$(grep -m1 '^GRAIL_RESULT|' "$log")

    if [ "$rc" -eq 124 ] && [ -z "$line" ]; then
        status="TIMEOUT"; tests=0; failures=0; errors=0; skipped=0
        detail="killed after ${PER_MODULE_TIMEOUT}s"
    elif [ -z "$line" ]; then
        status="CRASH"; tests=0; failures=0; errors=0; skipped=0
        detail="topaz exit ${rc}, no result line (see out/cpython/${mod}.out)"
    else
        status=$(field "$line" status)
        tests=$(field "$line" tests)
        failures=$(field "$line" failures)
        errors=$(field "$line" errors)
        skipped=$(field "$line" skipped)
        detail=$(echo "$line" | sed -n 's/.*|detail=\(.*\)$/\1/p')
    fi
    : "${tests:=0}" "${failures:=0}" "${errors:=0}" "${skipped:=0}"

    case "$status" in
        OK)          n_OK=$((n_OK+1)) ;;
        FAIL)        n_FAIL=$((n_FAIL+1)) ;;
        ERROR)       n_ERROR=$((n_ERROR+1)) ;;
        SKIP)        n_SKIP=$((n_SKIP+1)) ;;
        IMPORTERROR) n_IMPORTERROR=$((n_IMPORTERROR+1)) ;;
        STERROR)     n_STERROR=$((n_STERROR+1)) ;;
        TIMEOUT)     n_TIMEOUT=$((n_TIMEOUT+1)) ;;
        *)           status="CRASH"; n_CRASH=$((n_CRASH+1)) ;;
    esac

    tot_tests=$((tot_tests + tests))
    tot_failures=$((tot_failures + failures))
    tot_errors=$((tot_errors + errors))
    tot_skipped=$((tot_skipped + skipped))

    printf '  %-11s %s (t=%s f=%s e=%s s=%s)\n' "$status" "$mod" "$tests" "$failures" "$errors" "$skipped"

    printf '| %s | %s | %s | %s | %s | %s | %s |\n' \
        "$mod" "$status" "$tests" "$failures" "$errors" "$skipped" "$detail" >> "$ROWS_MD"

    [ "$first_json" -eq 0 ] && printf ',\n' >> "$ROWS_JSON"
    first_json=0
    printf '    {"module": "%s", "status": "%s", "tests": %s, "failures": %s, "errors": %s, "skipped": %s, "exit_code": %s, "detail": "%s"}' \
        "$mod" "$status" "$tests" "$failures" "$errors" "$skipped" "$rc" "$(json_escape "$detail")" >> "$ROWS_JSON"
done

GENERATED=$(date -u +%Y-%m-%dT%H:%M:%SZ)
SUMMARY="OK $n_OK · FAIL $n_FAIL · ERROR $n_ERROR · SKIP $n_SKIP · IMPORTERROR $n_IMPORTERROR · STERROR $n_STERROR · CRASH $n_CRASH · TIMEOUT $n_TIMEOUT"

{
    echo "# CPython 3.14.4 Regression Suite Scoreboard — Grail"
    echo
    echo "Generated: ${GENERATED}  ·  GemStone: ${GEMSTONE##*/}"
    echo
    echo "**Modules: ${n_modules}** — ${SUMMARY}"
    echo
    echo "**Totals:** tests=${tot_tests} failures=${tot_failures} errors=${tot_errors} skipped=${tot_skipped}"
    echo
    echo "Status legend: OK (all pass) · FAIL (assertion failures) · ERROR (exceptions in tests) · SKIP (all skipped / none discovered) · IMPORTERROR (module/support import failed) · STERROR (uncatchable Smalltalk error escaped) · CRASH (topaz died, e.g. SIGSEGV) · TIMEOUT."
    echo
    echo "This is a measurement harness over a curated starter set, not the full"
    echo "~480-module suite. See scripts/cpython_suite_manifest.txt and"
    echo "scripts/run_cpython_suite.sh. Per-module logs: out/cpython/<module>.out."
    echo
    echo "| Module | Status | tests | fail | err | skip | detail |"
    echo "|--------|--------|------:|-----:|----:|-----:|--------|"
    cat "$ROWS_MD"
} > "$SCOREBOARD_MD"

{
    echo "{"
    echo "  \"generated\": \"${GENERATED}\","
    echo "  \"gemstone\": \"${GEMSTONE##*/}\","
    echo "  \"totals\": {\"modules\": ${n_modules}, \"tests\": ${tot_tests}, \"failures\": ${tot_failures}, \"errors\": ${tot_errors}, \"skipped\": ${tot_skipped}},"
    echo "  \"status_counts\": {\"OK\": ${n_OK}, \"FAIL\": ${n_FAIL}, \"ERROR\": ${n_ERROR}, \"SKIP\": ${n_SKIP}, \"IMPORTERROR\": ${n_IMPORTERROR}, \"STERROR\": ${n_STERROR}, \"CRASH\": ${n_CRASH}, \"TIMEOUT\": ${n_TIMEOUT}},"
    echo "  \"modules\": ["
    cat "$ROWS_JSON"
    echo
    echo "  ]"
    echo "}"
} > "$SCOREBOARD_JSON"

rm -f "$ROWS_MD" "$ROWS_JSON"

echo
echo "Scoreboard: $SCOREBOARD_MD"
echo "JSON:       $SCOREBOARD_JSON"
echo "$SUMMARY"
exit 0
