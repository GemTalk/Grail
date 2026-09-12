#!/bin/bash

# ===========================================================================
# Grail base setup -- run ONCE per extent, as SystemUser.
# ===========================================================================
# This installs the shared, extent-global infrastructure that an ordinary
# (non-SystemUser) .topazini user cannot create for itself.  After it has run and
# committed, ANY user can run ./install.sh with NO SystemUser step -- so several
# users can each install their own Grail (per-user session methods + Python*
# dictionaries) on ONE shared stone.
#
# ./install.sh runs this automatically when its probe finds no base on the
# extent, so on a fresh stone `./install.sh` alone is enough.  Run it directly
# only when you want the base step on its own (e.g. provisioning a stone before
# the per-user login accounts exist).
#
# NO Grail code goes in the base.  Since 3.7.x was dropped the only supported
# kernel is 4.0+, where MR #6 permits env-1 session methods on the restricted
# classes (GsNMethod / System / SymbolDictionary) and the 2/3/4-arg
# with:...performMethod: variants are kernel-native -- so ALL of Grail's
# kernel-class extensions are per-user session methods, filed by ./install.sh.
# What is left here is the irreducibly SystemUser part:
#
#   * Unicode comparison mode -- extent-global and kernel-enforced SystemUser-only.
#   * The base marker          -- a Globals key, which objectSecurityPolicyId 1
#                                 refuses to an ordinary user (SecurityError 2116).
#
# Both are refused outright to a per-user session, which is why this cannot
# simply be folded into install.sh's own topaz login: the split is about
# PRIVILEGE, not about idempotency (this script is idempotent).
#
# REQUIRES a 4.0 build of 2026-07-29 or later.  An older 4.0 lacks one or more of
# the three fixes above and ./install.sh will fail while filing the kernel
# extensions -- upgrade the product rather than reinstating the removed
# capability probes.
#
# Every step logs in as SystemUser, so this script does NOT require the per-user
# login accounts to exist: ./create_claude_users.sh may run before or after it.
# ./install.sh is the one that needs them.
#
# The stone + SystemUser password come from the SystemUser logins inside the
# .gs scripts (stone via .topazini `set gems`).  Assumes the stone is running.
# Idempotent.
# ===========================================================================

BASE_T0=$SECONDS
trap 'printf "TIMING | %-26s | %4ds\n" "TOTAL install_base.sh" "$((SECONDS - BASE_T0))"' EXIT

# Always source .setenv when it exists (see install.sh for why it is
# unconditional: .setenv, not the launching shell, decides which product +
# stone this checkout targets).
SCRIPT_DIR=$(cd "$(dirname "$0")" && pwd)
if [ -f "$SCRIPT_DIR/.setenv" ]; then
    # shellcheck disable=SC1091
    source "$SCRIPT_DIR/.setenv"
fi

if [ -z "$GEMSTONE" ]; then
    echo "Error: \$GEMSTONE is not set. Set it to your GemStone installation directory (e.g., /path/to/GemStone64Bit4.0.0-arch.Darwin)."
    exit 1
fi

if ! command -v topaz &>/dev/null; then
    echo "Error: 'topaz' is not on your \$PATH. Add \$GEMSTONE/bin to your PATH (e.g., export PATH=\$GEMSTONE/bin:\$PATH)."
    exit 1
fi

cd "$SCRIPT_DIR" || exit 1

# Report the product this is running against.  The three-part version is no
# longer a BRANCH -- 4.0+ is the only supported kernel -- but the rest of
# version.txt identifies the BINARY, which the version alone cannot.  CI runs
# `container.gemtalksystems.com/gemstone/gemstone/main:grail`, a MOVING tag, so
# every run logs "4.0.0" no matter which build it actually ran.  When a crash
# reproduces only in CI, the first question is which binary crashed, and without
# this the answer has to be reconstructed from image timestamps.  The Build:
# line carries the commit SHA, and the third line the branch.
GS_VERSION=$(grep -oE '[0-9]+\.[0-9]+\.[0-9]+' "$GEMSTONE/version.txt" 2>/dev/null | head -1)
echo "GemStone version: ${GS_VERSION:-unknown} (from $GEMSTONE/version.txt)"
sed 's/^/GemStone version.txt | /' "$GEMSTONE/version.txt" 2>/dev/null || true

# Refuse 3.7.x loudly rather than letting install.sh fail several minutes later
# while filing kernel extensions the 3.7 kernel will not accept.  Support for it
# was removed deliberately; 3.7 is published and could never be fixed in the base
# image, so it needed a shared SystemUser filing of every kernel extension --
# exactly the thing that stopped two users sharing a stone.
case "$GS_VERSION" in
    3.*)
        echo ""
        echo "Error: GemStone $GS_VERSION is not supported."
        echo "  Grail requires GemStone 4.0 (build 2026-07-29 or later)."
        echo "  Support for 3.7.x was removed; point \$GEMSTONE (in ./.setenv) at a 4.0 product."
        exit 1
        ;;
esac

echo "Setting Unicode comparison mode..."
./scripts/setUnicodeMode.sh || { echo "Error: setUnicodeMode.sh failed."; exit 1; }

# Base marker (SystemUser) -- the LAST step.  Writes a unique Grail-owned key
# (#GrailBaseInstalled) into Globals so ./install.sh's guard
# (scripts/check_base_installed.gs) has an unambiguous signal that the base setup
# completed -- rather than inferring it from Unicode mode, which a site could
# enable for its own reasons.  Last so it means "everything above succeeded"
# (this script exits on any earlier error).
echo "Setting the Grail base marker..."
LC_ALL=C topaz -lq -S scripts/set_base_marker.gs || {
    echo "Error: set_base_marker.gs failed."; exit 1; }

echo ""
echo "Base setup complete.  Any user can now run ./install.sh (no SystemUser)."
