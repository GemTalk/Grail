#!/bin/bash

# This script assumes a stone is already running per the stone name defined in .topazini

# Auto-source .setenv when $GEMSTONE isn't in the environment.  Lets
# ``./scripts/run_tests.sh`` succeed from a fresh shell without remembering
# to ``source .setenv`` first — a missing $GEMSTONE only sets $PATH up to
# topaz, but Grail-specific env (and indirectly the shim registration the
# committed installation depends on) needs the rest of .setenv too.
PROJECT_ROOT=$(cd "$(dirname "$0")/.." && pwd)
if [ -z "$GEMSTONE" ] && [ -f "$PROJECT_ROOT/.setenv" ]; then
    # shellcheck disable=SC1091
    source "$PROJECT_ROOT/.setenv"
fi

if [ -z "$GEMSTONE" ]; then
    echo "Error: \$GEMSTONE is not set. Set it to your GemStone installation directory (e.g., /path/to/GemStone64Bit3.7.x-arch.Darwin)."
    echo "  Tip: 'source .setenv' (if present at the project root) configures \$GEMSTONE + \$PATH."
    exit 1
fi

if [ -d /opt/gemstone/locks ]; then
  if [ -z "$GEMSTONE_GLOBAL_DIR" ]; then
    echo "using /opt/gemstone/locks"
  else
    echo "using GEMSTONE_GLOBAL_DIR = $GEMSTONE_GLOBAL_DIR"
  fi
else
  echo "directory /opt/gemstone/locks does not exist"
  if [ -z "$GEMSTONE_GLOBAL_DIR" ]; then
    echo "Error: \$GEMSTONE_GLOBAL_DIR is not set. Set it to the directory containing your GemStone locks and logs."
    exit 1
  else
    echo "using GEMSTONE_GLOBAL_DIR = $GEMSTONE_GLOBAL_DIR"
  fi
fi

# Lift the gem's transient code-gen area: a full suite run compiles enough
# Python methods + doit blocks (notably importing itsdangerous / Werkzeug /
# Flask once each) to overflow the default 20%-of-cache code space.  Topaz
# `-C` overrides take precedence over gem.conf.
#
# CACHE_SIZE governs the whole temp-object cache (new + old gen + code).
# It has been raised in step with the growing in-suite import surface to
# avoid spurious markSweep-exhaustion ("VM temporary object memory is
# full") in the late suite once the cumulative working set crosses the
# old-gen ceiling.  Vendoring Django (DjangoTestCase imports the whole
# framework once — asgiref + the ORM + template engine all load on the
# django.setup() path) pushed old gen past ~150MB, so CACHE_SIZE is now
# ~490MB (was ~195MB).  Comfortably within a 16GB host.
TOPAZ_CFG="GEM_TEMPOBJ_CODE_SIZE=300000;GEM_TEMPOBJ_CACHE_SIZE=500000;"

EXIT=0

# --- Phase timing -----------------------------------------------------------
# Almost all of the CI wall-clock is in this script (install.sh is seconds), so
# print a per-phase breakdown.  Uses the portable bash `SECONDS` builtin (whole
# seconds; works identically on macOS and the Linux CI image -- BSD `date` has
# no %N).  Every line is prefixed `TIMING |` so it greps cleanly out of a log.
# `timed LABEL cmd...` wraps a single command: put env/redirects INSIDE the
# wrapped command (e.g. `env LC_ALL=C topaz ... < /dev/null`) so nothing leaks
# into the calling shell, and it preserves the command's exit status for the
# usual `|| EXIT=$?`.
SUITE_T0=$SECONDS
timed() {
  local label="$1"; shift
  local t0=$SECONDS rc=0
  "$@" || rc=$?
  printf 'TIMING | %-26s | %4ds\n' "$label" "$((SECONDS - t0))"
  return $rc
}

# Framework deployment (DEFAULT): deploy the heavy closures
# (flask/werkzeug/jinja2/twilio) once so the flag-on shards below warm-bind
# them instead of recompiling per shard (docs/Persistent_Modules_and_
# Classes.md par.4.1/par.10). Measured: full gate 194s -> 104s. Idempotent:
# ~23s cold, ~10ms on a source-hash match, so re-running is cheap. The
# suite runs clean warm (3014/3014) because fixtures are never deployed
# (their per-test re-imports stay cold) and every test that resets a
# framework module is deploy-aware (___resetImportedFramework___).
# GRAIL_TEST_COLD=1 skips the deploy and runs the classic flag-off suite
# (everything recompiled) -- the escape hatch and the warm-vs-cold
# discrepancy check.
if [ -z "${GRAIL_TEST_COLD:-}" ]; then
  DEPLOY_T0=$SECONDS
  GRAIL_DIR="$PROJECT_ROOT" LC_ALL=C topaz -lq -C "$TOPAZ_CFG" -S scripts/deployFrameworks.gs < /dev/null \
    | grep -E "deployFrameworks|skipped" || { echo "framework deploy FAILED"; EXIT=1; }
  printf 'TIMING | %-26s | %4ds\n' "framework-deploy" "$((SECONDS - DEPLOY_T0))"
