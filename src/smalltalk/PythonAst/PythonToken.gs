! ------------------- Superclass check
run
Object ifNil: [self error: 'Object is not defined. Check file ordering.'].
%

! ------------------- Class definition for PythonToken
expectvalue /Class
doit
Object subclass: 'PythonToken'
  instVarNames: #( type value line column
                    endLine endColumn)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonAst
  options: #()

%

expectvalue /Class
doit
PythonToken comment:
'A lexical token produced by PythonTokenizer.

type is a symbol: #NAME, #NUMBER, #STRING, #OP, #KEYWORD,
  #NEWLINE, #NL, #INDENT, #DEDENT, #ENDMARKER.
value is the string content of the token.
line, column, endLine, endColumn track source location.

Hierarchy:
Object
  PythonToken(type value line column endLine endColumn)
'
%

expectvalue /Class
doit
PythonToken category: 'Grail-Parser'
%

! ===============================================================================
! PythonToken - Lexical token for Python source code
! ===============================================================================
! A simple value object representing a single token produced by PythonTokenizer.
! ===============================================================================

! ------------------- Remove existing behavior from PythonToken
removeallmethods PythonToken
removeallclassmethods PythonToken

set compile_env: 0

category: 'Grail-instance creation'
classmethod: PythonToken
type: aSymbol value: aString line: aLine column: aColumn

	^self type: aSymbol value: aString line: aLine column: aColumn endLine: aLine endColumn: aColumn + aString size
%

category: 'Grail-instance creation'
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

category: 'Grail-accessors'
method: PythonToken
column

	^column
%

category: 'Grail-accessors'
method: PythonToken
column: anInteger

	column := anInteger
%

category: 'Grail-accessors'
method: PythonToken
endColumn

	^endColumn
%

category: 'Grail-accessors'
method: PythonToken
endColumn: anInteger

	endColumn := anInteger
%

category: 'Grail-accessors'
method: PythonToken
endLine

	^endLine
%

category: 'Grail-accessors'
method: PythonToken
endLine: anInteger

	endLine := anInteger
%

category: 'Grail-testing'
method: PythonToken
isBytes

	^type == #BYTES
%

category: 'Grail-testing'
method: PythonToken
isEndMarker

	^type == #ENDMARKER
%

category: 'Grail-testing'
method: PythonToken
isKeyword: aString

	^type == #KEYWORD and: [value = aString]
%

category: 'Grail-testing'
method: PythonToken
isName

	^type == #NAME
%

category: 'Grail-testing'
method: PythonToken
isNewline

	^type == #NEWLINE or: [type == #NL]
%

category: 'Grail-testing'
method: PythonToken
isNumber

	^type == #NUMBER
%

category: 'Grail-testing'
method: PythonToken
isOp: aString

	^type == #OP and: [value = aString]
%

category: 'Grail-testing'
method: PythonToken
isString

	^type == #STRING
%

category: 'Grail-testing'
method: PythonToken
isFString

	^type == #FSTRING
%

category: 'Grail-accessors'
method: PythonToken
line

	^line
%

category: 'Grail-accessors'
method: PythonToken
line: anInteger

	line := anInteger
%

category: 'Grail-printing'
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

category: 'Grail-accessors'
method: PythonToken
type

	^type
%

category: 'Grail-accessors'
method: PythonToken
type: aSymbol

	type := aSymbol
%

category: 'Grail-accessors'
method: PythonToken
value

	^value
%

category: 'Grail-accessors'
method: PythonToken
value: anObject

	value := anObject
%
