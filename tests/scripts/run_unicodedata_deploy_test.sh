#!/bin/bash
# unicodedata's databases are deployed built (#1508): scripts/deployUnicodedata.gs
# builds and commits them -- ./install.sh runs it, and so does this test, so
# the script itself is what is tested -- and a second gem must find them built
# before its first unicodedata call and finish with nothing to commit.  Two
# gems, so a shell driver rather than SUnit.
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
OUT="$PROJECT_ROOT/out/unicodedata_deploy_test.out"
mkdir -p "$PROJECT_ROOT/out"

EXIT=0
{
  DEPLOY_OUT=$(cd "$PROJECT_ROOT" && LC_ALL=C topaz -lq -S scripts/deployUnicodedata.gs < /dev/null 2>&1)
  if grep -q 'deployUnicodedata: both databases built' <<<"$DEPLOY_OUT"; then
    grep 'deployUnicodedata:' <<<"$DEPLOY_OUT"
  else
    echo "  FAIL  scripts/deployUnicodedata.gs did not commit:"
    echo "$DEPLOY_OUT"
    EXIT=1
  fi
  "$PROJECT_ROOT/grail" "$PROJECT_ROOT/tests/unicodedata_deploy/fresh_session.py" || EXIT=1
} > "$OUT" 2>&1
cat "$OUT"
if [ "$EXIT" -eq 0 ]; then
  echo "unicodedata-deploy: PASS (log: out/unicodedata_deploy_test.out)"
else
  echo "unicodedata-deploy: FAIL (log: out/unicodedata_deploy_test.out)"
fi
exit $EXIT
