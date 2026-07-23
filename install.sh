#!/bin/bash

# This script assumes a stone is already running per the stone name defined in .topazini

# Wall-clock timing (portable bash SECONDS builtin).  An EXIT trap prints on
# every exit path -- success or the error branches below -- so CI logs show
# install vs. run_tests.sh split (they share one CI `run:` step).  Prefixed
# `TIMING |` to grep cleanly, matching scripts/run_tests.sh.
INSTALL_T0=$SECONDS
trap 'printf "TIMING | %-26s | %4ds\n" "TOTAL install.sh" "$((SECONDS - INSTALL_T0))"' EXIT

# Auto-source .setenv when $GEMSTONE isn't in the environment.  Lets
# ``./install.sh`` succeed from a fresh shell without remembering to
# ``source .setenv`` first — a missing $SHIM_LIB_PATH at topaz time
# silently skips _sre / _statistics / _bisect / _crc32c / _shimtest
# registration, producing a half-installed Grail whose test suite then
# breaks in obscure ways downstream.
SCRIPT_DIR=$(cd "$(dirname "$0")" && pwd)
if [ -z "$GEMSTONE" ] && [ -f "$SCRIPT_DIR/.setenv" ]; then
    # shellcheck disable=SC1091
    source "$SCRIPT_DIR/.setenv"
fi

if [ -z "$GEMSTONE" ]; then
    echo "Error: \$GEMSTONE is not set. Set it to your GemStone installation directory (e.g., /path/to/GemStone64Bit3.7.x-arch.Darwin)."
    echo "  Tip: 'source .setenv' (if present at the project root) configures \$GEMSTONE + \$PATH."
    exit 1
fi
if [ -d /opt/gemstone/locks ]; then
  if [ -z "$GEMSTONE_GLOBAL_DIR" ]; then
    echo "using /opt/gemstone/locks"
  else
    echo "using GEMSTONE_GLOBAL_DIR = $GEMSTONE_GLOBAL_DIR"
  fi
else
  echo "directory /opt/gemstone/locks does not exist"
  if [ -z "$GEMSTONE_GLOBAL_DIR" ]; then
    echo "Error: \$GEMSTONE_GLOBAL_DIR is not set. Set it to the directory containing your GemStone locks and logs."
    exit 1
  else
    echo "using GEMSTONE_GLOBAL_DIR = $GEMSTONE_GLOBAL_DIR"
  fi
fi

if ! command -v topaz &>/dev/null; then
    echo "Error: 'topaz' is not on your \$PATH. Add \$GEMSTONE/bin to your PATH (e.g., export PATH=\$GEMSTONE/bin:\$PATH)."
    exit 1
fi
# Absolute path to the Grail project directory (this script's directory)
export GRAIL_DIR=$(cd "$(dirname "$0")" && pwd)
echo "Grail directory: $GRAIL_DIR"

# ---------------------------------------------------------------------------
# Guard: the shared base must already exist on this extent.
# ---------------------------------------------------------------------------
# install.sh is the PER-USER layer -- it logs in as an ordinary (non-SystemUser)
# .topazini user and so CANNOT create the SystemUser-owned base itself.  If the
# base is missing, install.gs would otherwise die deep in module init with a
# cryptic SecurityError (a per-user session cannot modify the policy-1 kernel
# method dictionaries).  Probe for a base marker as the .topazini user and fail
# fast -- before the shim build -- with a clear pointer to ./install_base.sh.
# Only a POSITIVE "absent" blocks; an inconclusive probe (login/stone failure,
# etc.) steps aside and lets install.gs surface that error itself.
echo "Checking for the shared Grail base..."
BASE_PROBE=$(LC_ALL=C topaz -lq -S "$GRAIL_DIR/scripts/check_base_installed.gs" 2>/dev/null)
if printf '%s\n' "$BASE_PROBE" | grep -q 'GRAIL_BASE=absent'; then
    echo ""
    echo "Error: the shared Grail base is not installed on this extent."
    echo "  install.sh is the per-user layer and runs as an ordinary user; it"
    echo "  cannot create the SystemUser-owned base (env-1 session-method support,"
    echo "  Unicode comparison mode, shared restricted-class methods)."
    echo ""
    echo "  Run the base setup ONCE per extent first (as SystemUser):"
    echo ""
    echo "      ./install_base.sh"
    echo ""
    echo "  then re-run ./install.sh."
    exit 1
fi

