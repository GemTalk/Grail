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

# Always source .setenv when it exists (same as run_tests.sh): it is this
# checkout's source of truth for which product + stone to use, so it must win
# over whatever the launching shell happened to export.  Sourcing it only when
# $GEMSTONE was unset let an inherited GEMSTONE silently take over -- e.g. a
# 3.7.5 product against this worktree's gs40 stone, with no topaz on $PATH at
# all (every module then scored CRASH).  CI has no .setenv and exports its env
# inline, so the -f guard leaves that path alone.
if [ -f "$PROJECT_ROOT/.setenv" ]; then
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

# Drop per-module outputs for modules the manifest no longer lists.
#
# WHY: these files outlive the manifest.  test_datetime was once split three
# ways and later consolidated, and test.test_datetime_datetime.out /
# _tz.out / _time.out / _pickle.out sat here for three weeks afterwards,
# reporting 33 and 24 failures for modules that no longer run.  Anything
# surveying the board by globbing out/cpython/*.out -- which is the obvious
# way to ask "what is worst right now?" -- reads them as current.  That cost a
# full diagnostic session chasing an OffsetError in a module whose live
# successor scores OK with 525 tests.
#
# Only .out/.rc/.sec are pruned; scoreboard.json is the manifest-driven
# summary and is rewritten wholesale below.
if [ -f "$MANIFEST" ]; then
    for _f in "$OUTDIR"/*.out; do
        [ -e "$_f" ] || continue
        _mod=$(basename "$_f" .out)
        if ! grep -qx -- "$_mod" "$MANIFEST"; then
            echo "pruning stale output for de-listed module: $_mod"
            rm -f "$OUTDIR/$_mod.out" "$OUTDIR/$_mod.rc" "$OUTDIR/$_mod.sec"
        fi
    done
fi
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

run_module() { # $1=mod -- run one module capped; record exit code + duration sidecars
    local mod="$1" log="$OUTDIR/$1.out" t0
    rm -f "$log" "$OUTDIR/$1.rc"
    export GRAIL_TEST_MODULE="$mod"
    t0=$(date +%s)
    run_capped topaz -lq -C "$TOPAZ_CFG" -S "$DRIVER" < /dev/null > "$log" 2>&1
    echo $? > "$OUTDIR/$1.rc"
    # Wall clock, for the NEXT run's launch order (see launch_order).  Written
    # last and never removed at start-up: a `.sec' is the one artifact here that
    # is deliberately read across runs, and a crashed/timed-out module's honest
    # 600s belongs in the schedule as much as a fast one's 1s.
    echo $(( $(date +%s) - t0 )) > "$OUTDIR/$1.sec"
}

# Module list: explicit args override the manifest.  A run so narrowed is a
# PARTIAL run, and must not rewrite the committed scoreboard: that file is built
# from the rows this run parsed, so naming two modules replaced all 71 rows with
# 2 and silently destroyed the baseline check_cpython_regressions.sh diffs
# against.  Partial runs still write the JSON and print their summary.
if [ "$#" -gt 0 ]; then
    MODULES="$*"
    PARTIAL=1
else
    MODULES=$(grep -vE '^[[:space:]]*(#|$)' "$MANIFEST")
    PARTIAL=0
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
# modules early so they run while the many light modules fill the other slots,
# instead of bunching at the end and starving each other.  PARSE order (phase 2)
# stays manifest order so the regenerated scoreboard is byte-deterministic.
#
# Weight is the module's MEASURED wall clock from the previous run (the `.sec'
# sidecars).  It used to be the committed scoreboard's TEST COUNT, which reads
# like a fair proxy and is not: test_enum runs 1077 tests in 25s while test_math
# runs 88 in 164s, so the count launched the suite's longest module twelfth and
# its shortest-per-test module first -- exactly backwards.
#
# Measured back-to-back at CONCURRENCY=4 on a 50-module manifest: 254s by test
# count, 227s by duration, then 206s on the next duration-ordered run -- ~19%
# once the weights settle.  The second-run gain is the point of feeding the
# schedule its own output: the first duration pass is weighted by timings taken
# under whatever load produced them, and each run re-measures under the load the
# schedule itself creates, so the weights converge on the conditions they are
# used in.  (Do not expect serial_total/CONCURRENCY.  Four modules sharing one
# stone inflate each other ~25%, and the makespan can never beat the single
# longest module -- 199s of the 206s here is test_math alone.  Splitting that
# module is worth more than any further scheduling work.)
#
# A module with no `.sec' yet (newly wired, or a fresh clone / CI runner with no
# cache) is estimated from its scoreboard test count at the suite-wide average
# of ~6 tests/second, so it still lands in roughly the right place; one with
# neither sorts last, as it did before.  Weights are centiseconds so the integer
# sort keeps some resolution among the sub-second modules.  Ties keep manifest
# order (field 2 = seq).
TESTS_PER_SEC=6
launch_order() {
    local mods durs sb
    mods="$(mktemp)"; durs="$(mktemp)"; sb="$(mktemp)"
    printf '%s\n' $MODULES > "$mods"
    for m in $MODULES; do
        [ -f "$OUTDIR/$m.sec" ] && printf '%s\t%s\n' "$m" "$(cat "$OUTDIR/$m.sec")"
    done > "$durs"
    # Copied, not passed by path: a MISSING scoreboard would make awk exit
    # before reading anything, discarding the `.sec' weights too and dropping
    # the whole order back to the manifest.  An empty stand-in keeps the
    # measured durations working on a board-less first run.
    [ -f "$SCOREBOARD_MD" ] && cat "$SCOREBOARD_MD" > "$sb"
    awk -v durfile="$durs" -v sbfile="$sb" -v tps="$TESTS_PER_SEC" '
        FILENAME == durfile { if ($2 ~ /^[0-9]+$/) sec[$1] = $2; next }
        FILENAME == sbfile {
            if ($0 !~ /^\| /) next
            line = $0; gsub(/^\| *| *\| *$/, "", line); split(line, f, / *\| */)
            if (f[3] ~ /^[0-9]+$/) cnt[f[1]] = f[3]
            next
        }
        { seq[++nm] = $1 }
        END {
            for (i = 1; i <= nm; i++) {
                m = seq[i]
                w = (m in sec) ? sec[m] * 100 : ((m in cnt) ? cnt[m] * 100 / tps : 0)
                printf "%d\t%d\t%s\n", w, i, m
            }
        }
    ' "$durs" "$sb" "$mods" 2>/dev/null | sort -k1,1rn -k2,2n | cut -f3
    rm -f "$mods" "$durs" "$sb"
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
    # Kept (not removed) -- next run's launch_order reads it.
    secs=$(cat "$OUTDIR/${mod}.sec" 2>/dev/null || echo 0)

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
    printf '    {"module": "%s", "status": "%s", "tests": %s, "failures": %s, "errors": %s, "skipped": %s, "seconds": %s, "exit_code": %s, "detail": "%s"}' \
        "$mod" "$status" "$tests" "$failures" "$errors" "$skipped" "$secs" "$rc" "$(json_escape "$detail")" >> "$ROWS_JSON"
