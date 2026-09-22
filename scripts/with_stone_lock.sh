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
# .setenv is this checkout's source of truth for the stone, and is sourced
# unconditionally so it wins over an inherited GEMSTONE_NAME -- but it is
# gitignored and CI does not have one (the workflows export GEMSTONE_NAME
# inline), so a bare `.' here would fail every CI run under `set -e'.  That
# matters now that tests/scripts/run_stone_lock_test.sh runs in the suite.
if [ -f "$PROJECT_ROOT/.setenv" ]; then
  # shellcheck disable=SC1091
  . "$PROJECT_ROOT/.setenv"
fi
# GRAIL_STONE_LOCK_NAME is a TEST HOOK, and the only way to name a lock other
# than this checkout's stone: .setenv is sourced unconditionally above and is
# meant to win over the inherited environment, so GEMSTONE_NAME cannot be
# overridden from outside without breaking that rule.  Production callers never
# set it; tests/scripts/run_stone_lock_test.sh does, so it can exercise
# acquire/wait/break without touching the real stone's lock.
STONE="${GRAIL_STONE_LOCK_NAME:-${GEMSTONE_NAME:?GEMSTONE_NAME unset -- source .setenv}}"
LOCK="${TMPDIR:-/tmp}/grail-suite-$STONE.lock"
WAITED=0

# LIVENESS IS THE HOLDER'S OWN PID, not a pattern over topaz command lines.
#
# This used to ask `pgrep -f 'topaz.*(runTestsShard|run_one_cpython_module)'`
# and, finding nothing for a lock older than 45 minutes, declare it stale.  That
# test is wrong in both directions, and the false-STALE direction silently
# corrupts a run:
#
#   * run_tests.sh only matches that pattern DURING its shard phase.  It opens a
#     deployFrameworks session before the shards and ~14 more sequential topaz
#     sessions after them (cpython-embedded, gemdb, slot-compaction,
#     flask-deploy, ...), none of which name runTestsShard.  Measured live on
#     2026-09-20: lock held, run_tests.sh alive, pattern matching ZERO
#     processes.  A full run has been measured at 4531s -- past the 45-minute
#     threshold -- so a waiter sampling during that tail would break the lock
#     out from under a live run and launch eight more sessions into it.
#   * it could not see a holder that had not started a session yet, or one
#     wedged before it did.
#
# The holder already writes its PID here; asking whether THAT process is alive
# is exact, needs no pattern maintenance as phases are added, and covers every
# phase including the gaps between sessions.  It also reclaims a killed agent's
# lock in seconds rather than 45 minutes, because a dead holder is dead
# immediately -- the age threshold is no longer load-bearing and is gone.
#
# PID reuse is the one hazard, so the command line has to confirm it really is
# a with_stone_lock process before the PID is trusted as alive.  An unparsable
# or missing owner file means the holder is between mkdir and its own write, so
# it is treated as LIVE -- guessing "stale" there would break a lock that is one
# instruction old.
# An owner-less lock is assumed LIVE only briefly.  A holder SIGKILLed between
# its mkdir and its own write leaves a directory that names nobody, and trusting
# that forever would deadlock every worktree on this stone with no way back.
# Two minutes is far longer than the microseconds the real window lasts.
holder_is_alive() {
  if [ ! -f "$LOCK/owner" ]; then
    [ -n "$(find "$LOCK" -maxdepth 0 -mmin -2 2>/dev/null)" ] && return 0
    return 1                                # owner-less and not fresh: abandoned
  fi
  pid=$(sed -n 's/.*pid=\([0-9][0-9]*\).*/\1/p' "$LOCK/owner" 2>/dev/null)
  [ -n "$pid" ] || return 0                 # unparsable: assume live
  kill -0 "$pid" 2>/dev/null || return 1    # gone
  ps -o command= -p "$pid" 2>/dev/null | grep -q with_stone_lock
}

while ! mkdir "$LOCK" 2>/dev/null; do
  if [ -d "$LOCK" ] && ! holder_is_alive; then
    echo "with_stone_lock: breaking a lock whose holder is gone on $STONE ($(cat "$LOCK/owner" 2>/dev/null || echo 'unknown owner'))" >&2
    rm -rf "$LOCK"
    continue
  fi
  [ "$WAITED" -eq 0 ] && echo "with_stone_lock: $STONE busy ($(cat "$LOCK/owner" 2>/dev/null || echo '?')), waiting..." >&2
  WAITED=$((WAITED + 1))
  sleep 20
done
echo "$PROJECT_ROOT pid=$$ $(date -u +%Y-%m-%dT%H:%M:%SZ)" > "$LOCK/owner"
# Release only a lock we still own.  If some other waiter decided ours was dead
# and took it, the directory now belongs to that run, and deleting it on our way
# out would hand a third process a lock the second one is still holding.
release_lock() {
  case "$(cat "$LOCK/owner" 2>/dev/null)" in
    *" pid=$$ "*) rm -rf "$LOCK" ;;
  esac
}
trap release_lock EXIT INT TERM
[ "$WAITED" -gt 0 ] && echo "with_stone_lock: acquired $STONE after $((WAITED * 20))s" >&2

"$@"
