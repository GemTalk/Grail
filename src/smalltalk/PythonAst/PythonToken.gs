! ------------------- Superclass check
run
Object ifNil: [self error: 'Object is not defined. Check file ordering.'].
%

! ------------------- Class definition for PythonToken
expectvalue /Class
doit
Object subclass: 'PythonToken'
  instVarNames: #( type value line position endPosition endLine) 
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
position tracks source location.
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
type: aSymbol value: aString line: aLine position: aPosition

	^self basicNew
		type: aSymbol  
                line: aLine
		value: aString 
		position: aPosition 
%

category: 'Grail-accessors'
method: PythonToken
endPosition
	"Source index of this token's LAST CHARACTER, or nil for a token built
	without one.

	Distinct from ``position'', which is the FIRST.  A node's extent is set
	from its first and last tokens (AbstractLocationNode >> from:to:), and
	using the last token's START truncated every span whose last token is
	more than one character: ``bad + other'' underlined ``bad + o''.  Spans
	ending in ``)'' or ``]'' were right, which is why the caret tests -- calls
	and subscripts, nearly all of them -- did not show it.

	Not derivable from ``value size'': a STRING token's value is its DECODED
	content, so quotes and escapes are already gone."

	^ endPosition
%

category: 'Grail-accessors'
method: PythonToken
endPosition: anInteger
	endPosition := anInteger
%

category: 'Grail-accessors'
method: PythonToken
endLine
	"Line this token's LAST CHARACTER is on, or nil for a token built without
	one.  Differs from ``line'' only for a token that spans lines, which in
	Python means a triple-quoted string or one with escaped newlines."

	^ endLine
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
type: aSymbol line: aLine value: aString position: aPosition
  type := aSymbol  .
  value := aString .
  line := aLine .
  position := aPosition .
%

category: 'Grail-accessors'
method: PythonToken
type

	^type
%

category: 'Grail-accessors'
method: PythonToken
position
	^ position
%
method: PythonToken
line
	^ line
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
