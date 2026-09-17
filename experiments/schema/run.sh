#!/bin/bash
# Run the schema-change demo: two sessions, two versions of one module.
#
#   experiments/schema/run.sh
#
# Session 1 imports version 1 of `schema_demo` and commits an instance of B.
# Session 2 imports version 2 -- the same module, with an extra attribute on
# A -- and checks that the committed instance is still an instance of the
# same class and has picked up the new shape.
set -euo pipefail
cd "$(dirname "$0")/../.."

echo "=== session 1: schema_demo v1 (A.x, B.y) ==="
PYTHONPATH=experiments/schema/v1 ./grail -c 'import schema_demo'

echo
echo "=== session 2: schema_demo v2 (A.x + A.z, B.y) ==="
PYTHONPATH=experiments/schema/v2 ./grail -c 'import schema_demo'
