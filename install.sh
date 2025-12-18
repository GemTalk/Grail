#!/bin/bash

echo "This will reload your GemStone environment."
echo "Make sure you have saved all your edits!"
read -n 1 -s -r -p "Press any key to continue"
echo
echo
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

# Get the absolute path
PPRINTAST_ABSOLUTE=$(cd "$(dirname "$PPRINTAST_PATH")" && pwd)/$(basename "$PPRINTAST_PATH")
echo "Using pprintast at: $PPRINTAST_ABSOLUTE"
cd smalltalk
topaz -lq << EOF
errorCount
output push ../install.out only
iferr 1 stk
iferr 2 output pop
iferr 3 stk
iferr 4 abort
iferr 5 logout
iferr 6 exit
fileformat utf8
set user SystemUser pass swordfish
login
send String enableUnicodeComparisonMode
send Stream installPortableStreamImplementation
commit
logout
set user DataCurator pass swordfish
login
run
| aSymbol names userProfile symbolDictionary |
aSymbol := #'Python'.
userProfile := System myUserProfile.
names := userProfile symbolList names.
(names includes: aSymbol) ifTrue: [
	userProfile symbolList removeAtIndex: (names indexOf: aSymbol).
].
symbolDictionary := SymbolDictionary new
    name: aSymbol;
    at: #'None'             put: nil;
    at: #'NotImplemented'   put: nil;
    at: #'Ellipsis'         put: nil;
    at: #'True'             put: nil;
    at: #'False'            put: nil;
    at: #'Linearization'    put: nil;
    at: #'Instance'         put: nil;
    at: #'GlobalScope'      put: nil;
    "at: #'builtins'         put: nil;"
    yourself.
userProfile insertDictionary: symbolDictionary at: 1.
%
input Python.gs
run
PythonTestCase setPath.
Python
    at: #'None'             put: NoneType singleton;
    at: #'NotImplemented'   put: NotImplementedType singleton;
    at: #'True'             put: (bool basicNew ___value: 1; yourself);
    at: #'False'            put: (bool basicNew ___value: 0; yourself);
    "at: #'builtins'         put: Builtins singleton;"
    yourself.

Python
%
run
ModuleAst pprintast: '$PPRINTAST_ABSOLUTE'.
%
output pop
errorCount
commit
logout
exit
EOF
