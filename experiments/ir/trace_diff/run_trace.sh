#!/bin/bash
# Dump GRAIL_CODEGEN_TRACE_DIR output for both corpora and both codegen arms.
#
#   experiments/ir/trace_diff/run_trace.sh <outroot> [ir] [text]
#   experiments/ir/trace_diff/compare.py <baseroot> <afterroot>
#
# Corpora: the stdlib list census_stdlib.tpz imports (stdlib_modules.txt) and
# scripts/cpython_suite_manifest.txt, sharded three ways round-robin as the
# census_tests_0*.tpz scripts do.  Arms: IR (the default) and
# GRAIL_IR_CODEGEN=0.  Each session forgets the canonical registries in its own
# never-committed transaction, so every import COMPILES (a deployed module
# would warm-bind and be dumped as nothing).  Run ./install.sh first.
set -u
H=$(cd "$(dirname "$0")" && pwd)
W=$(cd "$H/../../.." && pwd)
ROOT=$1; shift
ARMS=${*:-ir text}
cd "$W"; source .setenv
mkdir -p "$ROOT"
grep -v '^#' scripts/cpython_suite_manifest.txt | sed -e 's/^[[:space:]]*//' -e 's/[[:space:]]*$//' \
  | grep -v '^$' > "$ROOT/tests_modules.txt"
CFG="GEM_TEMPOBJ_CODE_SIZE=300000;GEM_TEMPOBJ_CACHE_SIZE=1800000;"
for arm in $ARMS; do
  pids=()
  for job in stdlib:0:1 tests:0:3 tests:1:3 tests:2:3; do
    IFS=: read corpus shard n <<<"$job"
    list=$H/stdlib_modules.txt; [ $corpus = tests ] && list=$ROOT/tests_modules.txt
    d=$ROOT/$arm/$corpus-$shard; rm -rf "$d"; mkdir -p "$d"
    (
      if [ $arm = text ]; then export GRAIL_IR_CODEGEN=0; else unset GRAIL_IR_CODEGEN; fi
      export GRAIL_CODEGEN_TRACE_DIR=$d TRACE_LIST=$list TRACE_SHARD=$shard TRACE_NSHARDS=$n
      topaz -lq -C "$CFG" -S "$H/trace_driver.tpz" > "$ROOT/$arm-$corpus-$shard.log" 2>&1
    ) &
    pids+=($!)
  done
  for p in "${pids[@]}"; do wait $p; done
done
for f in "$ROOT"/*.log; do echo "$(basename "$f"): $(grep -h '^DONE' "$f")"; done
