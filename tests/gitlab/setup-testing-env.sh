#!/bin/bash
# Setup script for Grail GemStone testing environment.
# Adapted from gemstone/tests/gitlab/setup-testing-env.sh — downloads the
# GemStone product zip from the gemstone project's package registry, then
# provisions a fresh stone in $CI_PROJECT_DIR/testing.
#
# Required environment variables:
#   GS_VERSION           - Product version (e.g., "3.7.6")
#   GEMSTONE_PROJECT_ID  - GitLab project ID of the gemstone project
#                          (whose package registry hosts the product zips)
#   CI_JOB_TOKEN         - GitLab job authentication token (predefined)
#   CI_API_V4_URL        - GitLab API URL (predefined)
#   CI_PROJECT_DIR       - Path in which to run (predefined)
#
# This script is intended to be sourced (it exports GEMSTONE and updates PATH).

set -e -x

: "${GS_VERSION:?GS_VERSION is required}"
: "${GEMSTONE_PROJECT_ID:?GEMSTONE_PROJECT_ID is required (GitLab project ID of the gemstone repo)}"
: "${CI_JOB_TOKEN:?CI_JOB_TOKEN is required}"
: "${CI_API_V4_URL:?CI_API_V4_URL is required}"
: "${CI_PROJECT_DIR:?CI_PROJECT_DIR is required}"

# Cleanup any prior runs
killall stoned 2>/dev/null || true
killall netldid 2>/dev/null || true
chmod -R 777 GemStone64Bit* product || true
rm -rf GemStone64Bit* product || true

# Get the product tree
BASE="GemStone64Bit${GS_VERSION}-x86_64.Linux"
ZIP="${BASE}.zip"
curl --fail --show-error --location \
  --output "$ZIP" \
  --header "JOB-TOKEN: $CI_JOB_TOKEN" \
  "$CI_API_V4_URL/projects/$GEMSTONE_PROJECT_ID/packages/generic/GemStone64Bit/$GS_VERSION/$ZIP"
unzip -q -o "$ZIP"
mv "${BASE}" product
cd product
export GEMSTONE=$(pwd)
export PATH="$GEMSTONE/bin:$PATH"
cd ..

# Provision a fresh stone in $CI_PROJECT_DIR/testing
mkdir -p "$CI_PROJECT_DIR/testing"
cd "$CI_PROJECT_DIR/testing"
rm -rf -- *
cat > stone.conf <<EOF
DBF_EXTENT_NAMES = extent0.dbf;
STN_TRAN_FULL_LOGGING = TRUE;
STN_TRAN_LOG_DIRECTORIES = .;
STN_TRAN_LOG_SIZES = 100 MB;
EOF
cat > ~/.topazini <<EOF
set user DataCurator pass swordfish gems gs64stone
EOF
cp "$GEMSTONE/bin/extent0.dbf" ./extent0.dbf
chmod +w ./extent0.dbf
