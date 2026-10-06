#!/bin/bash
# Multi-gem test for stdlib ``durable'' (docs/Durable_Execution.md): durable
# execution on GemStone continuations.
#
# One workflow, order_flow, crosses SIX gems.  Gem 1 starts it and runs it to
# its sleep(), which commits a continuation and exits.  Gem 2 wakes it on the
# timer and runs it to recv(), which parks again.  Gem 3 send()s the approval.
# Gem 4 resumes it with the message and it finishes -- with the locals it
# computed in gem 1.  Then crashy_flow: gem 5 checkpoints and is kill -9ed
# inside the workflow; gem 6 sees the expired lease, resumes the committed
# continuation, and checkpoint() there returns True.  Finally generator_flow
# checkpoints with a live generator on its stack, which GemStone refuses, and
# the refusal must surface as a CheckpointError naming the Semaphore rather
# than as a gem death.
#
# Then loop_flow parks inside a loop body five times, and the park-shapes
# phase parks inside 21 Python constructs (tests/durable/park_shapes.py):
# each must come out right or be refused by durable with a reason.
#
# Each phase is one `grail` process (tests/durable/durable_phases.py), so a
# "gem" here is a real OS process with its own session.  Assumes a running
# stone and a sourced .setenv (mirrors run_gemdb_conflict_test.sh).
#
# Every gem runs under a watchdog (GRAIL_DURABLE_PHASE_TIMEOUT, default 120s),
# and the run stops at the first failing check.  Both exist because of one CI
# run (PR #1321, 2026-10-04): a gem died in a VM assertion while resuming
# order_flow, the later phases ran against the run it left half-done, and
# the executor phase then started crashy_flow fresh -- whose sleep(3600)
# held the job until GitHub cancelled it at 45 minutes.  A phase normally
# takes a second or two; 120s is a wide margin that still lets a gem which
# hits a UTL_GUARANTEE finish its 60s wait for a debugger, so the assertion
# and its stacks reach the log.
set -u
SCRIPT_DIR=$(cd "$(dirname "$0")" && pwd)
PROJECT_ROOT=$(cd "$SCRIPT_DIR/../.." && pwd)
if [ -f "$PROJECT_ROOT/.setenv" ]; then
    # shellcheck disable=SC1091
    source "$PROJECT_ROOT/.setenv"
fi
export GRAIL_DIR="$PROJECT_ROOT"
export PYTHONPATH="$PROJECT_ROOT/tests/durable${PYTHONPATH:+:$PYTHONPATH}"
cd "$PROJECT_ROOT" || exit 1
mkdir -p out
LOG=out/durable_test.out
: > "$LOG"
EXIT=0
PHASE_TIMEOUT=${GRAIL_DURABLE_PHASE_TIMEOUT:-120}

kill_gem() {    # kill_gem <pid of a ./grail wrapper> -- its topaz (the gem) too
    pkill -9 -P "$1" 2>/dev/null
    kill -9 "$1" 2>/dev/null
}
run_gem() {     # run_gem <out> <seconds> <phase> [args] -- one gem, killed if it overruns
    local out=$1 limit=$2 tenths=0
    shift 2
    ./grail tests/durable/durable_phases.py "$@" > "$out" 2>&1 &
    local pid=$!
    while kill -0 "$pid" 2>/dev/null; do
        if [ "$tenths" -ge $((limit * 10)) ]; then
            kill_gem "$pid"
            wait "$pid" 2>/dev/null
            echo "TIMEOUT: phase $1 still running after ${limit}s; killed" >> "$out"
            return 124
        fi
        sleep 0.1
        tenths=$((tenths + 1))
    done
    wait "$pid"
}
phase() {   # phase <name> [idle_timeout] -- one gem; its output goes to the log and the terminal
    local limit=${PHASE_LIMIT:-$PHASE_TIMEOUT} rc
    run_gem out/durable_phase.out "$limit" "$@"
    rc=$?
    grep -v '^\s*[~^]*$' out/durable_phase.out | tee -a "$LOG"
    if [ "$rc" -eq 124 ]; then
        echo "FAIL: phase $1 timed out after ${limit}s"
        EXIT=1
    fi
}
expect() {  # expect <literal> -- the log must contain it
    if ! grep -qF -- "$1" "$LOG"; then
        echo "FAIL: expected output containing: $1"
        EXIT=1
    fi
}
forbid() {
    if grep -qF -- "$1" "$LOG"; then
        echo "FAIL: output must not contain: $1"
        EXIT=1
    fi
}
finish() {
    PHASE_LIMIT=60 phase reset > /dev/null
    if [ "$EXIT" -eq 0 ]; then
        echo "durable: PASS (log: $LOG)"
    else
        echo "durable: FAIL (log: $LOG)"
    fi
    exit $EXIT
}
stop_if_failed() {  # every later phase builds on the state this one left
    if [ "$EXIT" -ne 0 ]; then
        echo "durable: stopping after $1 -- the later phases would only run against what it left behind"
        finish
    fi
}