fi

# Main SUnit suite, sharded across GRAIL_TEST_WORKERS parallel topaz sessions
# (default 4; set GRAIL_TEST_WORKERS=1 for the classic single-session run).
# Each worker runs a disjoint, complete slice of the PythonTestCase classes
# (partitioned by a stable class-name hash in runTestsShard.gs), so the
# framework-heavy classes (Flask, Django, ...) compile their imports on ONE
# shard rather than once per shard.  Besides the wall-clock win this is a
# genuine multi-session concurrency exercise against a single stone.  The
# suite does not commit, so the shards share the committed image read-only.
WORKERS="${GRAIL_TEST_WORKERS:-4}"
SHARD_T0=$SECONDS
mkdir -p "$PROJECT_ROOT/out"
rm -f "$PROJECT_ROOT"/out/shard_*.out
SHARD_PIDS=()
for i in $(seq 0 $((WORKERS-1))); do
  GRAIL_TEST_WORKERS="$WORKERS" GRAIL_TEST_SHARD="$i" \
    LC_ALL=C topaz -lq -C "$TOPAZ_CFG" -S tests/scripts/runTestsShard.gs < /dev/null \
    > "$PROJECT_ROOT/out/shard_$i.out" 2>&1 &
  SHARD_PIDS+=("$!")
done
for i in $(seq 0 $((WORKERS-1))); do
  wait "${SHARD_PIDS[$i]}" || EXIT=$?
done
# Aggregate shard results into one summary line (portable: no gawk-isms) and
# surface any per-shard failures/errors.
S_RUN=0; S_PASS=0; S_FAIL=0; S_ERR=0; S_SEEN=0
for i in $(seq 0 $((WORKERS-1))); do
  f="$PROJECT_ROOT/out/shard_$i.out"
  line=$(grep GRAIL_SHARD_RESULT "$f" 2>/dev/null)
  if [ -z "$line" ]; then
    echo "  shard $i: NO RESULT (crash) -- see out/shard_$i.out"; EXIT=1; continue
  fi
  S_SEEN=$((S_SEEN+1))
  # The result printString singularizes a count of 1 ("1 error" vs "N
  # errors"), so match the optional plural -- otherwise a shard with exactly
  # one error fails to parse and breaks the whole aggregation.
  nums=$(echo "$line" | sed -E 's/.*\|([0-9]+) run, ([0-9]+) passed, ([0-9]+) failed, ([0-9]+) errors?.*/\1 \2 \3 \4/')
  # shellcheck disable=SC2086
  set -- $nums
  S_RUN=$((S_RUN+$1)); S_PASS=$((S_PASS+$2)); S_FAIL=$((S_FAIL+$3)); S_ERR=$((S_ERR+$4))
  grep -E "debug: #" "$f" | sed 's/^/  /'
done
echo "main suite (sharded x$S_SEEN): $S_RUN run, $S_PASS passed, $S_FAIL failed, $S_ERR errors"
printf 'TIMING | %-26s | %4ds\n' "sharded-sunit (x$WORKERS)" "$((SECONDS - SHARD_T0))"
if [ "$S_SEEN" -ne "$WORKERS" ] || [ "$S_FAIL" -ne 0 ] || [ "$S_ERR" -ne 0 ]; then EXIT=1; fi

# Run embedded CPython tests in a separate session (can't coexist with shim)
timed "cpython-embedded" env LC_ALL=C topaz -lq -C "$TOPAZ_CFG" -S tests/scripts/runCPythonTests.gs < /dev/null || EXIT=$?

# Regression for commit 4a46289 (boxed SrePattern/SreMatch C pointers). The
# bug only manifests across a commit + session boundary, so it can't live in
# the in-session SUnit suite -- this script commits a pattern/match, re-logs
# in to fault them with a NULL CPointer, asserts the guards signal instead of
# SEGVing, then removes the key and commits to leave the repository clean.
timed "issue2-sre-ptr" env LC_ALL=C topaz -lq -C "$TOPAZ_CFG" -S tests/scripts/runIssue2Test.gs < /dev/null || EXIT=$?

