# scripts/launch_gate.sh -- hold a test launch while the MACHINE is busy.
#
# Sourced (not run) by run_tests.sh before each SUnit shard and by
# run_cpython_suite.sh before each module.  It exists because the stone is no
# longer the scarce resource -- with 40 sessions, four worktrees can each start
# a full suite -- but the CPU is: this machine has 18 cores of which 6 are
# performance cores, one suite already saturates those, and four suites at
# once (32 shard gems plus CPython modules) drove the load high enough for
# tests to fail on TIMEOUT.  Nothing in a single runner could see that,
# because each one only counts its own sessions.
#
# A launch is held while EITHER
#
#   * the 1-minute load average is over GRAIL_MAX_LOAD, or
#   * the number of Grail test gems running on this machine -- SUnit shards
#     and CPython-suite modules, from EVERY worktree -- is at
#     GRAIL_MAX_TEST_GEMS or more.
#
# Both, because each misses what the other sees.  The load average is a
# one-minute moving average, so four suites started within seconds of each
# other all read a quiet machine and all launch; the gem count changes the
# moment a gem starts.  The gem count, though, sees only Grail's own work,
# and the load average sees everything else (a compile, another tool).
#
# When other runs' gems are already present, consecutive launches are also
# spaced GRAIL_LAUNCH_SPACING seconds apart, so that two runners starting
# together see each other's gems instead of both reading zero.  A run alone on
# the machine is never spaced, so a solo suite launches exactly as before.
#
# A held launch waits at most GRAIL_LAUNCH_WAIT_MAX seconds and then goes
# anyway, saying so: a stuck process outside Grail must not stall a suite
# forever.  Every wait is logged in one line naming the reason and the way to
# turn the gate off, because a session watching a slow run reads the log, not
# the docs; and launch_gate_summary prints the total, so a slow run is not
# blamed on the code under test.
#
# Settings (all optional):
#   GRAIL_MAX_LOAD        load-average limit; 0 turns the whole gate off.
#                         Default: two thirds of the online CPUs (12 on an
#                         18-CPU machine), never less than the runner's own
#                         concurrency + 2.  Unset under CI (CI=true), where
#                         the runner is not shared, the gate is OFF.
#   GRAIL_MAX_TEST_GEMS   test-gem limit.  Default: CPUs - 2 (16 here), never
#                         less than the runner's own concurrency, so a run
#                         cannot hold itself back.
#   GRAIL_LAUNCH_SPACING  seconds between launches while other runs are
#                         active.  Default 2.
#   GRAIL_LAUNCH_WAIT_MAX longest single hold, in seconds.  Default 600.
#   GRAIL_LAUNCH_POLL     seconds between checks while held.  Default 5.
#
# bash 3.2 compatible (macOS /bin/bash): no associative arrays, integer
# arithmetic only -- the load average is compared with awk.

# Grail test gems are linked topaz processes running one of these drivers.
LAUNCH_GATE_PATTERN='topaz.*(runTestsShard|run_one_cpython_module)'

_launch_gate_cpus() {
  getconf _NPROCESSORS_ONLN 2>/dev/null || sysctl -n hw.logicalcpu 2>/dev/null || echo 4
}

# The 1-minute load average, as a decimal string.
_launch_gate_load() {
  if [ -r /proc/loadavg ]; then
    cut -d' ' -f1 /proc/loadavg
  else
    sysctl -n vm.loadavg 2>/dev/null | awk '{ print $2 }'
  fi
}

# Grail test gems running now, from every worktree.
_launch_gate_gems() {
  pgrep -f "$LAUNCH_GATE_PATTERN" 2>/dev/null | wc -l | tr -d ' '
}

