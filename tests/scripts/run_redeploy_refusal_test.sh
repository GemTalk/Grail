#!/bin/bash
# An install's redeploy rebuilds a deployed module whose class changed its bases
# when nothing is stored against the class (GemTalk/Grail#1985).
#
# scripts/redeployModules.gs aborts a failed rebuild inside its handler, then
# asks importlib ___grailUninhabitedBaseChanges___: for the refused classes it
# can rebuild -- a repository count that needs a clean transaction, and answers
# nothing in a dirty one.  When the failed body's unwinding wrote its records
# after that abort (f8f8d468), every refusal stood: GemDB's email.message
# (EmailMessage, Message -> MIMEPart) and each of the 56 modules importing it
# failed, each a whole failed build of flask's import closure, and the
# redeploy ran out of temporary object memory.
#
# Three sessions, so a shell driver: setup deploys the old shape and writes the
# new; the install's own redeploy script runs; verify checks the result in a
# fresh session and cleans up.  Assumes a running stone and a sourced .setenv.
set -u
SCRIPT_DIR=$(cd "$(dirname "$0")" && pwd)
PROJECT_ROOT=$(cd "$SCRIPT_DIR/../.." && pwd)
if [ -f "$PROJECT_ROOT/.setenv" ]; then
    # shellcheck disable=SC1091
    source "$PROJECT_ROOT/.setenv"
fi
export GRAIL_DIR="$PROJECT_ROOT"
OUT="$PROJECT_ROOT/out/redeploy_refusal_test.out"
mkdir -p "$PROJECT_ROOT/out"
# The temporary object space install.sh gives the redeploy.
CFG="GEM_TEMPOBJ_CODE_SIZE=300000;GEM_TEMPOBJ_CACHE_SIZE=900000;"

EXIT=0
{
  # Each session's checks print to stdout; topaz's own log (tracebacks and
  # all) goes to the script's ``output pushnew'' file in the checkout root.
  SETUP=$(cd "$PROJECT_ROOT" && LC_ALL=C topaz -lq -C "$CFG" \
     -S tests/scripts/runRedeployRefusalSetup.gs < /dev/null 2>&1 | grep -a -E '^  (PASS|FAIL)  ')
  echo "$SETUP"
  if ! grep -q 'PASS  the fixture is deployed' <<<"$SETUP"; then
      echo "  FAIL  setup did not deploy the fixture (runRedeployRefusalSetup.out)"
      EXIT=1
  fi
  grep -q '  FAIL  ' <<<"$SETUP" && EXIT=1
  REPORT=$(cd "$PROJECT_ROOT" && LC_ALL=C topaz -lq -C "$CFG" \
     -S scripts/redeployModules.gs < /dev/null 2>&1 | grep -a '^redeployModules: ')
  echo "$REPORT" | grep -a 'grail_redeploy_refusal\|rebuilt, '
  if grep -q 'nothing is stored against grail_redeploy_refusal_fixture.EmailMessage' <<<"$REPORT"; then
      echo "  PASS  the redeploy found nothing stored against the refused class"
  else
      echo "  FAIL  the redeploy did not find EmailMessage uninhabited"
      EXIT=1
  fi
  if grep -q 'FAILED .*grail_redeploy_refusal_fixture' <<<"$REPORT"; then
      echo "  FAIL  the redeploy failed the fixture"
      EXIT=1
  else
      echo "  PASS  the redeploy did not fail the fixture"
  fi
  VERIFY=$(cd "$PROJECT_ROOT" && LC_ALL=C topaz -lq -C "$CFG" \
     -S tests/scripts/runRedeployRefusalVerify.gs < /dev/null 2>&1 | grep -a -E '^  (PASS|FAIL)  ')
  echo "$VERIFY"
  if ! grep -q 'PASS  and runs the new source' <<<"$VERIFY" || grep -q '  FAIL  ' <<<"$VERIFY"; then
      EXIT=1
  fi
} > "$OUT" 2>&1
cat "$OUT"
if [ "$EXIT" -eq 0 ]; then
  echo "redeploy-refusal: PASS (log: out/redeploy_refusal_test.out)"
else
  echo "redeploy-refusal: FAIL (log: out/redeploy_refusal_test.out)"
fi
exit $EXIT
