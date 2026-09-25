#!/bin/bash

# This script assumes a stone is already running per the stone name defined in .topazini

# Always source .setenv when it exists.  Lets ``./scripts/run_tests.sh``
# succeed from a fresh shell without remembering to ``source .setenv`` first —
# a missing $GEMSTONE only sets $PATH up to topaz, but Grail-specific env (and
# indirectly the shim registration the committed installation depends on)
# needs the rest of .setenv too.
#
# Unconditional on purpose: .setenv is this checkout's source of truth for
# which product + stone to use, so it must win over whatever the launching
# shell exported.  Sourcing only when $GEMSTONE was unset let an inherited
# GEMSTONE silently take over — e.g. a 3.7.5 product against a worktree
# configured for gs40.  CI has no .setenv and exports its env inline, so the
# -f guard leaves that path alone.
PROJECT_ROOT=$(cd "$(dirname "$0")/.." && pwd)
if [ -f "$PROJECT_ROOT/.setenv" ]; then
    # shellcheck disable=SC1091
    source "$PROJECT_ROOT/.setenv"
fi

if [ -z "$GEMSTONE" ]; then
    echo "Error: \$GEMSTONE is not set. Set it to your GemStone installation directory (e.g., /path/to/GemStone64Bit4.0.0-arch.Darwin)."
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
# GEM_TEMPOBJ_CACHE_SIZE is a CEILING the gem grows into, not a reservation,
# so raising it costs nothing until a session actually needs the room. 500000
# (~488 MB) was not enough for a sharded cold run: the gem signalled
# AlmostOutOfMemory during some import in every sweep, and importlib's
# module-body handler turns that notification into a dead module plus one red
# test (whichever test happened to be importing -- WeakReference,
# WarningRegistry, Zipfile, Twilio, WalrusPlacement have all taken the turn,
# each passing when run alone).  Resuming the notification instead is worse:
# the unload is what frees the module's AST and generated source, and without
# it two shards died on the hard "VM temporary object memory is full".  So give
# each worker headroom instead: 8 workers x ~879 MB of ceiling.
#
# THIS AND THE EIGHT-PARTITION CHANGE BELOW ARE TWO FIXES FOR ONE DEFECT, found
# independently and both kept.  Partitioning lowers what a session HAS to hold;
# the ceiling raises what it MAY hold.  The default (warm) path is fixed by
# partitioning alone -- eight shards measured 75% of the old 500000 cap.  The
# cold sweep (GRAIL_TEST_COLD=1, which skips the framework deploy so every
# shard recompiles the frameworks itself) is the case that still wants the
# ceiling, and it is the sweep the IR-codegen flag-on gate runs.
#
# GEM_MAX_SMALLTALK_STACK_DEPTH IS NEW HERE, and it is an INCREASE: this script
# never set it, so every shard ran at the gem default of 1000 (nominal 128-byte
# activations).  Flag-off tolerates that; the IR path does not --
# PrivateNameManglingTestCase>>testPrivateNameMangling asserts that a private
# recursion raises a CATCHABLE RecursionError, and flag-on it escaped the
# Python ``except'' instead, failing in a shard while passing standalone.  More
# memory does not fix it (tried at 1600000: the failure is unchanged and shard
# usage falls to 33%); the depth does.
#
# 74000 was chosen from a measured window -- at 68000
# PrivateNameManglingTestCase passes but TracebackTestCase>>testRecursionContextChain
# fails; at 74000 both pass -- and the window was read as a pass/fail question
# when it was also a COST one.  THAT COST IS WHY THIS NUMBER CAME DOWN.
#
# testRecursionContextChain drives a runaway recursion to stack exhaustion and
# renders the __context__ chain it produces, so this variable also sets the
# LENGTH of that chain.  It does not get gradually slower with depth; it falls
# off a cliff.  Measured here, one variable moving:
#
#     setting     levels reached    shard 4      that one test
#     default              187        --            21.5 s
#     16000               1420       146 s          ~27 s
#     48000               4032       176 s          ~27 s
#     74000               6163     **25+ min**    **24.9 min**
#
# At 6163 levels EVERY check in that fixture runs 8-200x worse than its own
# linear extrapolation, the recursion itself included (962 ms at 1420 levels,
# 882 s at 6163).  That is a memory regime -- 6163 live exceptions each holding
# a 6163-frame traceback -- and no rendering fix reaches it: one was made
# anyway (format_exception was re-scanning the chain for a group once per link,
# O(N^2)), and it took this test from 1515 s to 1176 s at 74000 while taking it
# from 8.1 s to 1.5 s at 772 levels.  The lever that works is the depth.
#
# The cost landed on the FLAG-OFF gate, which is the only one CI runs: CI job
# `test-main (c, 4 5)` went 6 min -> 37 min across #956, against 5-14 min for
# the other three, so the PR gate's critical path roughly tripled.
#
# THE LOWER BOUND IS REAL AND ONLY A SHARD CAN SEE IT.  At 16000 the flag-on
# cold gate fails
# RecursionErrorTestCase>>testReflexiveDictComparisonRaisesACatchableRecursionError
# ("raised RecursionError instead") -- and that test PASSES STANDALONE at 16000,
# at 24000, at 32000 and at 48000, so probing it alone finds no bound at all.
# Same shape as the test the depth was raised for.  Bisected with whole gate
# runs instead: 16000 red, 32000 green (8/8, shard 4 = 158 s), 48000 green in
# BOTH arms -- flag-on cold 8/8 6662 passed, flag-off 8/8 6662 passed.
#
# 48000 is the value here because it keeps the margin on both sides: two thirds
# of what 74000 gave the tests that need depth, and 4032 levels is comfortably
# short of the regime that starts somewhere between 4032 and 6163.
# run_cpython_suite.sh keeps 74000 -- a different corpus with different
# evidence, and nothing measured here says anything about it.
TOPAZ_CFG="GEM_TEMPOBJ_CODE_SIZE=300000;GEM_TEMPOBJ_CACHE_SIZE=900000;GEM_MAX_SMALLTALK_STACK_DEPTH=48000;"

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
# GRAIL_TEST_COLD=1 skips the deploy, so nothing is committed for the shards
# to bind and everything recompiles -- the escape hatch and the warm-vs-cold
# discrepancy check.  (It works by NOT deploying, not by a feature flag: what
# is warm and what is cold is decided entirely by what has been committed.)
if [ -z "${GRAIL_TEST_COLD:-}" ]; then
  DEPLOY_T0=$SECONDS
  GRAIL_DIR="$PROJECT_ROOT" LC_ALL=C topaz -lq -C "$TOPAZ_CFG" -S scripts/deployFrameworks.gs < /dev/null \
    | grep -E "deployFrameworks|skipped" || { echo "framework deploy FAILED"; EXIT=1; }
  printf 'TIMING | %-26s | %4ds\n' "framework-deploy" "$((SECONDS - DEPLOY_T0))"