# launch_gate_init OWN_CONCURRENCY -- read the settings and print them once.
# OWN_CONCURRENCY is how many gems this runner keeps running at once (the
# shard count, or the CPython suite's worker count); the limits never fall
# below it.
launch_gate_init() {
  local own="${1:-1}" cpus
  cpus=$(_launch_gate_cpus)
  LAUNCH_GATE_HELD=0
  LAUNCH_GATE_WAITS=0
  LAUNCH_GATE_LAST=""
  if [ -n "${GRAIL_MAX_LOAD+set}" ]; then
    LAUNCH_GATE_MAX_LOAD="$GRAIL_MAX_LOAD"
  elif [ -n "${CI:-}" ]; then
    LAUNCH_GATE_MAX_LOAD=0
  else
    LAUNCH_GATE_MAX_LOAD=$(( cpus * 2 / 3 ))
    [ "$LAUNCH_GATE_MAX_LOAD" -lt $(( own + 2 )) ] && LAUNCH_GATE_MAX_LOAD=$(( own + 2 ))
  fi
  LAUNCH_GATE_MAX_GEMS="${GRAIL_MAX_TEST_GEMS:-$(( cpus - 2 ))}"
  [ "$LAUNCH_GATE_MAX_GEMS" -lt "$own" ] && LAUNCH_GATE_MAX_GEMS="$own"
  LAUNCH_GATE_SPACING="${GRAIL_LAUNCH_SPACING:-2}"
  LAUNCH_GATE_WAIT_MAX="${GRAIL_LAUNCH_WAIT_MAX:-600}"
  LAUNCH_GATE_POLL="${GRAIL_LAUNCH_POLL:-5}"
  if launch_gate_enabled; then
    echo "load gate: on -- hold a launch while load > $LAUNCH_GATE_MAX_LOAD or Grail test gems >= $LAUNCH_GATE_MAX_GEMS ($cpus CPUs; GRAIL_MAX_LOAD=0 disables)"
  else
    echo "load gate: off"
  fi
}

launch_gate_enabled() {
  [ "${LAUNCH_GATE_MAX_LOAD:-0}" != "0" ]
}

# Is the machine too busy?  Sets LAUNCH_GATE_NOW_LOAD / LAUNCH_GATE_NOW_GEMS.
_launch_gate_busy() {
  LAUNCH_GATE_NOW_LOAD=$(_launch_gate_load)
  LAUNCH_GATE_NOW_GEMS=$(_launch_gate_gems)
  [ "${LAUNCH_GATE_NOW_GEMS:-0}" -ge "$LAUNCH_GATE_MAX_GEMS" ] && return 0
  awk -v l="${LAUNCH_GATE_NOW_LOAD:-0}" -v m="$LAUNCH_GATE_MAX_LOAD" 'BEGIN { exit !(l + 0 > m + 0) }'
}

# launch_gate LABEL OWN_LIVE -- return when LABEL may launch.  OWN_LIVE is how
# many of this runner's own gems are running, so that a run alone on the
# machine is not spaced out.
launch_gate() {
  local label="$1" own_live="${2:-0}" t0 waited others
  launch_gate_enabled || return 0
  t0=$SECONDS
  if _launch_gate_busy; then
    LAUNCH_GATE_WAITS=$(( LAUNCH_GATE_WAITS + 1 ))
    echo "load gate: $label waiting -- load $LAUNCH_GATE_NOW_LOAD, $LAUNCH_GATE_NOW_GEMS Grail test gems (limits $LAUNCH_GATE_MAX_LOAD / $LAUNCH_GATE_MAX_GEMS); at most ${LAUNCH_GATE_WAIT_MAX}s; GRAIL_MAX_LOAD=0 disables"
    while _launch_gate_busy; do
      if [ $(( SECONDS - t0 )) -ge "$LAUNCH_GATE_WAIT_MAX" ]; then
        echo "load gate: $label launching anyway after $(( SECONDS - t0 ))s (the wait cap) -- load $LAUNCH_GATE_NOW_LOAD, $LAUNCH_GATE_NOW_GEMS Grail test gems"
        break
      fi
      sleep "$LAUNCH_GATE_POLL"
    done
    waited=$(( SECONDS - t0 ))
    LAUNCH_GATE_HELD=$(( LAUNCH_GATE_HELD + waited ))
    [ "$waited" -lt "$LAUNCH_GATE_WAIT_MAX" ] && \
      echo "load gate: $label launching after ${waited}s -- load $LAUNCH_GATE_NOW_LOAD, $LAUNCH_GATE_NOW_GEMS Grail test gems"
  fi
  others=$(( ${LAUNCH_GATE_NOW_GEMS:-0} - own_live ))
  if [ "$others" -gt 0 ] && [ -n "$LAUNCH_GATE_LAST" ]; then
    while [ $(( SECONDS - LAUNCH_GATE_LAST )) -lt "$LAUNCH_GATE_SPACING" ]; do sleep 1; done
  fi
  LAUNCH_GATE_LAST=$SECONDS
  return 0
}

# One line for the end of a run: how long the gate held its launches.
launch_gate_summary() {
  launch_gate_enabled || return 0
  if [ "$LAUNCH_GATE_WAITS" -gt 0 ]; then
    echo "load gate: held $LAUNCH_GATE_WAITS launch(es) for ${LAUNCH_GATE_HELD}s in total -- a slow run, not a slow change"
  else
    echo "load gate: no launch was held"
  fi
}
