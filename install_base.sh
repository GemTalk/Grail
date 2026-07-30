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

# 0. The ./.topazini user must EXIST before any capability probe runs.
# Both capability probes below (detect_env1_restricted_classes.gs and
# detect_modern_kernel.gs) log in as that user -- they must, because what they
# measure is what a NON-SystemUser installer may do.  A failed login prints
# nothing, which this script would otherwise read as a capability answer of "no"
# and drop to the LEGACY tier: filing all six kernel-extension files as shared
# SystemUser methods.  On a modern kernel that re-creates the shared base the
# per-user layer exists to avoid, and every later per-user ./install.sh then dies
# with SecurityError 2116 clearing a policy-1 method dictionary.
#
# On a FRESH extent the per-user accounts do not exist yet, so this is the normal
# first-run state, not an exotic one.  Fail loudly with the fix.
TOPAZINI_USER=$(LC_ALL=C topaz -lq -S scripts/check_topazini_user.gs 2>/dev/null \
    | grep -oE 'GRAIL_TOPAZINI_USER=[A-Za-z0-9_]+' | head -1)
if [ -z "$TOPAZINI_USER" ]; then
    echo "Error: the ./.topazini user cannot log in."
    echo ""
    echo "  Capability probes run AS that user, so without it this script would"
    echo "  silently choose the legacy shared-base layout -- which then makes every"
    echo "  per-user ./install.sh fail with SecurityError 2116."
    echo ""
    echo "  On a fresh extent, create the login accounts first:"
    echo "      ./create_claude_users.sh"
    echo "  Then re-run ./install_base.sh."
    echo ""
    echo "  If the accounts exist, check the stone is running (gslist) and that"
    echo "  ./.topazini has the right user/password and 'set gemstone'."
    exit 1
fi
echo "Installer user: ${TOPAZINI_USER#GRAIL_TOPAZINI_USER=}"

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
            # 1b. MR#6 is present, but does it actually reach RESTRICTED classes?
            # In 4.0.0 (build 2026-07-23) the env-aware predicate is dead code: the
            # 3-arg permitSessionMethodFor:selector:environmentId: keeps the OLD
            # unconditional restrictedClasses check ABOVE its new env-0-only one, so
            # GsNMethod / System / SymbolDictionary refuse env-1 session methods at
            # every environment.  Grail then has to file its extensions to those
            # classes as SHARED SystemUser methods, which multiple users on one
            # stone overwrite for each other.
            #
            # Probe the BEHAVIOUR (never the version), so a rebuilt base image that
            # answers correctly is detected automatically and the interim patch
            # simply stops being applied.
            if LC_ALL=C topaz -lq -S scripts/detect_env1_restricted_classes.gs 2>/dev/null \
                | grep -q 'GRAIL_ENV1_PERMITTED=yes'; then
                echo "  Restricted classes accept env-1 session methods -- no patch needed."
            else
                echo "  Restricted classes REFUSE env-1 session methods -- applying Grail's interim predicate patch..."
                LC_ALL=C topaz -lq -S scripts/fix_env1_restricted_classes.gs || {
                    echo "Error: fix_env1_restricted_classes.gs failed."; exit 1; }
                if LC_ALL=C topaz -lq -S scripts/detect_env1_restricted_classes.gs 2>/dev/null \
                    | grep -q 'GRAIL_ENV1_PERMITTED=yes'; then
                    echo "  Patch verified: restricted classes now accept env-1 session methods."
                else
                    echo "Error: patch applied but restricted classes still refuse env-1 session methods."
                    exit 1
                fi
            fi
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

# 3. Shared restricted-class methods (LEGACY kernels only).
# On a MODERN kernel (scripts/detect_modern_kernel.gs -> GRAIL_MODERN=yes) these
# move to PER-USER session methods filed by install.sh/install.gs, and the
# 2/3/4-arg performMethod: primitives are kernel-native -- so this SystemUser
# step is skipped entirely.  Only the Unicode-mode config above then remains
# SystemUser (it is kernel-enforced SystemUser-only + extent-global).  On a
# LEGACY kernel this files the shared restricted-class methods as before.
GRAIL_MODERN=$(LC_ALL=C topaz -lq -S scripts/detect_modern_kernel.gs 2>/dev/null \
    | grep -oE 'GRAIL_MODERN=(yes|no)' | head -1)
GRAIL_ENV1_PERMITTED=$(LC_ALL=C topaz -lq -S scripts/detect_env1_restricted_classes.gs 2>/dev/null \
    | grep -oE 'GRAIL_ENV1_PERMITTED=(yes|no)' | head -1)
echo "Kernel capability: ${GRAIL_MODERN:-GRAIL_MODERN=? (probe failed -> legacy)}"
echo "                   ${GRAIL_ENV1_PERMITTED:-GRAIL_ENV1_PERMITTED=? (probe failed -> no)}"
# Three tiers, because the two capabilities are INDEPENDENT and were previously
# collapsed into one all-or-nothing flag:
#
#   GRAIL_MODERN=yes           -- nothing shared: env-1 session methods reach the
#                                 restricted classes AND the wider performMethod:
#                                 arities are kernel-native.
#   GRAIL_ENV1_PERMITTED=yes   -- the four env-1 kernel-extension files go PER-USER;
#                                 only Object's env-0 dispatch stays shared, because
#                                 compiling a <primitive:> needs a privilege an
#                                 ordinary user lacks.  This is 4.0 today.
#   otherwise (legacy)         -- all six files shared, as before.  3.7.x lands here.
#
# Tiering on PERMITTED (the base image's own capability), not on RESTRICTED (which
# also requires that no shared copies are in the way): clearing those shared copies
# is this step's job, so gating on RESTRICTED would never let the handover start.
if [ "$GRAIL_MODERN" = "GRAIL_MODERN=yes" ]; then
    echo "Modern kernel -- skipping SystemUser filing entirely (all moves per-user via ./install.sh)."
elif [ "$GRAIL_ENV1_PERMITTED" = "GRAIL_ENV1_PERMITTED=yes" ]; then
    echo "Filing shared Object env-0 dispatch only (SystemUser); env-1 kernel extensions move per-user..."
    echo "NOTE: this REMOVES any shared env-1 methods on GsNMethod / System /"
    echo "      SymbolDictionary / ExecBlock.  Every user on this stone must re-run"
    echo "      ./install.sh afterwards to get their own copies."
    LC_ALL=C topaz -lq -S scripts/install_base_perform.gs || {
        echo "Error: install_base_perform.gs failed."; exit 1; }
else
    echo "Filing shared restricted-class methods (SystemUser)..."
    LC_ALL=C topaz -lq -S scripts/install_base.gs || {
        echo "Error: install_base.gs failed."; exit 1; }
fi

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