# Functional test for gemstone.system.commit()/abort() (env-1 class-side
# methods on System reached via the gemstone module). Commit/abort cannot
# run inside the in-session SUnit suite -- this script commits a value via
# gemstone.system.commit(), re-logs in to verify persistence, discards an
# uncommitted overwrite via gemstone.system.abort(), then removes the key
# and commits to leave the repository clean.
timed "gemstone-system" env LC_ALL=C topaz -lq -C "$TOPAZ_CFG" -S tests/scripts/runGemstoneSystemTest.gs < /dev/null || EXIT=$?

# Grail-side WeakReference commit-safety regression. Builds a Grail
# WeakReference, commits the UserGlobals graph that holds it, re-logs in,
# and verifies the post-commit contract: outer ref persists, the dbTransient
# holder reference persists by identity, the holder's slots come back nil
# (including the link to the inner ephemeron), the ref reports dead, and
# the frozen hashCache survives so the ref stays usable as a dict key.
timed "ephemeron-commit" env LC_ALL=C topaz -lq -C "$TOPAZ_CFG" -S tests/scripts/runEphemeronCommitTest.gs < /dev/null || EXIT=$?

# Phase-1 canonical-class regression (docs/Persistent_Modules_and_Classes.md).
# Reuse can only be observed across a commit + logout + login boundary, so it
# can't live in the in-session SUnit suite. Session 1 (flag on) imports the
# fixture and commits an instance; session 2 re-imports and asserts the
# re-imported class IS the committed instance's class, then removes the
# UserGlobals keys and commits to leave the repository clean. Also asserts
# the flag defaults OFF in a fresh session.
timed "canonical-class" env LC_ALL=C topaz -lq -C "$TOPAZ_CFG" -S tests/scripts/runCanonicalClassTest.gs < /dev/null || EXIT=$?

# Phase-2 persistent-module-state regression (__persistent__ marker; see
# docs/Persistent_Modules_and_Classes.md). Session 1 imports a module that
# declares persistent globals, rebinds one + mutates another in place, and
# commits via the Python-visible gemstone.system.commit() (the write-through
# point); session 2 re-imports and asserts the committed values win over the
# re-run initializers while unlisted globals stay session-local. Cleans up
# the store key and temp module file.
timed "persistent-state" env LC_ALL=C topaz -lq -C "$TOPAZ_CFG" -S tests/scripts/runPersistentStateTest.gs < /dev/null || EXIT=$?

# Canonical-class session-local attribute-overlay regression
# (docs/Persistent_Modules_and_Classes.md par.7). The overlay only carries
# values with the canonical flag ON, so the main (flag-off) suite never
# exercises it. This runs AttributeInheritanceTestCase +
# ClassFunctionBindingTestCase with the flag ON to regress two fixes: the
# per-class ___resetClassAttrOverlay___ (no stale overlay leaks across a
# re-import) and the instance-read descriptor binding through the overlay
# (a class-stored function binds self). No commit.
timed "overlay-reuse" env LC_ALL=C topaz -lq -C "$TOPAZ_CFG" -S tests/scripts/runOverlayReuseTest.gs < /dev/null || EXIT=$?

# Phase-5 module-bind acceptance (docs/Persistent_Modules_and_Classes.md
# par.10.6). Session A (flag on) imports a fixture exercising @dataclass,
# @enum.global_enum, and a decorator registry, then commits; session B must
# warm-BIND the committed module instance (identity, body not re-run, new
# instances get their defaults), importlib.reload() must be the explicit
# cold path, and delete-and-reimport of the deployed module must raise the
# par.10.5 ImportError. Session C cleans the repository.
timed "module-bind" env LC_ALL=C topaz -lq -C "$TOPAZ_CFG" -S tests/scripts/runModuleBindTest.gs < /dev/null || EXIT=$?

# REAL-APPLICATION acceptance (par.10): session A deploys a module-level
# Flask app (committing the whole flask/werkzeug closure); session B
# warm-binds it and the committed app must serve requests (routing, request
# context, dynamic converters, jsonify, 404s). Exercises the session-tier
# fixes this surfaced: dbTransient PyThreadLock, SrePattern per-session
# recompile, lazy first-touch canonical bind, strong-ref flask provider.
timed "flask-deploy" env LC_ALL=C topaz -lq -C "$TOPAZ_CFG" -S tests/scripts/runFlaskDeployTest.gs < /dev/null || EXIT=$?

# Interleaved-commit concurrency (par.10.7 phase 8): two concurrent topaz
# processes cold-import disjoint modules flag-on with overlapping
# transactions, then commit in sequence; the loser follows the abort-retry
# protocol and a fresh session must see both registry entries merged.
timed "concurrent-import" ./tests/scripts/run_concurrent_import_test.sh || EXIT=$?

printf 'TIMING | %-26s | %4ds\n' "TOTAL run_tests.sh" "$((SECONDS - SUITE_T0))"
exit $EXIT