fi

# Main SUnit suite, sharded across GRAIL_TEST_WORKERS parallel topaz sessions
# (default 8; set GRAIL_TEST_WORKERS=1 for the classic single-session run).
#
# EIGHT, NOT FOUR, AND FOR MEMORY RATHER THAN TIME.  Each shard is a SESSION,
# and a session's temporary object memory is capped (TOPAZ_CFG below,
# GEM_TEMPOBJ_CACHE_SIZE) -- so the partition count decides how much of the
# corpus one session compiles, and therefore how close it runs to that cap.
# At four partitions the heaviest shard ended at 96% of it: no headroom, and
# CI duly began failing with AlmostOutOfMemory (notification 6013) reported
# against a different innocent test on every run.  Measured on one machine,
# same suite, from the GRAIL_SHARD_MEM lines runTestsShard.gs now emits:
#
#     partitions   heaviest shard        all 6533 tests
#     4            352 MB   96% used     pass
#     8            277 MB   75% used     pass
#
# It does not halve, because one shard's cost is dominated by a few
# framework-heavy classes that no partitioning splits further -- but 75% is
# the difference between a suite with headroom and one that fails whenever
# anything is added to it.
# Each worker runs a disjoint, complete slice of the PythonTestCase classes
# (partitioned by a stable class-name hash in runTestsShard.gs), so the
# framework-heavy classes (Flask, Django, ...) compile their imports on ONE
# shard rather than once per shard.  Besides the wall-clock win this is a
# genuine multi-session concurrency exercise against a single stone.  The
# suite does not commit, so the shards share the committed image read-only.
WORKERS="${GRAIL_TEST_WORKERS:-8}"
# Which of the WORKERS partitions THIS invocation runs (space-separated shard
# indices; default all).  The partition COUNT is always WORKERS, so the stable
# class->shard mapping in runTestsShard.gs is identical no matter how the shards
# are divided.  CI splits them across parallel runner jobs by setting e.g.
# GRAIL_TEST_SHARDS="0 1" on one runner and "2 3" on another, roughly halving
# the (dominant) shard wall-clock.  Note that this is only about which runner
# HOSTS a session: every shard is its own session either way, so regrouping
# jobs changes wall-clock and never the per-session memory the cap applies to.
# Only WORKERS changes that.
SHARDS="${GRAIL_TEST_SHARDS:-$(seq 0 $((WORKERS-1)))}"
N_SHARDS=$(set -- $SHARDS; echo "$#")

