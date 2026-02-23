#!/bin/bash
#
# Install embedded CPython integration for GemStone (standalone, no Grail dependency).
#
# Classes installed: CPythonLibrary, CPythonObject, CPythonTestCase
# All classes are installed in the UserGlobals dictionary.
#
# Prerequisites:
#   - GemStone must be running
#   - python3 must be available on PATH
#   - .setenv or setenv must exist (GemStone environment configuration)

DIR=$(cd "$(dirname "$0")" && pwd)

if [ ! -f .setenv ]; then
    cp setenv .setenv
fi
source .setenv
if [ ! -f ~/.topazini ]; then
    cp topazini ~/.topazini
fi

# Detect CPython shared library for FFI integration
eval "$("$DIR/detect-python.sh" "$DIR/lib")"

topaz -lq << EOF
errorCount
output push $DIR/install.out only
iferr 1 stk
iferr 2 output pop
iferr 3 stk
iferr 4 abort
iferr 5 logout
iferr 6 exit 1
fileformat utf8
set user DataCurator pass swordfish
login
! Forward references for circular dependencies
run
UserGlobals at: #'CPythonObject' ifAbsent: [ UserGlobals at: #'CPythonObject' put: nil ].
%
input $DIR/smalltalk/CPythonLibrary.gs
input $DIR/smalltalk/CPythonObject.gs
input $DIR/smalltalk/CPythonTestCase.gs
run
'$PYTHON_LIB_PATH' isEmpty ifFalse: [
	CPythonLibrary libraryPath: '$PYTHON_LIB_PATH'.
	CPythonLibrary pythonHomePath: '$PYTHON_PREFIX'.
	Transcript show: 'CPythonLibrary configured: $PYTHON_LIB_PATH'.
] ifTrue: [
	Transcript show: 'Warning: CPython library not found. CPythonLibrary will not work.'.
].
%
output pop
errorCount
commit
logout
exit 0
EOF