# Build the CPython shim User Action library (requires GEMSTONE)
export SHIM_LIB_PATH=""
if [ -n "$GEMSTONE" ]; then
    echo "Building CPython shim library..."
    make -C "$GRAIL_DIR/src/c/shim" clean all GEMSTONE="$GEMSTONE"
    case "$OSTYPE" in
      linux*)  export SHIM_LIB_PATH="$GRAIL_DIR/src/c/shim/libcpython_ua.so" ;;
      *)       export SHIM_LIB_PATH="$GRAIL_DIR/src/c/shim/libcpython_ua.dylib" ;;  # assume Darwin
    esac
    if [ ! -f "$SHIM_LIB_PATH" ]; then
        echo "Warning: CPython shim library build failed. CPythonShim tests will be skipped."
        export SHIM_LIB_PATH=""
    else
        echo "Building dynamic extension modules..."
        mkdir -p "$GRAIL_DIR/lib"
        make -C "$GRAIL_DIR/src/c/shim" dynmods
    fi
else
    echo "Warning: GEMSTONE not set. Skipping shim library build."
fi

echo "SHIM_LIB_PATH = $SHIM_LIB_PATH"

# Detect CPython shared library for embedded FFI integration
PYTHON_LIB_PATH=""
PYTHON_PREFIX=""
if command -v python3 &>/dev/null; then
    echo "Detecting CPython shared library..."
    eval "$("$GRAIL_DIR/scripts/detect-python.sh" "$GRAIL_DIR/lib")"
    if [ -n "$PYTHON_LIB_PATH" ]; then
        echo "Found CPython: $PYTHON_LIB_PATH"
        export PYTHON_LIB_PATH=$PYTHON_LIB_PATH
        export PYTHON_PREFIX=$PYTHON_PREFIX
    fi
fi
echo "PYTHON_LIB_PATH = $PYTHON_LIB_PATH"
echo "PYTHON_PREFIX = $PYTHON_PREFIX"

export PYTHON_PACKAGE_PATH="$GRAIL_DIR/src/python"
echo "PYTHON_PACKAGE_PATH = $PYTHON_PACKAGE_PATH"

# ---------------------------------------------------------------------------
# Kernel-class extensions: per-user (modern kernel) vs SystemUser (legacy).
# ---------------------------------------------------------------------------
# On a MODERN kernel (scripts/detect_modern_kernel.gs -> GRAIL_MODERN=yes) Grail's
# extensions to shared kernel classes (GsNMethod / System / SymbolDictionary /
# ExecBlock + Object's ___new___ bridge allocators) are filed PER-USER as session
# methods by install.gs, and the 2/3/4-arg performMethod: primitives are
# kernel-native -- so NO SystemUser step files them.  install.gs `input`s the
# generated include below; here we regenerate it from the capability probe.  On a
# LEGACY kernel the include is empty (install_base.gs already filed them as
# SystemUser) so install.gs's `input` is a no-op.
GEN_INC="$GRAIL_DIR/out/gen/kernel_class_extensions.gs"
mkdir -p "$GRAIL_DIR/out/gen"
GRAIL_MODERN=$(LC_ALL=C topaz -lq -S "$GRAIL_DIR/scripts/detect_modern_kernel.gs" 2>/dev/null \
    | grep -oE 'GRAIL_MODERN=(yes|no)' | head -1)
echo "Kernel capability: ${GRAIL_MODERN:-GRAIL_MODERN=? (probe failed -> legacy)}"
{
    echo "! GENERATED by install.sh -- do not edit, not committed (out/ is gitignored)."
    echo "! Kernel-class extensions filed per-user on a modern kernel."
    echo "! Detected: ${GRAIL_MODERN:-unknown}"
    if [ "$GRAIL_MODERN" = "GRAIL_MODERN=yes" ]; then
        echo "input src/smalltalk/Python/builtin_function_or_method.gs"
        echo "input src/smalltalk/Python/System.gs"
        echo "input src/smalltalk/Python/SymbolDictionary.gs"
        echo "input src/smalltalk/Python/ExecBlock.gs"
        echo "input src/smalltalk/Python/Object_perform_allocators.gs"
    else
        echo "! legacy kernel: these were filed as SystemUser by install_base.gs; nothing to do here."
    fi
} > "$GEN_INC"

# This is the PER-USER install: it runs entirely as the .topazini user, with NO
# SystemUser step.  The shared, user-independent base (GsPackagePolicy env-1
# support, Unicode mode, and -- on a legacy kernel -- the restricted-class
# methods) must already be installed on the extent -- run ./install_base.sh ONCE
# first.
LC_ALL=C topaz -lq -S src/smalltalk/install.gs

if [ $? -ne 0 ]; then
    echo ""
    echo "Topaz exited with an error. Some things to check:"
    echo "  - Is the GemStone stone running? (try: gslist)"
    echo "  - Is .topazini present and configured? (topaz looks in the current directory and ~/)"
    echo "  - Check install.out for details."
    exit 1
else
    echo ""
    echo "Successful install of Grail!"
fi
