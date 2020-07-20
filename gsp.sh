
echo "This will reload your GemStone environment."
echo "Make sure you have saved all your edits!"
read -n 1 -s -r -p "Press any key to continue"
if [ ! -f smalltalk/.topazini ]; then
    cp topazini smalltalk/.topazini
fi
cd smalltalk
topaz -l << EOF
logout
iferr 1 stk
iferr 2 output pop
iferr 3 stk
iferr 4 abort
iferr 5 logout
iferr 6 exit
errorCount
output push ../GSP.out only
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
symbolDictionary := SymbolDictionary new name: aSymbol; yourself.
userProfile insertDictionary: symbolDictionary at: 1.
%
input Python.gs
output pop
errorCount
commit
logout
exit
EOF
