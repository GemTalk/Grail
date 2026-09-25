#!/bin/bash
# contextvars session-state test (runContextVarsSessionRpc.gs).
#
# RPC edition, exactly like run_gemdb_conflict_test.sh: one topaz process
# drives TWO RPC sessions and interleaves them deterministically with
# ``set session:``.  Both sessions set one shared ContextVar and then do
# rounding Decimal arithmetic with their transactions overlapping; every
# commit must succeed, neither session may see the other's value, and a
# fresh session must see nothing either left behind.  The regression is
# the current Context being committed module state that every gem shared.
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

SYNC=$(mktemp -d "${TMPDIR:-/tmp}/grail_cvcc.XXXXXX")
trap 'rm -rf "$SYNC"' EXIT

# Deploy (and first-use) contextvars + decimal from a LINKED gem in the
# checkout before either RPC session starts, so both warm-bind the committed
# modules.  A NetLDI-spawned gem runs in $HOME, and a cold build of _pydecimal
# from any cwd other than the checkout currently comes out broken (NameError
# on its module-level `_exact_half`, even with grailDir set) -- a separate
# defect this test is not about.
cat > "$SYNC/deploy.gs" <<'EOF'
login
run
| moduleScope scope module |
moduleScope := SymbolDictionary new.
scope := System myUserProfile symbolList copy.
scope insertObject: moduleScope at: 1.
module := ModuleAst parseSource: '
import gemdb, contextvars, decimal
contextvars.ContextVar("warmup").set(0)
decimal.Decimal(1) / decimal.Decimal(7)
'.
module useTempsForBlock: false.
module ensureModuleScope: moduleScope.
module evaluateWithScope: scope.
System commitTransaction ifFalse: [
  ExitClientError signal: 'contextvars session test: deploy commit failed' status: 1].
%
logout
exit 0
EOF
(cd "$PROJECT_ROOT" && LC_ALL=C topaz -lq -S "$SYNC/deploy.gs" < /dev/null) || exit 1

# The RPC gem is spawned by NetLDI and does NOT inherit topaz's
# environment, so the checkout path is substituted in as a literal.
RUN="$SYNC/run.gs"
{
  printf 'set gems %s\n' "$STONE"
  printf 'set gemnetid %s\n' "$GEMNETID"
  sed -e "s#@@GRAILDIR@@#${PROJECT_ROOT}#g" \
    "$SCRIPT_DIR/runContextVarsSessionRpc.gs"
} > "$RUN"
LC_ALL=C topaz -q -S "$RUN" < /dev/null
EXIT=$?
exit $EXIT
