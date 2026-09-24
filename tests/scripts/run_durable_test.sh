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
# Each phase is one `grail` process (tests/durable/durable_phases.py), so a
# "gem" here is a real OS process with its own session.  Assumes a running
# stone and a sourced .setenv (mirrors run_gemdb_conflict_test.sh).
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

phase() {   # phase <name> [idle_timeout] -- one gem; its output goes to the log and the terminal
    ./grail tests/durable/durable_phases.py "$@" 2>&1 | grep -v '^\s*[~^]*$' | tee -a "$LOG"
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

phase reset
expect 'reset ok'

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

echo "--- crashy_flow: checkpoint, kill -9 the gem, recover in another"
./grail tests/durable/durable_phases.py start_crashy > out/durable_crashy.out 2>&1 &
CRASHY=$!
sleep 5
# The wrapper and its topaz are separate processes; the topaz is the gem.
pkill -9 -f 'durable_phases.py start_crashy' 2>/dev/null
kill -9 "$CRASHY" 2>/dev/null
wait "$CRASHY" 2>/dev/null
cat out/durable_crashy.out | tee -a "$LOG"
expect 'crashy: started'
forbid 'crashy: UNEXPECTED return'
phase executor 8
expect 'executor: executed=1'
phase crashy_result
expect 'crashy result: 50 (resumes=1)'

echo "--- generator_flow: a live generator at the checkpoint is refused, not fatal"
phase generator
expect 'generator: failed CheckpointError: durable: cannot checkpoint here'
expect 'Semaphore'

phase show
expect 'A: reserve o-1 total=42'
expect 'C: woke; awaiting approval (total still 42)'
expect "D: approval={'ok': True}; shipping o-1"
expect 'crashy: after checkpoint recovered=True'
forbid 'crashy: hanging until killed'       # written in the killed gem, never committed
expect 'resumed (timer)'
expect 'resumed (message)'
expect 'resumed (recover)'

phase reset > /dev/null
if [ "$EXIT" -eq 0 ]; then
    echo "durable: PASS (log: $LOG)"
else
    echo "durable: FAIL (log: $LOG)"
fi
exit $EXIT
