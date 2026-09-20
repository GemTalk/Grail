#!/bin/bash
# Provision a fresh stone for Grail CI on GitHub Actions.
#
# The GemStone product is baked into the container image at $GEMSTONE (GemTalk's
# container.gemtalksystems.com/gemstone/gemstone/main:grail), so there is nothing
# to download here -- we just lay down a clean extent + config in
# $GITHUB_WORKSPACE/testing and point the tools at it. install.sh / run_tests.sh
# run against this stone.
#
# Required environment variables:
#   GEMSTONE          - GemStone product dir (set by the container image ENV)
#   GITHUB_WORKSPACE  - repo checkout dir (predefined by GitHub Actions)
#
# Persists GEMSTONE_GLOBAL_DIR + $GEMSTONE/bin to subsequent workflow steps via
# $GITHUB_ENV / $GITHUB_PATH.

set -e -x

: "${GEMSTONE:?GEMSTONE must be set (baked into the container image)}"
: "${GITHUB_WORKSPACE:?GITHUB_WORKSPACE is required}"

# Global dir (locks + logs + extent) inside the workspace so logs are easy to
# collect as artifacts; run_tests.sh honours GEMSTONE_GLOBAL_DIR.
GEMSTONE_GLOBAL_DIR="$GITHUB_WORKSPACE/testing"
rm -rf "$GEMSTONE_GLOBAL_DIR"
mkdir -p "$GEMSTONE_GLOBAL_DIR"
cd "$GEMSTONE_GLOBAL_DIR"

# Name the license key EXPLICITLY.  GemStone finds it via the KEYFILE config
# variable ("currently only used by stone"), which defaults to
# $GEMSTONE/sys/gemstone.key and is documented to fall back to
# $GEMSTONE/sys/community.starter.key.  That fallback did NOT happen: a rebuild
# of the container image between 2026-09-18 and 2026-09-19 shipped without the
# customer key and every job -- ci.yml, the conformance nightly and the
# diagnostics, all of which start their stone through this script -- died in
# startstone with
#
#   ERROR: Unable to stat() key file $GEMSTONE/sys/gemstone.key: ENOENT
#
# rather than trying the community key beside it.  So we pick the file here.
#
# Preferring the customer key keeps CI on the full license whenever the image
# carries one; the community starter key, which ships with every Linux and Mac
# distribution, is the floor.  Community Edition allows 10 concurrent sessions
# and pins the stone to 2 cores.  Neither binds: ci.yml runs 2 SUnit shards per
# runner (GRAIL_TEST_SHARDS) and the nightly runs GRAIL_CPYTHON_WORKERS=2,
# against a 2-vCPU ubuntu-22.04 runner.  Its 10 GB repository and 1 GB shared
# cache limits likewise sit above a fresh extent and the 200 MB default cache.
if [ -f "$GEMSTONE/sys/gemstone.key" ]; then
  KEYFILE="$GEMSTONE/sys/gemstone.key"
elif [ -f "$GEMSTONE/sys/community.starter.key" ]; then
  KEYFILE="$GEMSTONE/sys/community.starter.key"
else
  # Fail HERE, naming both candidates and listing what the image does carry,
  # instead of letting startstone die with only the default path in its log.
  echo "ERROR: no GemStone license key in $GEMSTONE/sys" >&2
  echo "       looked for: gemstone.key, community.starter.key" >&2
  ls -la "$GEMSTONE/sys" >&2 || true
  exit 1
fi

cat > stone.conf <<EOF
DBF_EXTENT_NAMES = extent0.dbf;
KEYFILE = $KEYFILE;
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
