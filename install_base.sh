#!/bin/bash

# ===========================================================================
# Grail base setup -- run ONCE per extent, as SystemUser, BEFORE ./install.sh.
# ===========================================================================
# This installs the shared, user-independent infrastructure that an ordinary
# (non-SystemUser) .topazini user cannot create for themselves.  After it has run and
# committed, ANY user can run ./install.sh with NO SystemUser step -- so several
# users can each install their own Grail (per-user session methods + Python*
# dictionaries) on ONE shared stone.
#
# Steps (all idempotent):
#   1. GsPackagePolicy env-1 session-method support -- the 3.7.x stand-in for
#      GemStone MR #6 ("Support session methods in environments other than 0").
#      Skipped on 4.0+, whose base image already has it.
#   2. Unicode comparison mode (extent-global).
#   3. The shared restricted-class methods (scripts/install_base.gs): env-1
#      dunders on GsNMethod / System / SymbolDictionary / ExecBlock and Object's
#      env-0 <primitive:> / ___new___ dispatch infrastructure.
#
# The stone + SystemUser password come from the SystemUser logins inside the
# .gs scripts (stone via .topazini `set gems`).  Assumes the stone is running.
# ===========================================================================

BASE_T0=$SECONDS
trap 'printf "TIMING | %-26s | %4ds\n" "TOTAL install_base.sh" "$((SECONDS - BASE_T0))"' EXIT

# Auto-source .setenv when $GEMSTONE isn't in the environment (see install.sh).
SCRIPT_DIR=$(cd "$(dirname "$0")" && pwd)
if [ -z "$GEMSTONE" ] && [ -f "$SCRIPT_DIR/.setenv" ]; then
    # shellcheck disable=SC1091
    source "$SCRIPT_DIR/.setenv"
fi

if [ -z "$GEMSTONE" ]; then
    echo "Error: \$GEMSTONE is not set. Set it to your GemStone installation directory (e.g., /path/to/GemStone64Bit3.7.x-arch.Darwin)."
    exit 1
fi

if ! command -v topaz &>/dev/null; then
    echo "Error: 'topaz' is not on your \$PATH. Add \$GEMSTONE/bin to your PATH (e.g., export PATH=\$GEMSTONE/bin:\$PATH)."
    exit 1
fi

cd "$SCRIPT_DIR" || exit 1

# 1. GsPackagePolicy env-1 session-method support (3.7.x only).
case "$GEMSTONE" in
    *3.7*)
        echo "GemStone 3.7.x detected -- applying env-1 session-method policy patch..."
        LC_ALL=C topaz -lq -S scripts/session_methods_env1_base_37.gs || {
            echo "Error: env-1 session-method policy patch failed."; exit 1; }
        ;;
    *)
        echo "Not GemStone 3.7.x -- assuming the base image already supports env-1"
        echo "session methods (GemStone MR #6); skipping the 3.7.x policy patch."
        ;;
esac

# 2. Unicode comparison mode (extent-global).
echo "Setting Unicode comparison mode..."
./scripts/setUnicodeMode.sh || { echo "Error: setUnicodeMode.sh failed."; exit 1; }

# 3. Shared restricted-class methods.
echo "Filing shared restricted-class methods (SystemUser)..."
LC_ALL=C topaz -lq -S scripts/install_base.gs || {
    echo "Error: install_base.gs failed."; exit 1; }

echo ""
echo "Base setup complete.  Any user can now run ./install.sh (no SystemUser)."
