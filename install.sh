#!/bin/bash

if [ ! -f .setenv ]; then
    cp setenv .setenv
fi
source .setenv
if [ ! -f ~/.topazini ]; then
    cp topazini ~/.topazini
fi

# Absolute path to the Grail project directory (this script's directory)
GRAIL_DIR=$(cd "$(dirname "$0")" && pwd)
echo "Grail directory: $GRAIL_DIR"

# Build the CPython shim User Action library (requires GEMSTONE)
SHIM_LIB_PATH=""
if [ -n "$GEMSTONE" ]; then
    echo "Building CPython shim library..."
    make -C "$GRAIL_DIR/c/shim" clean all GEMSTONE="$GEMSTONE"
    SHIM_LIB_PATH="$GRAIL_DIR/c/shim/libcpython_ua.dylib"
    if [ ! -f "$SHIM_LIB_PATH" ]; then
        echo "Warning: CPython shim library build failed. CPythonShim tests will be skipped."
        SHIM_LIB_PATH=""
    fi
else
    echo "Warning: GEMSTONE not set. Skipping shim library build."
fi

topaz -lq << EOF
errorCount
output push install.out only
iferr 1 stk
iferr 2 output pop
iferr 3 stk
iferr 4 abort
iferr 5 logout
iferr 6 exit 1
fileformat utf8
set user SystemUser pass swordfish
login
send String enableUnicodeComparisonMode
send Stream installPortableStreamImplementation
commit
logout
set user DataCurator pass swordfish
login
input smalltalk/install.gs
run
importlib grailDir: '$GRAIL_DIR'.
'$SHIM_LIB_PATH' isEmpty ifFalse: [
	CPythonShim libraryPath: '$SHIM_LIB_PATH'.
	System loadUserActionLibrary: '$SHIM_LIB_PATH'.
	importlib registerModule: '_statistics' with: _statistics ___instance___.
	importlib registerModule: '_bisect' with: _bisect ___instance___.
	importlib registerModule: '_crc32c' with: _crc32c ___instance___.
	importlib registerModule: '_shimtest' with: _shimtest ___instance___.
].
%
output pop
errorCount
commit
logout
exit 0
EOF