# PREFLIGHT: refuse a run the stone has no room to finish.
#
# The stone's concurrent-session limit counts its OWN permanent gems.  Measured
# on gs40 (Community Edition, StnMaxSessions=10): `reclaimgcgem' and
# `symbolgem' hold two slots from the moment the stone starts, leaving EIGHT --
# exactly the shard count.  A solo, correctly serialized run therefore fits with
# ZERO headroom, and any single extra session (an editor's Jasper/MCP session, a
# topaz probe, another worktree's install.sh) costs a SHARD its login instead.
#
# A shard that cannot log in does not fail -- it contributes nothing, is not
# counted, and the total still reads green.  So the check has to happen HERE,
# before the shards race for the last slot: afterwards the measurement is
# already spoiled and only the shard accounting reveals it.
#
# Advisory-by-refusal, with an escape hatch: set GRAIL_ALLOW_TIGHT_SESSIONS=1 to
# proceed anyway (the run is then explicitly not a gate result).  A probe that
# cannot reach the stone WARNS and continues -- this check must never be the
# thing that breaks a working run.
if [ -z "${GRAIL_ALLOW_TIGHT_SESSIONS:-}" ]; then
  BUDGET=$(LC_ALL=C topaz -lq -C "$TOPAZ_CFG" -S tests/scripts/checkSessionBudget.gs < /dev/null 2>/dev/null \
           | sed -n 's/.*GRAIL_SESSION_BUDGET|max=\([0-9]*\)|inuse=\([0-9]*\)|free=\([0-9]*\).*/\1 \2 \3/p')
  if [ -n "$BUDGET" ]; then
    # shellcheck disable=SC2086
    set -- $BUDGET
    echo "stone sessions: max=$1 in-use=$2 free-for-shards=$3 (need $N_SHARDS)"
    if [ "$3" -lt "$N_SHARDS" ]; then
      echo "ERROR: only $3 session(s) free but $N_SHARDS shards are about to launch." >&2
      echo "       $((N_SHARDS - $3)) shard(s) would fail to log in, contribute nothing," >&2
      echo "       and leave a GREEN total that is not a gate result." >&2
      echo "       Close other stone sessions (editor/MCP sessions, other worktrees)," >&2
      echo "       or set GRAIL_ALLOW_TIGHT_SESSIONS=1 to run anyway." >&2
      exit 1
    fi
  else
    echo "warning: could not read the stone session budget; shard logins are unverified" >&2
  fi
fi

SHARD_T0=$SECONDS
mkdir -p "$PROJECT_ROOT/out"
rm -f "$PROJECT_ROOT"/out/shard_*.out
SHARD_PIDS=()
for i in $SHARDS; do
  GRAIL_TEST_WORKERS="$WORKERS" GRAIL_TEST_SHARD="$i" \
    LC_ALL=C topaz -lq -C "$TOPAZ_CFG" -S tests/scripts/runTestsShard.gs < /dev/null \
    > "$PROJECT_ROOT/out/shard_$i.out" 2>&1 &
  SHARD_PIDS+=("$!")
done
for pid in "${SHARD_PIDS[@]}"; do
  wait "$pid" || EXIT=$?
