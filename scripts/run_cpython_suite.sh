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
# classified TIMEOUT.  Default 600 (not 300): with CONCURRENCY modules sharing
# the host, a heavy module (test_enum, 1000+ tests) can run 2-3x its solo time,
# and a false TIMEOUT from contention would be a spurious CI regression.  A
# genuine hang still fails the gate, just after 600s.
PER_MODULE_TIMEOUT="${GRAIL_TEST_TIMEOUT:-600}"

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

# Concurrency: run N modules at once, each in its own isolated topaz + watchdog
# (the per-module isolation this harness already relies on makes it embarrassingly
# parallel).  4 matches a public GitHub Linux runner's core count and
# run_tests.sh's shard count; 4 x 500MB tempobj cache = the same ~2GB footprint
# that gate already runs.  Override with GRAIL_CPYTHON_WORKERS=1 for the old
# serial behavior.  Modules are LAUNCHED in parallel but PARSED serially in
# manifest order afterward, so the scoreboard stays byte-deterministic.
CONCURRENCY="${GRAIL_CPYTHON_WORKERS:-4}"
SUITE_T0=$SECONDS

run_module() { # $1=mod -- run one module capped; record exit code to a sidecar
    local mod="$1" log="$OUTDIR/$1.out"
    rm -f "$log" "$OUTDIR/$1.rc"
    export GRAIL_TEST_MODULE="$mod"
    run_capped topaz -lq -C "$TOPAZ_CFG" -S "$DRIVER" < /dev/null > "$log" 2>&1
    echo $? > "$OUTDIR/$1.rc"
}

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

# Launch heaviest-first (longest-processing-time scheduling): start the big
# modules (test_enum, test_set) early so they run while the many light modules
# fill the other slots, instead of bunching at the end and starving each other.
# Weight = test count from the committed scoreboard (a good duration proxy);
# modules absent there sort last (weight 0) via a stable sort, which is fine --
# they are new/small.  PARSE order (phase 2) stays manifest order so the
# regenerated scoreboard is byte-deterministic.  A missing/garbled scoreboard
# just yields all-zero weights -> manifest launch order (safe fallback).
launch_order() {
    # Join the manifest module list against the committed scoreboard's test
    # counts, emit heaviest-first; ties keep manifest order (field 2 = seq).
    printf '%s\n' $MODULES | awk '
        FNR==NR { seq[++nm]=$1; wt[$1]=0; next }
        /^\| / {
            line=$0; gsub(/^\| *| *\| *$/, "", line); split(line, f, / *\| */)
            if (f[1] in wt && f[3] ~ /^[0-9]+$/) wt[f[1]]=f[3]
        }
        END { for (i=1; i<=nm; i++) print wt[seq[i]] "\t" i "\t" seq[i] }
    ' - "$SCOREBOARD_MD" 2>/dev/null | sort -k1,1rn -k2,2n | cut -f3
}
LAUNCH_MODULES=$(launch_order)
[ -z "$LAUNCH_MODULES" ] && LAUNCH_MODULES="$MODULES"   # fallback: manifest order

# Phase 1 -- launch modules with bounded concurrency.  Track PIDs and count the
# live ones with `kill -0` (portable to bash 3.2, which lacks `wait -n`; and
# unlike `jobs` in a $(...) subshell it sees the real job set).
echo "Launching (${CONCURRENCY} concurrent, heaviest-first)..."
launch_pids=()
for mod in $LAUNCH_MODULES; do
    while :; do
        live=0
        for p in "${launch_pids[@]}"; do kill -0 "$p" 2>/dev/null && live=$((live + 1)); done
        [ "$live" -lt "$CONCURRENCY" ] && break
        sleep 1
    done
    run_module "$mod" &
    launch_pids+=("$!")
done
wait

# Phase 2 -- parse results serially, in manifest order (deterministic scoreboard).
for mod in $MODULES; do
    n_modules=$((n_modules + 1))
    log="$OUTDIR/${mod}.out"
    rc=$(cat "$OUTDIR/${mod}.rc" 2>/dev/null || echo 1)
    rm -f "$OUTDIR/${mod}.rc"

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
printf 'TIMING | cpython-suite (%s mods, x%s) | %ds\n' "$n_modules" "$CONCURRENCY" "$((SECONDS - SUITE_T0))"
exit 0
