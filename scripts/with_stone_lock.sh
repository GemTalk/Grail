#!/bin/sh
# Run a command holding an exclusive lock on this checkout's STONE.
#
#   ./scripts/with_stone_lock.sh ./scripts/run_tests.sh
#   GRAIL_TEST_COLD=1 GRAIL_IR_CODEGEN=1 ./scripts/with_stone_lock.sh ./scripts/run_tests.sh
#   ./scripts/with_stone_lock.sh ./scripts/run_cpython_suite.sh
#
# Wrap the CPYTHON SUITE TOO, not just run_tests.sh.  It opens
# GRAIL_CPYTHON_WORKERS sessions of its own (four by default), so an unlocked
# four alongside a locked eight still exceeds the stone's limit -- and the lock
# then supplies false confidence rather than exclusion.
#
# WHY.  run_tests.sh opens GRAIL_TEST_WORKERS sessions (eight since PR #876), and
# a stone has a max-sessions limit.  Two worktrees on ONE stone therefore need
# sixteen and exceed it: the losing shards die with "Login failed: the maximum
# number of users are already logged in" and simply contribute nothing, while
# the runner still prints a well-formed, GREEN suite line.  A vacuous pass that
# looks like a pass is worse than a crash, so the exclusion has to be mechanical
# rather than a convention two people remember.
#
# The lock is per STONE, not per machine: worktrees on different stones never
# contend and must not block each other.  (Every worktree is on gs40 now that
# 3.7.x is unsupported, so in practice the lock serializes all of them.)
#
# Opt-in, and CI never calls it -- a blocking wait belongs in a shared developer
# machine, not in a pipeline where a stuck lock would hang a job.
#
# mkdir is the atomic primitive: it succeeds for exactly one caller and needs no
# flock(1), which macOS does not ship.
set -e
[ $# -ge 1 ] || { echo "usage: $0 <command> [args...]" >&2; exit 2; }

PROJECT_ROOT=$(cd "$(dirname "$0")/.." && pwd)
# shellcheck disable=SC1091
. "$PROJECT_ROOT/.setenv"
STONE="${GEMSTONE_NAME:?GEMSTONE_NAME unset -- source .setenv}"
LOCK="${TMPDIR:-/tmp}/grail-suite-$STONE.lock"
SUITE_PROCS='topaz.*(runTestsShard|run_one_cpython_module)'
WAITED=0
# The liveness half of the stale-lock test: a process pattern matching EVERY
# kind of run this lock protects.  run_tests.sh drives runTestsShard.gs;
# run_cpython_suite.sh drives run_one_cpython_module.gs.  Missing the second
# one is not academic -- a full corpus run measured ~29 min under emulation and
# ~7-13 min natively, with a single module seen at 4m20s solo, so a loaded
# machine can plausibly reach the 45-minute age threshold below; with no
# matching process the lock would then be broken out from under a run that is
# very much alive.  The `topaz.*` prefix is what keeps this from matching this
# script's OWN command line while it waits (that is `sh with_stone_lock.sh
# ./scripts/run_cpython_suite.sh ...`, which names no topaz).

while ! mkdir "$LOCK" 2>/dev/null; do
  # A stale lock outlives the process that took it (an interrupted run, a killed
  # agent).  Treat it as stale only when BOTH its age is implausible for a suite
  # AND no shard session is actually alive -- either test alone would eventually
  # break a legitimately long run.
  if [ -d "$LOCK" ] && [ -z "$(pgrep -f "$SUITE_PROCS" || true)" ]; then
    if [ -z "$(find "$LOCK" -maxdepth 0 -mmin -45 2>/dev/null)" ]; then
      echo "with_stone_lock: breaking a stale lock on $STONE ($(cat "$LOCK/owner" 2>/dev/null || echo 'unknown owner'))" >&2
      rm -rf "$LOCK"
      continue
    fi
  fi
  [ "$WAITED" -eq 0 ] && echo "with_stone_lock: $STONE busy ($(cat "$LOCK/owner" 2>/dev/null || echo '?')), waiting..." >&2
  WAITED=$((WAITED + 1))
  sleep 20
done
echo "$PROJECT_ROOT pid=$$ $(date -u +%Y-%m-%dT%H:%M:%SZ)" > "$LOCK/owner"
trap 'rm -rf "$LOCK"' EXIT INT TERM
[ "$WAITED" -gt 0 ] && echo "with_stone_lock: acquired $STONE after $((WAITED * 20))s" >&2

"$@"
