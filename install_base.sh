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
# What gets installed depends on ONE test -- 4.0+ or 3.7.x:
#
#   4.0+   NOTHING of Grail's.  Only Unicode comparison mode (extent-global and
#          kernel-enforced SystemUser-only) and the base marker.  All five
#          kernel-class extension files are per-user session methods filed by
#          ./install.sh.  Needs a 4.0 build of 2026-07-29 or later.
#
#   3.7.x  The env-1 session-method policy patch, Unicode mode, AND the shared
#          filing of all six kernel-extension files -- 3.7 is published and
#          cannot be fixed in the base image.
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


# 1-3. Everything version-dependent, decided by ONE test: 4.0+ or 3.7.x.
#
# This replaced a set of behavioural capability probes.  Those existed only to
# bridge an interim period: a 4.0 build could not be told from version.txt alone
# whether it had MR #6, whether MR #6's env-aware predicate actually reached the
# restricted classes, and whether the wider-arity performMethod: variants were
# kernel-native.  The 2026-07-29 4.0 build settles all three, so the version IS
# the answer and the probes are gone (with the interim patches they selected).
#
#   4.0+   -- NO Grail code in the shared base.  MR #6 permits env-1 session
#             methods on GsNMethod / System / SymbolDictionary, and the 2/3/4-arg
#             with:...performMethod: variants are kernel-native, so all five
#             kernel-extension files are filed PER-USER by ./install.sh.  Only
#             Unicode comparison mode (extent-global, kernel-enforced SystemUser)
#             and the base marker happen here.
#
#             REQUIRES a 4.0 build of 2026-07-29 or later.  An older 4.0 lacks one
#             or more of those three fixes, and this script no longer detects or
#             patches around that -- ./install.sh would fail while filing the
#             kernel extensions.  Upgrade the product rather than reinstating the
#             probes.
#
#   3.7.x  -- unchanged, and it stays that way: 3.7 is published and cannot be
#             fixed, so it needs both the env-1 session-method policy patch (stock
#             3.7 wires session methods for env-0 only) and the SHARED filing of
#             all six kernel-extension files.
#
# Version comes from $GEMSTONE/version.txt, never the $GEMSTONE path -- CI
# installs to an unversioned /opt/gemstone/product, where a `case "$GEMSTONE" in
# *3.7*` test would silently skip the 3.7 patch.
#
# Every step below logs in as SystemUser, so this script does NOT need the
# per-user login accounts to exist.  That is why ./create_claude_users.sh may run
# before or after it.  ./install.sh is the one that needs them.
GS_VERSION=$(grep -oE '[0-9]+\.[0-9]+\.[0-9]+' "$GEMSTONE/version.txt" 2>/dev/null | head -1)
echo "GemStone version: ${GS_VERSION:-unknown} (from $GEMSTONE/version.txt)"

case "$GS_VERSION" in
    3.7.*)
        echo "GemStone 3.7.x -- applying the env-1 session-method policy patch..."
        LC_ALL=C topaz -lq -S scripts/session_methods_env1_base_37.gs || {
            echo "Error: env-1 session-method policy patch (3.7) failed."; exit 1; }

        echo "Setting Unicode comparison mode..."
        ./scripts/setUnicodeMode.sh || { echo "Error: setUnicodeMode.sh failed."; exit 1; }

        echo "Filing the shared kernel-class extensions (SystemUser)..."
        LC_ALL=C topaz -lq -S scripts/install_base.gs || {
            echo "Error: install_base.gs failed."; exit 1; }
        ;;
    *)
        echo "GemStone ${GS_VERSION:-unknown} (4.0+) -- no Grail code goes in the shared base."
        echo "  env-1 session methods on restricted classes: native (MR #6)"
        echo "  2/3/4-arg with:...performMethod:            : kernel-native"
        echo "  kernel-class extensions                     : filed PER-USER by ./install.sh"

        #   additions to GsTestCase, etc 
        LC_ALL=C topaz -lq -S scripts/install_base40.gs || {
            echo "Error: install_base40.gs failed."; exit 1; }

        echo "Setting Unicode comparison mode..."
        ./scripts/setUnicodeMode.sh || { echo "Error: setUnicodeMode.sh failed."; exit 1; }
        ;;
esac

# 4. Base marker (SystemUser) -- ALWAYS, on both kernels, as the LAST step.
# Writes a unique Grail-owned key (#GrailBaseInstalled) into Globals so
# ./install.sh's guard (scripts/check_base_installed.gs) has an unambiguous signal
# that the base setup completed -- rather than inferring it from Unicode mode,
# which a site could enable for its own reasons.  Last so it means "everything
# above succeeded" (this script exits on any earlier error).
echo "Setting the Grail base marker..."
LC_ALL=C topaz -lq -S scripts/set_base_marker.gs || {
    echo "Error: set_base_marker.gs failed."; exit 1; }

echo ""
echo "Base setup complete.  Any user can now run ./install.sh (no SystemUser)."
