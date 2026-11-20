#!/bin/bash
# redeploy_verdict.sh REPORT FULL_OUTPUT
#
# install.sh's verdict on its redeploy step (scripts/redeployModules.gs), read
# from REPORT -- the step's ``redeployModules:'' lines -- and naming
# FULL_OUTPUT, the step's whole topaz output, when the step did not finish.
# Prints the report, and then what it means, and exits:
#
#   0  finished, every stale module rebuilt or skipped;
#   2  finished, some modules FAILED: a warning -- each stays stale and
#      rebuilds (or raises) on its next import, as it would have anyway;
#   1  did NOT finish: no summary line.  The session died part-way (it ran out
#      of temporary object memory on 2026-11-19), so nothing says which
#      modules are left stale and the install must not read as a success.
#
# Split out of install.sh so tests/scripts/run_redeploy_verdict_test.sh can
# check each case without a stone.
REPORT=$1
FULL=$2
SUMMARY='^redeployModules: [0-9]+ rebuilt, [0-9]+ skipped, [0-9]+ failed'

[ -f "$REPORT" ] && cat "$REPORT"
if [ ! -f "$REPORT" ] || ! grep -qE "$SUMMARY" "$REPORT"; then
    echo ""
    echo "ERROR: rebuilding the deployed modules did not finish: its session"
    echo "  ended without its summary line. Its whole output is"
    echo "  $FULL"
    if [ -f "$FULL" ]; then
        echo "  and ends:"
        tail -n 12 "$FULL" | sed 's/^/    /'
    fi
    echo "  Re-run ./install.sh once the cause is fixed: the modules it had not"
    echo "  reached are still stale."
    exit 1
fi
if grep -qE '^redeployModules: [0-9]+ rebuilt, [0-9]+ skipped, 0 failed' "$REPORT"; then
    exit 0
fi
echo ""
echo "Warning: rebuilding the deployed modules failed for some of them (above)."
echo "  Grail is installed; each of those rebuilds on its next import, and"
echo "  leaves that session with something to commit."
exit 2
