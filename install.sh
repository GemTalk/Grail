#!/bin/bash

if [ ! -f .setenv ]; then
    cp setenv .setenv
fi
source .setenv
if [ ! -f ~/.topazini ]; then
    cp topazini ~/.topazini
fi

# Check for pprintast and install if necessary
echo "Checking for pprintast..."
if [ -d .venv ]; then
    PPRINTAST_PATH=".venv/bin/pprintast"
    if [ ! -f "$PPRINTAST_PATH" ]; then
        echo "pprintast not found in virtual environment, installing..."
        .venv/bin/pip install pprintast
    fi
else
    # Check if pprintast is available in the system
    if ! command -v pprintast &> /dev/null; then
        echo "Warning: pprintast not found. Please install it with: pip install pprintast"
        echo "Or create a virtual environment with: python3 -m venv .venv && .venv/bin/pip install pprintast"
        exit 1
    fi
    PPRINTAST_PATH=$(which pprintast)
fi

# Get the absolute path to pprintast
PPRINTAST_ABSOLUTE=$(cd "$(dirname "$PPRINTAST_PATH")" && pwd)/$(basename "$PPRINTAST_PATH")
echo "Using pprintast at: $PPRINTAST_ABSOLUTE"

# Absolute path to the Grail project directory (this script's directory)
GRAIL_DIR=$(cd "$(dirname "$0")" && pwd)
echo "Grail directory: $GRAIL_DIR"

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
importlib pprintast: '$PPRINTAST_ABSOLUTE'.
importlib grailDir: '$GRAIL_DIR'.
%
output pop
errorCount
commit
logout
exit 0
EOF
