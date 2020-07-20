! ------------------- Remove existing behavior from PyToken
expectvalue /Metaclass3       
doit
PyToken removeAllMethods.
PyToken class removeAllMethods.
%
! ------------------- Class methods for PyToken
set compile_env: 0
category: 'other'
classmethod: PyToken
fromString: aString

	^self basicNew
		initialize: aString;
		yourself
%
! ------------------- Instance methods for PyToken
set compile_env: 0
category: 'other'
method: PyToken
column

	^startColumn
%
category: 'other'
method: PyToken
initialize: aString

	| pieces range temp |
	pieces := aString subStrings: $:.
	temp := pieces at: 1.
	pieces := (pieces at: 2) subStrings: $'.
	string := pieces at: 2.
	name := (pieces at: 1) trimSeparators.
	temp := temp subStrings: $-.
	range := (temp at: 1) subStrings: $,.
	startLine := (range at: 1) asNumber.
	startColumn := (range at: 2) asNumber.
	range := (temp at: 2) subStrings: $,.
	stopLine := (range at: 1) asNumber.
	stopColumn := (range at: 2) asNumber.
%
category: 'other'
method: PyToken
line

	^startLine
%
category: 'other'
method: PyToken
printOn: aStream

	aStream
		print: startLine;
		nextPut: $,;
		print: startColumn;
		nextPut: $-;
		print: stopLine;
		nextPut: $,;
		print: stopColumn;
		nextPutAll: ': ';
		nextPutAll: name;
		nextPutAll: ' - ';
		print: string;
		yourself.
%
