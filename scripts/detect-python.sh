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
# On failure (no usable Python found), variables are set to empty strings
# and the script exits 1.
#
# Optional argument: directory for the library hard link (default: ./lib)

LIB_DIR="${1:-$(pwd)/lib}"

# Grail's CPython FFI calls APIs introduced in Python 3.14 (PyInitConfig
# from PEP 741), 3.13 (Py_GetConstantBorrowed), and 3.12
# (PyErr_GetRaisedException), so anything older fails at runtime with
# "undefined symbol: PyInitConfig_Create".
MIN_MAJOR=3
MIN_MINOR=14

# Search order:
#   1. Versioned binaries on PATH (highest first), so we can skip past an
#      older `python3` that happens to be earlier on PATH (e.g. Apple's
#      Command Line Tools 3.9 ahead of Homebrew's 3.14).
#   2. Plain `python3` as a last resort.
#
# 3.20 is an arbitrary upper bound — bump it later if needed.
CANDIDATES=()
for minor in $(seq 20 -1 ${MIN_MINOR}); do
    CANDIDATES+=("python${MIN_MAJOR}.${minor}")
done
CANDIDATES+=("python3")

PYTHON_CMD=""
for cand in "${CANDIDATES[@]}"; do
    bin=$(command -v "$cand" 2>/dev/null) || continue
    [ -z "$bin" ] && continue
    if "$bin" -c "import sys; sys.exit(0 if sys.version_info >= (${MIN_MAJOR}, ${MIN_MINOR}) else 1)" 2>/dev/null; then
        PYTHON_CMD="$bin"
        break
    fi
done

if [ -z "$PYTHON_CMD" ]; then
    echo "Warning: no Python >= ${MIN_MAJOR}.${MIN_MINOR} found on PATH. CPython FFI will not be configured." >&2
    echo "         Grail's embedded-CPython tests need APIs added in 3.${MIN_MINOR}." >&2
    echo "PYTHON_LIB_PATH=''"
    echo "PYTHON_PREFIX=''"
    exit 1
fi

PYTHON_PREFIX=$("$PYTHON_CMD" -c "import sys; print(sys.base_prefix)")

# Find the actual shared library binary.
PYTHON_LIB_SOURCE=$("$PYTHON_CMD" -c "
import sys, os, sysconfig
libdir = sysconfig.get_config_var('LIBDIR') or ''
ldlib = sysconfig.get_config_var('LDLIBRARY') or ''
# Try multiple candidates in priority order:
#   1. <LIBDIR>/<LDLIBRARY> — Linux and most non-framework builds.
#   2. <base_prefix>/Python — python.org macOS framework installer.
#   3. <base_prefix>/Python3 — Apple Command Line Tools framework
#      (same layout as 2, but the binary is named 'Python3').
candidates = [
    os.path.join(libdir, ldlib),
    os.path.join(sys.base_prefix, 'Python'),
    os.path.join(sys.base_prefix, 'Python3'),
]
for candidate in candidates:
    if candidate and os.path.exists(candidate):
        print(os.path.realpath(candidate))
        break
")

# Build a simple library name for the hard link (e.g. libpython3.14.dylib)
PYTHON_LIB_NAME=$("$PYTHON_CMD" -c "
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
