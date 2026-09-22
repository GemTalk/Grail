#!/bin/bash
# Behavioural test for scripts/with_stone_lock.sh.
#
# WHAT IT GUARDS.  The lock serializes suite runs across worktrees sharing one
# stone, and its stale-lock rule decides when a held lock may be seized.  Get
# that rule wrong in the permissive direction and the damage is invisible: a
# second run launches eight more sessions into a stone that has none left, the
# losing shards fail to log in, contribute nothing, and the total still reads
# green.
#
# The rule USED to be "no topaz process matches
# 'topaz.*(runTestsShard|run_one_cpython_module)' AND the lock is over 45
# minutes old".  Both halves are wrong:
#
#   * run_tests.sh matches that pattern only DURING its shard phase.  It opens a
#     deployFrameworks session before the shards and ~14 more sequential topaz
#     sessions after them, none named runTestsShard.  Observed live on
#     2026-09-20: lock held, run_tests.sh alive, pattern matching zero
#     processes.  Full runs have been measured at 4531s, well past 45 minutes,
#     so the age half cannot save it.
#   * conversely a holder killed one second ago kept its lock for 45 minutes.
#
# Liveness is now the holder's own recorded PID, so test 2 is the regression
# test that matters: a LIVE holder running no topaz at all, with a lock
# backdated past any age threshold, must still be left alone.
#
# Needs no stone: GRAIL_STONE_LOCK_NAME points every case at a scratch lock.
set -u
ROOT=$(cd "$(dirname "$0")/.." && pwd)
ROOT=$(cd "$ROOT/.." && pwd)
LOCKER="$ROOT/scripts/with_stone_lock.sh"
NAME="graillocktest-$$"
LOCK="${TMPDIR:-/tmp}/grail-suite-$NAME.lock"
export GRAIL_STONE_LOCK_NAME="$NAME"
FAILED=0
cleanup() { rm -rf "$LOCK"; }
trap cleanup EXIT
cleanup

ok()   { echo "  ok   - $1"; }
bad()  { echo "  FAIL - $1"; FAILED=1; }

# --- 1. acquire and release -------------------------------------------------
"$LOCKER" sh -c '[ -d "$0" ]' "$LOCK" \
  && ok "lock exists while the command runs" \
  || bad "lock did not exist while the command runs"
[ -d "$LOCK" ] && bad "lock survived the command" || ok "lock released on exit"

# --- 2. a LIVE holder is never broken, however old the lock looks -----------
# The holder runs `sleep', not topaz: this is exactly the blind window the old
# process-pattern liveness test could not see.
"$LOCKER" sleep 30 &
HOLDER=$!
for _ in 1 2 3 4 5 6 7 8 9 10; do [ -f "$LOCK/owner" ] && break; sleep 0.3; done
if [ ! -f "$LOCK/owner" ]; then
  bad "holder never took the lock"
else
  # Backdate well past any plausible age threshold.
  touch -t 202001010000 "$LOCK" 2>/dev/null
  OWNER_BEFORE=$(cat "$LOCK/owner")
  # A waiter must NOT seize it.  Give it one poll interval plus slack.
  "$LOCKER" true & WAITER=$!
  sleep 3
  if kill -0 "$WAITER" 2>/dev/null; then
    ok "a waiter blocks on a live holder that runs no topaz"
  else
    bad "a waiter seized the lock from a live holder (the 2026-09-20 defect)"
  fi
  [ "$(cat "$LOCK/owner" 2>/dev/null)" = "$OWNER_BEFORE" ] \
    && ok "the live holder still owns the lock" \
    || bad "the lock changed hands under a live holder"
  kill "$WAITER" 2>/dev/null
  kill "$HOLDER" 2>/dev/null
  wait "$HOLDER" 2>/dev/null
  wait "$WAITER" 2>/dev/null
fi
cleanup

# --- 3. a DEAD holder's lock is reclaimed, and promptly --------------------
# Bounded rather than synchronous on purpose: under the OLD age-threshold rule
# this case blocks for 45 minutes, and a lock test that can hang is no better
# than the hang it is testing for.
mkdir -p "$LOCK"
# A PID that cannot be running.  `kill -0' on it fails, so the holder is gone.
echo "/nonexistent pid=999999 2020-01-01T00:00:00Z" > "$LOCK/owner"
T0=$(date +%s)
"$LOCKER" true & RECLAIM=$!
RECLAIMED=0
for _ in $(seq 1 40); do
  kill -0 "$RECLAIM" 2>/dev/null || { RECLAIMED=1; break; }
  sleep 0.5
done
ELAPSED=$(( $(date +%s) - T0 ))
if [ "$RECLAIMED" -eq 1 ]; then
  ok "a dead holder's lock is reclaimed promptly (${ELAPSED}s, no age threshold)"
else
  bad "a dead holder's lock was still held after ${ELAPSED}s"
  kill "$RECLAIM" 2>/dev/null
fi
wait "$RECLAIM" 2>/dev/null
cleanup

# --- 4. a mid-acquire lock (no owner file yet) is treated as LIVE ----------
# Guessing "stale" here would break a lock one instruction old.
mkdir -p "$LOCK"
"$LOCKER" true & WAITER=$!
sleep 2
if kill -0 "$WAITER" 2>/dev/null; then
  ok "an owner-less lock is treated as live, not stale"
else
  bad "an owner-less (mid-acquire) lock was broken"
fi
kill "$WAITER" 2>/dev/null; wait "$WAITER" 2>/dev/null
cleanup

# --- 5. an owner-less lock that is NOT fresh is abandoned, not immortal ------
# Test 4's "assume live" must be bounded: a holder SIGKILLed between its mkdir
# and its own write names nobody, and trusting that forever would deadlock every
# worktree on this stone with no way back.  Backdated rather than waited out.
mkdir -p "$LOCK"
touch -t 202001010000 "$LOCK" 2>/dev/null
"$LOCKER" true & ABANDON=$!
RECLAIMED=0
for _ in $(seq 1 20); do
  kill -0 "$ABANDON" 2>/dev/null || { RECLAIMED=1; break; }
  sleep 0.5
done
[ "$RECLAIMED" -eq 1 ] \
  && ok "an owner-less lock past the freshness window is reclaimed" \
  || bad "an owner-less lock was held forever (deadlock)"
kill "$ABANDON" 2>/dev/null; wait "$ABANDON" 2>/dev/null
cleanup

if [ "$FAILED" -eq 0 ]; then echo "stone-lock: all checks passed"; else echo "stone-lock: FAILURES"; fi
exit "$FAILED"
