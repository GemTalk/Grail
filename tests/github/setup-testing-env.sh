#!/bin/bash
# Provision a fresh stone for Grail CI on GitHub Actions.
#
# The GemStone product (fixed version) is baked into the ci-base image at
# $GEMSTONE by tests/github/Dockerfile, so there is nothing to download here --
# we just lay down a clean extent + config in $GITHUB_WORKSPACE/testing and
# point the tools at it. install.sh / run_tests.sh run against this stone.
#
# Required environment variables:
#   GEMSTONE          - GemStone product dir (set by the ci-base image ENV)
#   GITHUB_WORKSPACE  - repo checkout dir (predefined by GitHub Actions)
#
# Persists GEMSTONE_GLOBAL_DIR + $GEMSTONE/bin to subsequent workflow steps via
# $GITHUB_ENV / $GITHUB_PATH.

set -e -x

: "${GEMSTONE:?GEMSTONE must be set (baked into the ci-base image)}"
: "${GITHUB_WORKSPACE:?GITHUB_WORKSPACE is required}"

# Global dir (locks + logs + extent) inside the workspace so logs are easy to
# collect as artifacts; run_tests.sh honours GEMSTONE_GLOBAL_DIR.
GEMSTONE_GLOBAL_DIR="$GITHUB_WORKSPACE/testing"
rm -rf "$GEMSTONE_GLOBAL_DIR"
mkdir -p "$GEMSTONE_GLOBAL_DIR"
cd "$GEMSTONE_GLOBAL_DIR"

cat > stone.conf <<EOF
DBF_EXTENT_NAMES = extent0.dbf;
STN_TRAN_FULL_LOGGING = TRUE;
STN_TRAN_LOG_DIRECTORIES = .;
STN_TRAN_LOG_SIZES = 100 MB;
EOF
cp "$GEMSTONE/bin/extent0.dbf" ./extent0.dbf
chmod +w ./extent0.dbf
# topaz reads ~/.topazini for the default login used by install.sh/run_tests.sh
cat > ~/.topazini <<EOF
set user DataCurator pass swordfish gems gs64stone
EOF

# Persist env to subsequent workflow steps (each `run:` is a fresh shell). The
# $GEMSTONE/bin entry is belt-and-suspenders in case the container's image PATH
# isn't carried over.
if [ -n "${GITHUB_ENV:-}" ]; then
  echo "GEMSTONE_GLOBAL_DIR=$GEMSTONE_GLOBAL_DIR" >> "$GITHUB_ENV"
  echo "$GEMSTONE/bin" >> "$GITHUB_PATH"
fi
