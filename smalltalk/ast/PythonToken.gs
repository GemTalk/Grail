! ===============================================================================
! PythonToken - Lexical token for Python source code
! ===============================================================================
! A simple value object representing a single token produced by PythonTokenizer.
! ===============================================================================

! ------------------- Remove existing behavior from PythonToken
removeallmethods PythonToken
removeallclassmethods PythonToken
! ------------------- Class methods for PythonToken
category: 'instance creation'
classmethod: PythonToken
type: aSymbol value: aString line: aLine column: aColumn endLine: anEndLine endColumn: anEndColumn

	^self basicNew
		type: aSymbol;
		value: aString;
		line: aLine;
		column: aColumn;
		endLine: anEndLine;
		endColumn: anEndColumn;
		yourself
%
category: 'instance creation'
classmethod: PythonToken
type: aSymbol value: aString line: aLine column: aColumn

	^self type: aSymbol value: aString line: aLine column: aColumn endLine: aLine endColumn: aColumn + aString size
%
! ------------------- Instance methods for PythonToken
category: 'accessors'
method: PythonToken
type

	^type
%
category: 'accessors'
method: PythonToken
type: aSymbol

	type := aSymbol
%
category: 'accessors'
method: PythonToken
value

	^value
%
category: 'accessors'
method: PythonToken
value: anObject

	value := anObject
%
category: 'accessors'
method: PythonToken
line

	^line
%
category: 'accessors'
method: PythonToken
line: anInteger

	line := anInteger
%
category: 'accessors'
method: PythonToken
column

	^column
%
category: 'accessors'
method: PythonToken
column: anInteger

	column := anInteger
%
category: 'accessors'
method: PythonToken
endLine

	^endLine
%
category: 'accessors'
method: PythonToken
endLine: anInteger

	endLine := anInteger
%
category: 'accessors'
method: PythonToken
endColumn

	^endColumn
%
category: 'accessors'
method: PythonToken
endColumn: anInteger

	endColumn := anInteger
%
category: 'testing'
method: PythonToken
isKeyword: aString

	^type == #KEYWORD and: [value = aString]
%
category: 'testing'
method: PythonToken
isOp: aString

	^type == #OP and: [value = aString]
%
category: 'testing'
method: PythonToken
isName

	^type == #NAME
%
category: 'testing'
method: PythonToken
isNumber

	^type == #NUMBER
%
category: 'testing'
method: PythonToken
isString

	^type == #STRING
%
category: 'testing'
method: PythonToken
isNewline

	^type == #NEWLINE or: [type == #NL]
%
category: 'testing'
method: PythonToken
isEndMarker

	^type == #ENDMARKER
%
category: 'printing'
method: PythonToken
printOn: aStream

	super printOn: aStream.
	aStream
		nextPut: $(;
		nextPutAll: type;
		nextPut: $,;
		print: value;
		nextPut: $).
%
