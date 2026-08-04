! ------------------- Superclass check
run
AbstractNode ifNil: [self error: 'AbstractNode is not defined. Check file ordering.'].
%

! ------------------- Class definition for AbstractLocationNode
expectvalue /Class
doit
AbstractNode subclass: 'AbstractLocationNode'
  instVarNames: #( beginLine beginPosition endLine endPosition)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonAst
  options: #()

%

expectvalue /Class
doit
AbstractLocationNode comment:
'https://docs.python.org/3/library/ast.html#ast.AST

Base class for AST nodes that include location information.

Instances of ast.expr and ast.stmt subclasses have lineno, col_offset,
end_lineno, and end_col_offset attributes. The lineno and end_lineno are
the first and last line numbers of source text span (1-indexed so the first
line is line 1) and the col_offset and end_col_offset are the corresponding
UTF-8 byte offsets of the first and last tokens that generated the node.

beginLine and endLine are one based.
position and endPosition are one based
'
%

expectvalue /Class
doit
AbstractLocationNode category: 'Grail-Parser'
%

! ------------------- Remove existing behavior from AbstractLocationNode
removeallmethods AbstractLocationNode
removeallclassmethods AbstractLocationNode

set compile_env: 0

category: 'Grail-accessors'
method: AbstractLocationNode
beginLine

	^beginLine
%
category: 'Grail-accessors'
method: AbstractLocationNode
from: startToken to: endToken
  beginPosition := startToken position .
  beginLine := startToken line .
  endPosition := endToken position .
  endLine := endToken line .
%

category: 'Grail-accessors'
method: AbstractLocationNode
token: aToken
  beginPosition := aToken position .
  beginLine := aToken line .
%

category: 'Grail-accessors'
method: AbstractLocationNode
position

	^beginPosition
%

category: 'Grail-accessors'
method: AbstractLocationNode
line

	^beginLine
%

category: 'Grail-accessors'
method: AbstractLocationNode
endLine
  ^ endLine ifNil:[ beginLine ]
%
category: 'Grail-accessors'
method: AbstractLocationNode
column
  "used by ___emitTracebackFrame...  in ComprehensionAst"
  "result is zero based"
  | src prevEolPos lf col |
  (self dynamicInstVarAt: #column) ifNotNil:[:v | ^ v ].
  src := self sourceString .
  lf := Character lf .
  prevEolPos := src indexOfLast: lf startingAt: beginPosition .
  col := beginPosition - prevEolPos - 1.
  self dynamicInstVarAt: #column put: col .
  ^ col  
%  
category: 'Grail-accessors'
method: AbstractLocationNode
endColumn
  "used by ___emitTracebackFrame...  in ComprehensionAst"
  "result is zero based plus 1 "
  | src prevEolPos lf col |
  endPosition ifNil:[ ^  self column ].
  (self dynamicInstVarAt: #endColumn) ifNotNil:[:v | ^ v ].
  src := self sourceString .
  lf := Character lf .
  prevEolPos := src indexOfLast: lf startingAt: endPosition .
  col := endPosition - prevEolPos .
  self dynamicInstVarAt: #endColumn put: col .
  ^ col  
%  
  
category: 'Grail-other'
method: AbstractLocationNode
printOn: aStream

	super printOn: aStream.
	aStream
		nextPut: $:;
		print: beginLine;
		yourself.
%

category: 'Grail-other'
method: AbstractLocationNode
sourceLine
	| i j string lf |
	string := self sourceString .
	i := 0.
  lf := Character lf .
	beginLine - 1 timesRepeat: [
		i := string indexOf: lf startingAt: i + 1.
	].
	j := string indexOf: lf startingAt: i + 1.
	j == 0 ifTrue: [j := string size].
	^string copyFrom: i + 1 to: j - 1
%
category: 'Grail-other'
method: AbstractLocationNode
sourceString
  | src |
	"``source'' may be raw Bytes (Utf8 needs decoding) , Utf16, or already a
	CharacterCollection (Unicoded16/Unicode7, e.g. a module loaded from a decoded
	string) -- decodeToUnicode only exists on the former."
  src := self module source.  
  src _isString ifFalse:[ src := src decodeToUnicode ].
  ^ src
%


method: AbstractLocationNode
beginLine: newValue
	beginLine := newValue
%
method: AbstractLocationNode
beginPosition
	^beginPosition
%
method: AbstractLocationNode
beginPosition: newValue
	beginPosition := newValue
%
method: AbstractLocationNode
endLine
	^endLine
%
method: AbstractLocationNode
endLine: newValue
	endLine := newValue
%
method: AbstractLocationNode
endPosition
	^endPosition
%
method: AbstractLocationNode
endPosition: newValue
	endPosition := newValue
%
