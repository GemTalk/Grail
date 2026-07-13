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

LC_ALL=C topaz -lq -C "$TOPAZ_CFG" -S tests/scripts/runTests.gs < /dev/null || EXIT=$?

# Run embedded CPython tests in a separate session (can't coexist with shim)
LC_ALL=C topaz -lq -C "$TOPAZ_CFG" -S tests/scripts/runCPythonTests.gs < /dev/null || EXIT=$?

# Regression for commit 4a46289 (boxed SrePattern/SreMatch C pointers). The
# bug only manifests across a commit + session boundary, so it can't live in
# the in-session SUnit suite -- this script commits a pattern/match, re-logs
# in to fault them with a NULL CPointer, asserts the guards signal instead of
# SEGVing, then removes the key and commits to leave the repository clean.
LC_ALL=C topaz -lq -C "$TOPAZ_CFG" -S tests/scripts/runIssue2Test.gs < /dev/null || EXIT=$?

# Functional test for gemstone.system.commit()/abort() (env-1 class-side
# methods on System reached via the gemstone module). Commit/abort cannot
# run inside the in-session SUnit suite -- this script commits a value via
# gemstone.system.commit(), re-logs in to verify persistence, discards an
# uncommitted overwrite via gemstone.system.abort(), then removes the key
# and commits to leave the repository clean.
LC_ALL=C topaz -lq -C "$TOPAZ_CFG" -S tests/scripts/runGemstoneSystemTest.gs < /dev/null || EXIT=$?

# Grail-side WeakReference commit-safety regression. Builds a Grail
# WeakReference, commits the UserGlobals graph that holds it, re-logs in,
# and verifies the post-commit contract: outer ref persists, the dbTransient
# holder reference persists by identity, the holder's slots come back nil
# (including the link to the inner ephemeron), the ref reports dead, and
# the frozen hashCache survives so the ref stays usable as a dict key.
LC_ALL=C topaz -lq -C "$TOPAZ_CFG" -S tests/scripts/runEphemeronCommitTest.gs < /dev/null || EXIT=$?

# Phase-1 canonical-class regression (docs/Persistent_Modules_and_Classes.md).
# Reuse can only be observed across a commit + logout + login boundary, so it
# can't live in the in-session SUnit suite. Session 1 (flag on) imports the
# fixture and commits an instance; session 2 re-imports and asserts the
# re-imported class IS the committed instance's class, then removes the
# UserGlobals keys and commits to leave the repository clean. Also asserts
# the flag defaults OFF in a fresh session.
LC_ALL=C topaz -lq -C "$TOPAZ_CFG" -S tests/scripts/runCanonicalClassTest.gs < /dev/null || EXIT=$?

# Phase-2 persistent-module-state regression (__persistent__ marker; see
# docs/Persistent_Modules_and_Classes.md). Session 1 imports a module that
# declares persistent globals, rebinds one + mutates another in place, and
# commits via the Python-visible gemstone.system.commit() (the write-through
# point); session 2 re-imports and asserts the committed values win over the
# re-run initializers while unlisted globals stay session-local. Cleans up
# the store key and temp module file.
LC_ALL=C topaz -lq -C "$TOPAZ_CFG" -S tests/scripts/runPersistentStateTest.gs < /dev/null || EXIT=$?

exit $EXIT