done

GENERATED=$(date -u +%Y-%m-%dT%H:%M:%SZ)
SUMMARY="OK $n_OK · FAIL $n_FAIL · ERROR $n_ERROR · SKIP $n_SKIP · IMPORTERROR $n_IMPORTERROR · STERROR $n_STERROR · CRASH $n_CRASH · TIMEOUT $n_TIMEOUT"

{
    echo "# CPython 3.14.4 Regression Suite Scoreboard — Grail"
    echo
    echo "Status legend: OK (all pass) · FAIL (assertion failures) · ERROR (exceptions in tests) · SKIP (all skipped / none discovered) · IMPORTERROR (module/support import failed) · STERROR (uncatchable Smalltalk error escaped) · CRASH (topaz died, e.g. SIGSEGV) · TIMEOUT."
    echo
    echo "This is a measurement harness over a curated starter set, not the full"
    echo "~480-module suite. See scripts/cpython_suite_manifest.txt and"
    echo "scripts/run_cpython_suite.sh. Per-module logs: out/cpython/<module>.out."
    echo
    echo "Run timestamp and aggregate totals are intentionally NOT committed here:"
    echo "they change on every run and would collide across concurrent sessions"
    echo "even when the sessions edit different modules.  Find them in"
    echo "out/cpython/scoreboard.json (gitignored) or this script's stdout summary."
    echo "Only the per-test rows below are committed, so unrelated work touches"
    echo "different rows and merges cleanly."
    echo
    echo "| Module | Status | tests | fail | err | skip | detail |"
    echo "|--------|--------|------:|-----:|----:|-----:|--------|"
    cat "$ROWS_MD"
} > "$SCOREBOARD_MD.new"

if [ "$PARTIAL" -eq 1 ]; then
    rm -f "$SCOREBOARD_MD.new"
else
    mv "$SCOREBOARD_MD.new" "$SCOREBOARD_MD"
fi

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
if [ "$PARTIAL" -eq 1 ]; then
    echo "Scoreboard: NOT rewritten (partial run of $n_modules module(s); the committed board is the full-manifest baseline)"
else
    echo "Scoreboard: $SCOREBOARD_MD"
fi
echo "JSON:       $SCOREBOARD_JSON"
echo "$SUMMARY"
printf 'TIMING | cpython-suite (%s mods, x%s) | %ds\n' "$n_modules" "$CONCURRENCY" "$((SECONDS - SUITE_T0))"
exit 0