done
# Aggregate shard results into one summary line (portable: no gawk-isms) and
# surface any per-shard failures/errors.
S_RUN=0; S_PASS=0; S_FAIL=0; S_ERR=0; S_SEEN=0
SHARD_MS=""
SKIPS=""
for i in $SHARDS; do
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
  # Per-shard seconds.  The shards run CONCURRENTLY, so the phase total below
  # is roughly the SLOWEST shard, not their sum -- without the individual
  # numbers a skewed phase gives no clue which shard to move work off.
  ms=$(echo "$line" | sed -n -E 's/.*\|ms=([0-9]+)\|.*/\1/p')
  [ -n "$ms" ] && SHARD_MS="$SHARD_MS $i=$((ms / 1000))s"
  # runTestsShard.gs tags EVERY line of its defect report (header, message,
  # stack, repro) with this marker precisely so one line-oriented grep recovers
  # the whole multi-line block -- a Python traceback or a stack report would
  # otherwise be truncated to its first line.
  grep -E "^GRAIL_DEFECT\|" "$f" | sed 's/^GRAIL_DEFECT|/  /'
  # Tests a class's #skippedTests left out of the suite on this gem (GemStone's
  # SUnit has no skip, so they are simply not in the run count).  The owning
  # shard names each one once; they are listed under the summary line below.
  SKIPS="$SKIPS$(grep -E "^GRAIL_SKIP\|" "$f" | sed 's/^GRAIL_SKIP|/  skipped: /; s/|/ -- /')
"
done
# REPORT THE SHARDS THAT ANSWERED, NOT THE ONES WE ASKED FOR.  This line used
# to print $N_SHARDS -- the count REQUESTED -- so a run in which half the shards
# never logged in still announced "sharded: 8 of x8" above a green total.  That
# is the vacuous pass the stone-session limit produces, and it is the line a
# human reads: on 2026-09-20 a run printed "8 of x8: 3408 run, 3408 passed, 0
# failed, 0 errors" with four NO RESULT lines directly above it.  $S_SEEN knew
# the truth and only ever reached the exit code, which a scrollback does not
# show.  An incomplete run now says so in the same breath as its total, so the
# number can never be quoted as a gate result on its own.
if [ "$S_SEEN" -ne "$N_SHARDS" ]; then
  echo "main suite INCOMPLETE (only $S_SEEN of $N_SHARDS shards reported; x$WORKERS partitions): $S_RUN run, $S_PASS passed, $S_FAIL failed, $S_ERR errors"
  echo "  NOT A GATE RESULT -- $((N_SHARDS - S_SEEN)) shard(s) contributed nothing. Check out/shard_*.out for 'Login failed' (stone session limit)."
else
  echo "main suite (sharded: $S_SEEN of x$WORKERS): $S_RUN run, $S_PASS passed, $S_FAIL failed, $S_ERR errors"
fi
# The summary line above is left exactly as it was (other tooling reads it);
# skips get lines of their own beneath it.
printf '%s' "$SKIPS" | grep -v '^$' || true
printf 'TIMING | %-26s | %4ds\n' "sunit shards [$SHARDS]" "$((SECONDS - SHARD_T0))"
[ -n "$SHARD_MS" ] && printf 'TIMING | %-26s |%s\n' "  per shard (concurrent)" "$SHARD_MS"
if [ "$S_SEEN" -ne "$N_SHARDS" ] || [ "$S_FAIL" -ne 0 ] || [ "$S_ERR" -ne 0 ]; then EXIT=1; fi

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

# Functional test for the gemdb module (the public Python persistence API:
# gemdb.root, gemdb.transaction(), commit/abort/refresh and their guard
# rails). Commits and aborts, so it cannot live in the in-session SUnit
# suite; session 2 asserts the fresh-session properties (import leaves
# nothing to commit; committed values visible). The commit-conflict path
# needs two concurrent sessions and lives in run_gemdb_conflict_test.sh.
timed "gemdb" env LC_ALL=C topaz -lq -C "$TOPAZ_CFG" -S tests/scripts/runGemdbTest.gs < /dev/null || EXIT=$?
timed "gemdb-conflict" tests/scripts/run_gemdb_conflict_test.sh || EXIT=$?
# contextvars' current Context, and a committed regex's recompiled pointer,
# are per-session state: two RPC sessions set one ContextVar and do Decimal
# arithmetic with overlapping transactions, and every commit must succeed.
timed "contextvars-session" tests/scripts/run_contextvars_session_test.sh || EXIT=$?

