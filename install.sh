#!/bin/bash

# This script assumes a stone is already running per the stone name defined in .topazini

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

LC_ALL=C topaz -lq -S src/smalltalk/install.gs

if [ $? -ne 0 ]; then
    echo ""
    echo "Topaz exited with an error. Some things to check:"
    echo "  - Is the GemStone stone running? (try: gslist)"
    echo "  - Is .topazini present and configured? (topaz looks in the current directory and ~/)"
    echo "  - Check install.out for details."
    exit 1
fi
