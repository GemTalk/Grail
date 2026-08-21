#!/bin/bash
# Commit-conflict test for the gemdb module (runGemdbConflictRpc.gs).
#
# RPC edition, exactly like run_concurrent_import_test.sh: one topaz
# process drives TWO RPC sessions and interleaves them deterministically
# with ``set session:``.  Session 1 holds a gemdb.transaction() block open
# across the interleave point; session 2 commits a competing write; the
# block's exit must raise gemdb.ConflictError, abort, and leave the
# session usable.  A with statement cannot span two evaluations, so the
# script calls __enter__/__exit__ explicitly -- same semantics, split at
# the seam the test needs.
#
# Assumes a running stone and NetLDI and a sourced .setenv (mirrors
# run_concurrent_import_test.sh).
set -u
SCRIPT_DIR=$(cd "$(dirname "$0")" && pwd)
PROJECT_ROOT=$(cd "$SCRIPT_DIR/../.." && pwd)
if [ -f "$PROJECT_ROOT/.setenv" ]; then
    # shellcheck disable=SC1091
    source "$PROJECT_ROOT/.setenv"
fi
export GRAIL_DIR="$PROJECT_ROOT"

NETLDI="${GRAIL_NETLDI:?set GRAIL_NETLDI in .setenv (the running NetLDI, e.g. ldi40 / gs64ldi)}"
STONE="${GEMSTONE_NAME:?set GEMSTONE_NAME in .setenv (the running stone, e.g. gs40 / gs64stone)}"
HOST="${GRAIL_CC_HOST:-localhost}"
GEMNETID="!tcp@${HOST}#netldi:${NETLDI}!gemnetobject"

SYNC=$(mktemp -d "${TMPDIR:-/tmp}/grail_gemdbcc.XXXXXX")
trap 'rm -rf "$SYNC"' EXIT

# The RPC gem is spawned by NetLDI and does NOT inherit topaz's
# environment, so the checkout path is substituted in as a literal.
RUN="$SYNC/run.gs"
{
  printf 'set gems %s\n' "$STONE"
  printf 'set gemnetid %s\n' "$GEMNETID"
  sed -e "s#@@GRAILDIR@@#${PROJECT_ROOT}#g" \
    "$SCRIPT_DIR/runGemdbConflictRpc.gs"
} > "$RUN"
LC_ALL=C topaz -q -S "$RUN" < /dev/null
EXIT=$?
exit $EXIT
