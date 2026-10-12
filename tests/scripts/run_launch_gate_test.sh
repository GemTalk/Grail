#!/bin/bash
# Behavioural test for scripts/launch_gate.sh, the machine-wide hold on test
# launches that run_tests.sh and run_cpython_suite.sh pass before each gem.
#
# WHAT IT GUARDS.  The gate trades wall-clock for fewer contention TIMEOUTs,
# and each way it can go wrong is quiet: a gate that never holds looks exactly
# like today's behaviour, one that holds a solo run against its own load
# slows every suite for nothing, one with no cap can stall a run forever on a
# process outside Grail, and one that is on under CI slows runners nobody
# shares.  So every rule is exercised here: off by 0, off under CI unless
# asked, the default limits and their floors, holding on load and on gem count,
# release, the cap, the spacing (and its absence for a run alone), the log
# lines and the summary.
#
# Needs no stone: the load average and the gem count are read from files the
# test controls, by redefining the gate's two readers after sourcing it.
set -u
ROOT=$(cd "$(dirname "$0")/../.." && pwd)
SCRATCH=$(mktemp -d "${TMPDIR:-/tmp}/grail-launch-gate-test.XXXXXX")
trap 'rm -rf "$SCRATCH"' EXIT
FAILED=0
ok()  { echo "  ok   - $1"; }
bad() { echo "  FAIL - $1"; FAILED=1; }
check() { if eval "$2"; then ok "$1"; else bad "$1"; fi; }

# shellcheck source=../../scripts/launch_gate.sh
. "$ROOT/scripts/launch_gate.sh"

# --- 0. the real readers answer something usable on this platform ----------
REAL_LOAD=$(_launch_gate_load)
REAL_GEMS=$(_launch_gate_gems)
check "the real load reader answers a number ($REAL_LOAD)" \
  'awk -v l="$REAL_LOAD" "BEGIN { exit !(l ~ /^[0-9]+([.][0-9]+)?\$/) }"'
check "the real gem counter answers an integer ($REAL_GEMS)" \
  '[[ "$REAL_GEMS" =~ ^[0-9]+$ ]]'

# From here on, the machine is whatever these files say.
echo 1.00 > "$SCRATCH/load"
echo 0 > "$SCRATCH/gems"
echo 18 > "$SCRATCH/cpus"
_launch_gate_load() { cat "$SCRATCH/load"; }
_launch_gate_gems() { cat "$SCRATCH/gems"; }
_launch_gate_cpus() { cat "$SCRATCH/cpus"; }
unset GRAIL_MAX_LOAD GRAIL_MAX_TEST_GEMS CI
export GRAIL_LAUNCH_POLL=1

# --- 1. off: GRAIL_MAX_LOAD=0, and CI unless asked --------------------------
echo 99 > "$SCRATCH/load"; echo 99 > "$SCRATCH/gems"
OUT=$(GRAIL_MAX_LOAD=0 bash -c ". '$ROOT/scripts/launch_gate.sh'; launch_gate_init 8")
check "GRAIL_MAX_LOAD=0 reports the gate off" '[ "$OUT" = "load gate: off" ]'
GRAIL_MAX_LOAD=0 launch_gate_init 8 > /dev/null
T0=$SECONDS; OUT=$(launch_gate "shard 0" 0)
check "a disabled gate never holds, however busy the machine" \
  '[ -z "$OUT" ] && [ $((SECONDS - T0)) -lt 1 ]'
OUT=$(CI=true bash -c ". '$ROOT/scripts/launch_gate.sh'; launch_gate_init 8")
check "under CI the gate is off by default" '[ "$OUT" = "load gate: off" ]'
OUT=$(CI=true GRAIL_MAX_LOAD=12 bash -c ". '$ROOT/scripts/launch_gate.sh'; launch_gate_init 8")
check "under CI an explicit GRAIL_MAX_LOAD turns it on" \
  'case "$OUT" in "load gate: on"*) true ;; *) false ;; esac'

# --- 2. default limits, and their floors ------------------------------------
launch_gate_init 8 > /dev/null
check "18 CPUs: load limit 12, gem limit 16" \
  '[ "$LAUNCH_GATE_MAX_LOAD" = 12 ] && [ "$LAUNCH_GATE_MAX_GEMS" = 16 ]'
echo 8 > "$SCRATCH/cpus"
launch_gate_init 8 > /dev/null
check "8 CPUs: limits never fall below the run's own 8 gems (load 10, gems 8)" \
  '[ "$LAUNCH_GATE_MAX_LOAD" = 10 ] && [ "$LAUNCH_GATE_MAX_GEMS" = 8 ]'
echo 18 > "$SCRATCH/cpus"
GRAIL_MAX_TEST_GEMS=3 launch_gate_init 1 > /dev/null
check "GRAIL_MAX_TEST_GEMS overrides the gem limit" '[ "$LAUNCH_GATE_MAX_GEMS" = 3 ]'

