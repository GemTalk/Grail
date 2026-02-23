#!/bin/bash
#
# Detect CPython shared library for FFI integration via GemStone CCallout.
#
# Outputs shell variable assignments to stdout. Source the output to use:
#   eval "$(./detect-python.sh)"
#   eval "$(./detect-python.sh /path/to/lib)"
#
# Variables set on success:
#   PYTHON_PREFIX    — base Python prefix (PYTHONHOME for embedded use)
#   PYTHON_LIB_PATH  — path to the shared library ready for CLibrary
#
# On failure (python3 not found), variables are set to empty strings.
#
# Optional argument: directory for the library hard link (default: ./lib)

LIB_DIR="${1:-$(pwd)/lib}"

PYTHON_CMD=$(command -v python3 2>/dev/null)
if [ -z "$PYTHON_CMD" ]; then
    echo "Warning: python3 not found. CPython FFI will not be configured." >&2
    echo "PYTHON_LIB_PATH=''"
    echo "PYTHON_PREFIX=''"
    exit 1
fi

PYTHON_PREFIX=$(python3 -c "import sys; print(sys.base_prefix)")

# Find the actual shared library binary.
# macOS Framework Python: <base_prefix>/Python
# Non-framework (Linux, etc.): <LIBDIR>/<LDLIBRARY>
PYTHON_LIB_SOURCE=$(python3 -c "
import sys, os, sysconfig
libdir = sysconfig.get_config_var('LIBDIR')
ldlib = sysconfig.get_config_var('LDLIBRARY')
candidate = os.path.join(libdir, ldlib)
if os.path.exists(candidate):
    print(os.path.realpath(candidate))
else:
    print(os.path.realpath(os.path.join(sys.base_prefix, 'Python')))
")

# Build a simple library name for the hard link (e.g. libpython3.14.dylib)
PYTHON_LIB_NAME=$(python3 -c "
import sys
ext = '.dylib' if sys.platform == 'darwin' else '.so'
print(f'libpython{sys.version_info.major}.{sys.version_info.minor}{ext}')
")

PYTHON_LIB_PATH="${LIB_DIR}/${PYTHON_LIB_NAME}"

# Create hard link (or copy) — needed because GemStone's CLibrary
# resolves symlinks and mangles the resulting path.
mkdir -p "$LIB_DIR"
ln -f "$PYTHON_LIB_SOURCE" "$PYTHON_LIB_PATH" 2>/dev/null || \
    cp "$PYTHON_LIB_SOURCE" "$PYTHON_LIB_PATH"

echo "PYTHON_PREFIX='${PYTHON_PREFIX}'"
echo "PYTHON_LIB_PATH='${PYTHON_LIB_PATH}'"
