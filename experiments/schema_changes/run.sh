#!/bin/bash
# Run the schema-change examples: each scenario is a series of versions of one
# module, each version imported in its own session against the same
# repository.
#
#   ./scripts/with_stone_lock.sh experiments/schema_changes/run.sh                # every scenario
#   ./scripts/with_stone_lock.sh experiments/schema_changes/run.sh rename compact # just these
#
# Under the STONE LOCK, always: every version is a login, and a login while
# another worktree's run_tests.sh holds its eight sessions can push the stone
# past its session limit and make THAT run's shards die silently (CLAUDE.md,
# "Two worktrees on ONE stone").  The lock waits for the suite to finish.
#
# A class outlives PythonModules (the canonical class registry keeps it), so
# re-running a scenario under the SAME module name would start from the
# previous run's layout.  Every run therefore gets a fresh module name,
# <scenario>_<run id>, and the versions are copied under it into a temp tree.
set -uo pipefail
HERE=$(cd "$(dirname "$0")" && pwd)
cd "$HERE/../.."
ID=${RUN_ID:-$(date +%H%M%S)}
TMP=$(mktemp -d "${TMPDIR:-/tmp}/grail-schema-XXXXXX")
trap 'rm -rf "$TMP"' EXIT
ALL="remove_and_readd compact rename renamed_declaration move_in_hierarchy refactor_helper uncommitted_rebuild dual_home"
status=0
for scen in ${@:-$ALL}; do
  for v in v1 v2 v3 v4; do
    [ -f "$HERE/$scen/$v.py" ] || continue
    mkdir -p "$TMP/$scen/$v"
    cp "$HERE/$scen/$v.py" "$TMP/$scen/$v/${scen}_$ID.py"
    echo "=== $scen $v ==="
    PYTHONPATH="$TMP/$scen/$v" ./grail -c "import ${scen}_$ID" 2>&1 | grep -v '^$'
    rc=${PIPESTATUS[0]}
    [ "$rc" = 0 ] || { echo "*** $scen $v exited $rc"; status=1; }
  done
  echo
done
exit $status
