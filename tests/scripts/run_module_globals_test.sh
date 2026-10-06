#!/bin/bash
# A change a program makes to one of Grail's own modules (the stdlib, gemdb,
# durable, a vendored framework) stays in that session, as in CPython, and is
# not committed (docs/Persistent_Modules_and_Classes.md D14).  One `grail`
# process patches, deletes and re-binds globals of committed stdlib modules
# and commits; a second must see the modules as shipped.  The regression is
# a stress script's `durable._registry = ...` (2026-10-04), which was
# committed into durable and broke every later gem of that user.
#
# Assumes a running stone and a sourced .setenv.
set -u
SCRIPT_DIR=$(cd "$(dirname "$0")" && pwd)
PROJECT_ROOT=$(cd "$SCRIPT_DIR/../.." && pwd)
if [ -f "$PROJECT_ROOT/.setenv" ]; then
    # shellcheck disable=SC1091
    source "$PROJECT_ROOT/.setenv"
fi
export GRAIL_DIR="$PROJECT_ROOT"
PHASES="$PROJECT_ROOT/tests/module_globals/session_globals.py"
OUT="$PROJECT_ROOT/out/module_globals_test.out"
mkdir -p "$PROJECT_ROOT/out"

EXIT=0
{
  "$PROJECT_ROOT/grail" "$PHASES" change || EXIT=1
  "$PROJECT_ROOT/grail" "$PHASES" check || EXIT=1
} > "$OUT" 2>&1
cat "$OUT"
if [ "$EXIT" -eq 0 ]; then
  echo "module-globals: PASS (log: out/module_globals_test.out)"
else
  echo "module-globals: FAIL (log: out/module_globals_test.out)"
fi
exit $EXIT
