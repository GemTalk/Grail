! ------------------- Remove existing behavior from file
expectvalue /Metaclass3       
doit
file removeAllMethods.
file class removeAllMethods.
%
! ------------------- Class methods for file
set compile_env: 0
category: 'other'
classmethod: file
with: aGsFile

	^ self basicNew
		initialize: aGsFile;
		yourself
%
! ------------------- Instance methods for file
set compile_env: 0
category: 'other'
method: file
__dict__

	| sd |
	sd := SymbolDictionary new. "TODO: use singleton approach"
	sd at: #'read' put: [:arguments :keywords :scope | self read].
	^ sd
%
category: 'other'
method: file
call: aSymbol withArguments: anArray keywords: aSymbolDictionary scope: aScope

	^ (self __getattribute__ value: aSymbol) value: anArray value: aSymbolDictionary value: aScope
%
category: 'other'
method: file
initialize: aGsFile

	fileObject := aGsFile.
%
category: 'other'
method: file
read
"read(size=-1)
Read and return at most size characters from the stream as a single str. If size is negative or None, reads until EOF."

	^ fileObject contentsAsUtf8 decodeToUnicode
%
