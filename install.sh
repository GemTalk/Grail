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
%
output pop
errorCount
commit
logout
exit 0
EOF
