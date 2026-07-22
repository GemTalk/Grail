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

# 1. GsPackagePolicy env-1 session-method support.
# Stock 3.7.x wires session methods for environment 0 ONLY, so it always needs
# Grail's env-1 patch (scripts/session_methods_env1_base_37.gs, which makes the
# GsPackagePolicy install path env-aware).  4.0+ MAY support env-1 session
# methods NATIVELY via GemStone MR #6 ("Support session methods in environments
# other than 0"); a stock pre-MR#6 4.0 does NOT -- its Behavior>>compileMethod:
# routes only env-0 through GsPackagePolicy, so an env-1 kernel-class method
# fails at install time with SecurityError 2257, and
# scripts/session_methods_env1_base_40.gs recompiles compileMethod: to route
# env-1 too.
#
# version.txt CANNOT distinguish an MR#6 4.0 from a stock 4.0 (both report
# 4.0.x), so for 4.0+ we FEATURE-PROBE for MR#6
# (scripts/detect_env1_session_methods.gs) and apply the compile-path patch only
# when MR#6 is absent.  (Version is still read from version.txt, never the
# $GEMSTONE path -- CI installs to an unversioned /opt/gemstone/product, where a
# `case "$GEMSTONE" in *3.7*` test would silently skip the 3.7 patch.)
GS_VERSION=$(grep -oE '[0-9]+\.[0-9]+\.[0-9]+' "$GEMSTONE/version.txt" 2>/dev/null | head -1)
echo "GemStone version: ${GS_VERSION:-unknown} (from $GEMSTONE/version.txt)"
case "$GS_VERSION" in
    3.7.*)
        echo "GemStone 3.7.x detected -- applying Grail env-1 session-method policy patch (3.7 variant)..."
        LC_ALL=C topaz -lq -S scripts/session_methods_env1_base_37.gs || {
            echo "Error: env-1 session-method policy patch (3.7) failed."; exit 1; }
        ;;
    *)
        # 4.0 and later: rely on native MR #6 support if present; else (pre-MR#6
        # 4.0) apply Grail's env-1 compile-path patch.
        if LC_ALL=C topaz -lq -S scripts/detect_env1_session_methods.gs 2>/dev/null | grep -q 'GRAIL_MR6=yes'; then
            echo "GemStone ${GS_VERSION:-unknown}: MR #6 present -- env-1 session methods are native; no patch needed."
        else
            echo "GemStone ${GS_VERSION:-unknown}: env-1 session methods not native (pre-MR #6) -- applying Grail compile-path patch (4.0 variant)..."
            LC_ALL=C topaz -lq -S scripts/session_methods_env1_base_40.gs || {
                echo "Error: env-1 session-method policy patch (4.0) failed."; exit 1; }
        fi
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
