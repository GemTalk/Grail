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
if [ ! -f smalltalk/.topazini ]; then
    cp topazini smalltalk/.topazini
fi
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
    at: #'builtins'         put: nil;
    yourself.
userProfile insertDictionary: symbolDictionary at: 1.
%
input Python.gs
run
PythonTestCase setPath.
Python
    at: #'None'             put: NoneType singleton;
    at: #'NotImplemented'   put: NotImplementedType singleton;
    at: #'True'             put: (bool ___value: true);
    at: #'False'            put: (bool ___value: false);
    at: #'builtins'         put: (Dictionary new); 
    yourself.
builtin_function_or_method new initialize.
%
output pop
errorCount
commit
logout
exit
EOF