# Durable execution on GemStone continuations (stdlib durable, docs/Durable_Execution.md):
# one workflow crosses six gems -- parked on sleep() and recv(), resumed by
# timer and by send(), and one gem is kill -9ed after a checkpoint so another
# recovers it from the committed continuation.  Each phase is its own `grail`
# gem, so it lives in a shell driver rather than SUnit.
timed "durable" tests/scripts/run_durable_test.sh || EXIT=$?

# Functional test for gemdb.schema (layout/report/drop/rename/compact, the
# public surface for deliberate schema change). Every operation but layout()
# scans the repository for the instances it touches, which aborts first and
# so needs a clean transaction, and they commit themselves -- neither of
# which the in-session SUnit suite can do. IndexedSlotRebuildTestCase covers
# the same primitives over their session-only entry points.
timed "gemdb-schema" env LC_ALL=C topaz -lq -C "$TOPAZ_CFG" -S tests/scripts/runSchemaTest.gs < /dev/null || EXIT=$?
timed "gemdb-class-schema" env LC_ALL=C topaz -lq -C "$TOPAZ_CFG" -S tests/scripts/runClassSchemaTest.gs < /dev/null || EXIT=$?

# An abort rolls the repository back but not the session: sys.modules keeps
# every module imported before it, while the generated class, the registry
# entry and the source hash -- written in the aborted transaction -- go with
# it. Serving the rolled-back module from cache used to persist instances of
# a class nothing names, so the next session's import built a DIFFERENT class
# and the committed objects answered isinstance() False against it, silently.
# Session 1 imports, aborts, re-imports (which must be COLD -- a fresh class)
# and commits an instance; session 2 asks whether the committed object is an
# instance of the class it just imported.
timed "abort-reimport" env LC_ALL=C topaz -lq -C "$TOPAZ_CFG" -S tests/scripts/runAbortReimportTest.gs < /dev/null || EXIT=$?

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

# Slot compaction (docs/Instance_Attribute_Indexed_Slots.md par.4 item 5).
# The maintenance entry point scans the repository for the instances to move,
# and a repository scan needs a CLEAN transaction, so the in-session suite
# cannot drive it. Session 1 commits instances of a slotted class and its
# subclass, drops a slot (tombstone), asserts the dirty-transaction refusal,
# commits and compacts; session 2 faults the instances back and verifies the
# compact layouts, moved values and shrunk sizes, then restores the registries.
timed "slot-compaction" env LC_ALL=C topaz -lq -C "$TOPAZ_CFG" -S tests/scripts/runSlotCompactionTest.gs < /dev/null || EXIT=$?

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

# Dependency coherence (docs/Persistent_Modules_and_Classes.md par.4.4): a
# deployed module is stale when anything its body imported changed, and a
# stale deployed module is rebuilt into its committed instance.  Edits a
# leaf of a three-module chain between sessions and checks all three rebuild
# in place, captures included, then that the next session binds warm and
# writes nothing.
timed "module-coherence" env LC_ALL=C topaz -lq -C "$TOPAZ_CFG" -S tests/scripts/runModuleCoherenceTest.gs < /dev/null || EXIT=$?

# A monkey-patch belongs to its session (docs/Persistent_Modules_and_Classes.md
# D8): patching builtins.len and a class's method writes no persistent object,
# and after a commit a fresh session sees both originals -- where persistent
# forwarders used to survive the commit and break len() in every later session.
timed "session-patch" env LC_ALL=C topaz -lq -C "$TOPAZ_CFG" -S tests/scripts/runSessionPatchTest.gs < /dev/null || EXIT=$?

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

# The ./grail launcher: console encoding and exit status. Both defects it
# guards live in the shell wrapper + scripts/grail.tpz, so neither is reachable
# from the in-session SUnit suite -- the evidence is the BYTES the command wrote
# and the STATUS it exited with, which only running the command can produce.
timed "grail-launcher" ./tests/scripts/test_grail_launcher.sh || EXIT=$?

# The stone lock's acquire/wait/break rules.  Needs no stone (it locks a scratch
# name), and guards a rule whose failure mode is silent: a lock seized from a
# live holder launches a second run's sessions into a stone that has none left,
# and the losing shards produce a green total rather than an error.
timed "stone-lock" ./tests/scripts/run_stone_lock_test.sh || EXIT=$?

printf 'TIMING | %-26s | %4ds\n' "TOTAL run_tests.sh" "$((SECONDS - SUITE_T0))"
exit $EXIT