phase reset
expect 'reset ok'
stop_if_failed reset

echo "--- order_flow across four gems"
phase start_order
expect 'order: executed=1 status=sleeping'
sleep 1.5
phase executor
expect "executor: executed=1 statuses=['waiting']"
phase approve
expect 'approve: sent to'
phase executor
expect "executor: executed=1 statuses=['done']"
phase order_result
expect "order result: {'order': 'o-1', 'total': 42, 'approved': {'ok': True}} (checkpoints=3 resumes=2)"
stop_if_failed order_flow

echo "--- crashy_flow: checkpoint, kill -9 the gem, recover in another"
./grail tests/durable/durable_phases.py start_crashy > out/durable_crashy.out 2>&1 &
CRASHY=$!
sleep 5
# The wrapper and its topaz are separate processes; the topaz is the gem.
# Only this wrapper's children: a pattern would also kill another
# checkout's durable test running on the same machine.
kill_gem "$CRASHY"
wait "$CRASHY" 2>/dev/null
cat out/durable_crashy.out | tee -a "$LOG"
expect 'crashy: started'
forbid 'crashy: UNEXPECTED return'
phase executor 8
expect 'executor: executed=1'
phase crashy_result
expect 'crashy result: 50 (resumes=1)'
stop_if_failed crashy_flow

echo "--- generator_flow: a live generator at the checkpoint is refused, not fatal"
phase generator
expect 'generator: failed CheckpointError: durable: cannot checkpoint here'
expect 'Semaphore'
stop_if_failed generator_flow

echo "--- loop_flow: park inside a loop body, five times"
phase loop
LOOP_WANT='loop: status=done result=10 resumes=5'
if [ "${GRAIL_IR_CODEGEN-}" = 0 ] && ! grep -qF -- "$LOOP_WANT" out/durable_phase.out \
        && grep -q '^loop: status=done ' out/durable_phase.out; then
    # The text codegen path: see the park-shapes phase below.
    echo "XFAIL: loop_flow on the text codegen path: $(grep '^loop: ' out/durable_phase.out)"
else
    expect "$LOOP_WANT"
fi
stop_if_failed loop_flow

phase show
expect 'A: reserve o-1 total=42'
expect 'C: woke; awaiting approval (total still 42)'
expect "D: approval={'ok': True}; shipping o-1"
expect 'crashy: after checkpoint recovered=True'
forbid 'crashy: hanging until killed'       # written in the killed gem, never committed
expect 'resumed (timer)'
expect 'resumed (message)'
expect 'resumed (recover)'
stop_if_failed show

echo "--- park shapes: a park inside each of 21 Python constructs"
# GemStone resumes a block made before the capture with a stale home context
# (Kermit 52132), so some shapes came back silently WRONG.  durable now
# refuses the ones it can recognise (_resume_hazard): on the IR codegen path
# every shape must be right or refused with a reason.  The text path compiles
# far more as blocks; there, which shapes come back wrong VARIES from run to
# run (measured: nested_loops and boolean_short_circuit each wrong in some
# runs and right in others), so a wrong result is XFAIL -- but every shape
# must still finish, and the refusals must still happen.
#
# raise_after_park used to be expected right on IR, and was flaky: its except
# handler, made before the park and run after it, lost its write (6, not 600)
# in 2 of 4 IR jobs of #1344's merge-queue run.  That expectation is gone
# (Kermit 52132): a try statement around a park is now refused, so the three
# try/except shapes are deterministic refusals on both paths.
phase shapes
REFUSED=' try_in_loop loop_in_try try_finally raise_after_park with_block with_in_loop closure_nonlocal closure_reads_outer '
if [ "${GRAIL_IR_CODEGEN-}" = 0 ]; then
    TEXT_PATH=1
else
    TEXT_PATH=
fi
SHAPES_SEEN=0
while read -r _ name verdict; do
    name=${name%:}
    SHAPES_SEEN=$((SHAPES_SEEN + 1))
    case "$REFUSED" in
        *" $name "*) want=refused ;;
        *) want=ok ;;
    esac
    if [ "$verdict" = "$want" ]; then
        continue
    fi
    if [ -n "$TEXT_PATH" ] && [ "$want" = ok ] && [[ "$verdict" == "WRONG status=done "* ]]; then
        echo "XFAIL: shape $name on the text codegen path: $verdict"
        continue
    fi
    echo "FAIL: shape $name: want $want, got $verdict"
    EXIT=1
done < <(grep '^shape ' out/durable_phase.out)
if [ "$SHAPES_SEEN" -ne 21 ]; then
    echo "FAIL: $SHAPES_SEEN shape results, want 21"
    EXIT=1
fi

finish
