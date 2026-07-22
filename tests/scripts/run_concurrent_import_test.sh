#!/bin/bash
# Interleaved-commit concurrency test for the reduced-conflict canonical
# registries (docs/Persistent_Modules_and_Classes.md par.10.7 phase 8).
#
# RPC edition: one topaz process drives TWO RPC sessions and interleaves them
# deterministically (runConcurrentImportRpc.gs, `set session:` -- no marker
# files, no polling). Requires a running NetLDI; the gemnetid names it via
# GRAIL_NETLDI (set in .setenv, no default). CI runs `startnetldi` first (.github/workflows/ci.yml).
#
# The two sessions cold-import DISJOINT modules flag-on with overlapping
# transactions, then commit in sequence: A wins, B conflicts on PythonModules
# (the plain SymbolDictionary both add a module class to) and follows the
# GemStone abort/refresh/retry protocol to succeed, and a fresh session sees
# both registry entries merged. A same-module race is out of scope (documented
# last-writer-wins; deploys come from one session).
#
# Assumes a running stone and a sourced .setenv (mirrors run_tests.sh).
set -u
SCRIPT_DIR=$(cd "$(dirname "$0")" && pwd)
PROJECT_ROOT=$(cd "$SCRIPT_DIR/../.." && pwd)
if [ -z "${GEMSTONE:-}" ] && [ -f "$PROJECT_ROOT/.setenv" ]; then
    # shellcheck disable=SC1091
    source "$PROJECT_ROOT/.setenv"
fi
export GRAIL_DIR="$PROJECT_ROOT"

# Stone + NetLDI come from .setenv (GEMSTONE_NAME / GRAIL_NETLDI) -- the single
# source of truth, kept in step with the GEMSTONE product selected there.  No
# hardcoded stone/netldi name: an unset var is a configuration error (fail fast
# with guidance) rather than a stale default that silently targets the wrong DB.
NETLDI="${GRAIL_NETLDI:?set GRAIL_NETLDI in .setenv (the running NetLDI, e.g. ldi40 / gs64ldi)}"
STONE="${GEMSTONE_NAME:?set GEMSTONE_NAME in .setenv (the running stone, e.g. gs40 / gs64stone)}"
HOST="${GRAIL_CC_HOST:-localhost}"
GEMNETID="!tcp@${HOST}#netldi:${NETLDI}!gemnetobject"

SYNC=$(mktemp -d "${TMPDIR:-/tmp}/grail_ccrpc.XXXXXX")
export GRAIL_CC_SYNC="$SYNC"
trap 'rm -rf "$SYNC"' EXIT

for role in a b; do
  cat > "$SYNC/grail_ccmod_$role.py" <<EOF
# Concurrency-test fixture (worker $role) -- disjoint module per worker.
class Marker_$role:
    pass

value = 41
EOF
done

# RPC topaz (NO -l): a gemnetid makes `login` spawn a gem via NetLDI, and
# multiple logins in one process yield distinct sessions switchable with
# `set session:`. Prepend the (environment-specific) gems/gemnetid settings
# to the shared script and run it via -S.
# The RPC gem is spawned by NetLDI as a SEPARATE process and does NOT inherit
# topaz's environment, so paths are substituted into the script as literals
# (@@GRAILDIR@@ / @@SYNC@@) rather than read via System gemEnvironmentVariable:.
RUN="$SYNC/run.gs"
{
  printf 'set gems %s\n' "$STONE"
  printf 'set gemnetid %s\n' "$GEMNETID"
  sed -e "s#@@GRAILDIR@@#${PROJECT_ROOT}#g" -e "s#@@SYNC@@#${SYNC}#g" \
    "$SCRIPT_DIR/runConcurrentImportRpc.gs"
} > "$RUN"
LC_ALL=C topaz -q -S "$RUN" < /dev/null
EXIT=$?
exit $EXIT