# --- 3. a quiet machine: no hold, no output ---------------------------------
export GRAIL_MAX_LOAD=12 GRAIL_LAUNCH_SPACING=2
launch_gate_init 8 > /dev/null
echo 3.20 > "$SCRATCH/load"; echo 0 > "$SCRATCH/gems"
T0=$SECONDS; OUT=$(launch_gate "shard 0" 0)
check "a quiet machine launches at once, silently" \
  '[ -z "$OUT" ] && [ $((SECONDS - T0)) -lt 1 ]'

# --- 4. held on load, released when it drops --------------------------------
echo 14.50 > "$SCRATCH/load"; echo 2 > "$SCRATCH/gems"
( sleep 2; echo 6.00 > "$SCRATCH/load" ) &
launch_gate "shard 3" 0 > "$SCRATCH/out4"
wait
check "load over the limit holds the launch, and says why" \
  'grep -q "^load gate: shard 3 waiting -- load 14.50, 2 Grail test gems (limits 12 / 16)" "$SCRATCH/out4"'
check "the hold names the off switch" 'grep -q "GRAIL_MAX_LOAD=0 disables" "$SCRATCH/out4"'
check "it launches once the load drops, and says after how long" \
  'grep -q "^load gate: shard 3 launching after [0-9]*s -- load 6.00" "$SCRATCH/out4"'
check "the hold is counted" '[ "$LAUNCH_GATE_WAITS" = 1 ] && [ "$LAUNCH_GATE_HELD" -ge 1 ]'

# A load exactly AT the limit is not over it.
echo 12 > "$SCRATCH/load"; echo 0 > "$SCRATCH/gems"
OUT=$(launch_gate "shard 4" 0)
check "a load equal to the limit does not hold" '[ -z "$OUT" ]'

# --- 5. held on gem count, though the load average still reads low ----------
echo 2.00 > "$SCRATCH/load"; echo 16 > "$SCRATCH/gems"
( sleep 2; echo 9 > "$SCRATCH/gems" ) &
launch_gate "test.test_enum" 0 > "$SCRATCH/out5"
wait
check "16 test gems hold a launch while the lagging load average reads 2" \
  'grep -q "^load gate: test.test_enum waiting -- load 2.00, 16 Grail test gems" "$SCRATCH/out5"'
check "and release it when gems finish" \
  'grep -q "^load gate: test.test_enum launching after" "$SCRATCH/out5"'

# --- 6. the cap: a machine that never quietens does not stall the run -------
echo 40 > "$SCRATCH/load"; echo 0 > "$SCRATCH/gems"
T0=$SECONDS
GRAIL_LAUNCH_WAIT_MAX=2 launch_gate_init 8 > /dev/null
launch_gate "shard 7" 0 > "$SCRATCH/out6"
check "a hold ends at GRAIL_LAUNCH_WAIT_MAX and says so" \
  'grep -q "^load gate: shard 7 launching anyway after [0-9]*s (the wait cap)" "$SCRATCH/out6"'
check "and does not also claim an ordinary release" \
  '! grep -q "launching after" "$SCRATCH/out6"'
check "the capped hold took about the cap (2-5s)" \
  '[ $((SECONDS - T0)) -ge 2 ] && [ $((SECONDS - T0)) -le 5 ]'

# --- 7. spacing: only when other runs' gems are present ---------------------
launch_gate_init 8 > /dev/null
echo 1.00 > "$SCRATCH/load"
echo 3 > "$SCRATCH/gems"           # all three are this run's own
launch_gate "shard 0" 3 > /dev/null
T0=$SECONDS; launch_gate "shard 1" 3 > /dev/null
check "a run alone on the machine is not spaced" '[ $((SECONDS - T0)) -lt 1 ]'
echo 7 > "$SCRATCH/gems"           # four of them are another run's
launch_gate "shard 2" 3 > /dev/null
T0=$SECONDS; launch_gate "shard 3" 3 > /dev/null
check "with another run's gems present, launches are spaced (>= 1s)" \
  '[ $((SECONDS - T0)) -ge 1 ]'

# --- 8. the summary ---------------------------------------------------------
launch_gate_init 8 > /dev/null
OUT=$(launch_gate_summary)
check "a run with no hold says so" '[ "$OUT" = "load gate: no launch was held" ]'
LAUNCH_GATE_WAITS=2; LAUNCH_GATE_HELD=75
OUT=$(launch_gate_summary)
check "a held run reports the count and the total" \
  '[ "$OUT" = "load gate: held 2 launch(es) for 75s in total -- a slow run, not a slow change" ]'
OUT=$(GRAIL_MAX_LOAD=0 bash -c ". '$ROOT/scripts/launch_gate.sh'; launch_gate_init 8 >/dev/null; launch_gate_summary")
check "a disabled gate prints no summary" '[ -z "$OUT" ]'

if [ "$FAILED" = 0 ]; then
  echo "launch-gate: all checks passed"
else
  echo "launch-gate: FAILED"
fi
exit "$FAILED"
