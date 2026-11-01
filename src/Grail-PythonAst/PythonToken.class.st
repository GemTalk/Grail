"A lexical token produced by PythonTokenizer.

type is a symbol: #NAME, #NUMBER, #STRING, #OP, #KEYWORD,
  #NEWLINE, #NL, #INDENT, #DEDENT, #ENDMARKER.
value is the string content of the token.
position tracks source location.

"
Class {
	#name : 'PythonToken',
	#superclass : 'Object',
	#instVars : [
		'type',
		'value',
		'line',
		'position',
		'endPosition',
		'endLine',
		'fieldStarts',
		'openFieldAt',
		'openFieldInSpec',
		'templateSpec'
	],
	#category : 'Grail-Parser'
}

{ #category : 'Grail-instance creation' }
PythonToken class >> type: aSymbol value: aString line: aLine position: aPosition [

	^self basicNew
		type: aSymbol  
                line: aLine
		value: aString 
		position: aPosition 

]

{ #category : 'Grail-accessing' }
PythonToken >> beTemplateSpec [
	"This FSTRING token is the format spec of a field of a t-string.  It
	parses as an f-string -- a t-string's format_spec is a str -- but its
	errors name the t-string (isInTemplateString)."

	templateSpec := true

]

{ #category : 'Grail-accessors' }
PythonToken >> endLine [
	"Line this token's LAST CHARACTER is on, or nil for a token built without
	one.  Differs from ``line'' only for a token that spans lines, which in
	Python means a triple-quoted string or one with escaped newlines."

	^ endLine

]

{ #category : 'Grail-accessors' }
PythonToken >> endLine: anInteger [
	endLine := anInteger

]

{ #category : 'Grail-accessors' }
PythonToken >> endPosition [
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

]

{ #category : 'Grail-accessors' }
PythonToken >> endPosition: anInteger [
	endPosition := anInteger

]

{ #category : 'Grail-testing' }
PythonToken >> fieldErrorPrefix [
	"What a field error in this literal begins with: CPython's messages name
	the literal, ``t-string: expecting '}''' as against ``f-string: ...''."

	^ self isInTemplateString ifTrue: ['t-string: '] ifFalse: ['f-string: ']

]

{ #category : 'Grail-accessing' }
PythonToken >> fieldStarts [
	"For an FSTRING token: where each replacement field begins, in BOTH
	coordinate systems, as an OrderedCollection of
	``{ valueIndex. sourceOffset. line }''.

	A replacement field is re-parsed by a child PythonParser over the field text
	alone, so every node in it reports a position relative to that snippet.  This
	is the anchor that lets those positions be rebased onto the module: inside a
	field the tokenizer keeps the text VERBATIM (escapes are not decoded -- see
	tokenizeString), so from the field's first character onwards a value index
	and a source offset differ by a constant.  That is NOT true of the literal
	text between fields, where escapes are decoded, which is why the anchor has
	to be recorded per field as it is scanned rather than derived afterwards.

	nil for every other token."

	^ fieldStarts

]

{ #category : 'Grail-accessing' }
PythonToken >> fieldStarts: aCollection [
	fieldStarts := aCollection

]

{ #category : 'Grail-testing' }
PythonToken >> isAnyString [
	"Whether this is a string literal of any kind -- str, bytes, f-string or
	t-string -- all of which CPython's grammar reads as one run when they are
	adjacent."

	^ #(#STRING #BYTES #FSTRING #TSTRING) includes: type

]

{ #category : 'Grail-testing' }
PythonToken >> isBytes [

	^type == #BYTES

]

{ #category : 'Grail-testing' }
PythonToken >> isEndMarker [

	^type == #ENDMARKER

]

{ #category : 'Grail-testing' }
PythonToken >> isFString [

	^type == #FSTRING

]

{ #category : 'Grail-testing' }
PythonToken >> isInTemplateString [
	"A t-string, or the format spec of one of its fields (beTemplateSpec)."

	^ self isTString or: [templateSpec == true]

]

{ #category : 'Grail-testing' }
PythonToken >> isKeyword: aString [

	^type == #KEYWORD and: [value = aString]

]

{ #category : 'Grail-testing' }
PythonToken >> isName [

	^type == #NAME

]

{ #category : 'Grail-testing' }
PythonToken >> isNewline [

	^type == #NEWLINE or: [type == #NL]

]

{ #category : 'Grail-testing' }
PythonToken >> isNumber [

	^type == #NUMBER

]

{ #category : 'Grail-testing' }
PythonToken >> isOp: aString [

	^type == #OP and: [value = aString]

]

{ #category : 'Grail-testing' }
PythonToken >> isOpenInFormatSpec [
	"Whether this f-string ended inside its last field's format spec."

	^ openFieldInSpec == true

]

{ #category : 'Grail-testing' }
PythonToken >> isString [

	^type == #STRING

]

{ #category : 'Grail-testing' }
PythonToken >> isTString [
	"PEP 750 template string: scanned like an f-string, parsed into a Template."

	^type == #TSTRING

]

{ #category : 'Grail-accessors' }
PythonToken >> line [
	^ line

]

{ #category : 'Grail-accessors' }
PythonToken >> openFieldAt [
	"Where CPython locates the error of this f-string's open last field, or
	nil when every field closed."

	^ openFieldAt

]

{ #category : 'Grail-accessors' }
PythonToken >> openFieldAt: aPosition inSpec: aBoolean [
	"This f-string ended with its last replacement field open, in its format
	spec when aBoolean: CPython's error for it is located at aPosition."

	openFieldAt := aPosition.
	openFieldInSpec := aBoolean

]

{ #category : 'Grail-accessors' }
PythonToken >> position [
	^ position

]

{ #category : 'Grail-printing' }
PythonToken >> printOn: aStream [

	super printOn: aStream.
	aStream
		nextPut: $(;
		nextPutAll: type;
		nextPut: $,;
		print: value;
		nextPut: $).

]

{ #category : 'Grail-accessors' }
PythonToken >> type [

	^type

]

{ #category : 'Grail-accessors' }
PythonToken >> type: aSymbol line: aLine value: aString position: aPosition [
  type := aSymbol  .
  value := aString .
  line := aLine .
  position := aPosition .

]

{ #category : 'Grail-accessors' }
PythonToken >> value [

	^value

]

{ #category : 'Grail-accessors' }
PythonToken >> value: anObject [

       value := anObject

]
