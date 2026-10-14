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
  "The LAST CHARACTER of the end token, not its first.  endColumn is derived
  from endPosition, and PEP 657 wants the column one PAST the span's last
  character -- which the 1-based index of that character already is.  Taking
  the token's start instead truncated every span ending in a name, a number or
  a string to that token's first character: ``bad + other'' underlined
  ``bad + o'', while ``foo(x)'' and ``a[i]'' were right because ``)'' and ``]''
  are one character long."
  beginPosition := startToken position .
  beginLine := startToken line .
  endPosition := endToken endPosition ifNil: [endToken position] .
  "The end token's LAST line, which is its first for every token but a
  triple-quoted string.  Taking the first paired an endPosition on a later line
  with an endLine on an earlier one, and the span came out ENDING BEFORE IT
  STARTED: an expression closing with a triple-quoted string spanning lines 7
  and 8 reported line 7, columns 11..7."
  endLine := endToken endLine ifNil: [endToken line] .
%

category: 'Grail-accessors'
method: AbstractLocationNode
token: aToken
  "A node that IS one token: ConstantAst, NameAst, and the keyword statements.
  Its end is that token's end.

  Leaving the end nil cost these nodes their span entirely, not just its
  precision: ___pyPositionLiteralArray emits ``endLine'' into the position
  literal, the scan that reads it back wants four INTEGERS, and a nil there
  makes the whole literal unreadable.  So ``return undefined_name'' and
  ``x = undefined_name'' reported colno None and drew no caret line, where
  CPython underlines the name."
  beginPosition := aToken position .
  beginLine := aToken line .
  endPosition := aToken endPosition ifNil: [aToken position] .
  endLine := aToken endLine ifNil: [aToken line] .
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
  (self dynamicInstVarAt: #'___noColumns___') == true ifTrue: [^ nil].
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
  (self dynamicInstVarAt: #'___noColumns___') == true ifTrue: [^ nil].
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

category: 'Grail-traceback'
method: AbstractLocationNode
___pyPositionLiteralArray
	"Smalltalk source for a LITERAL 5-element PEP 657 position array covering
	THIS node -- { beginLine. colno. endLine. endColno. sourceLine } -- which is
	the shape BaseException>>___pushFrameFromPos___ already accepts alongside a
	bare beginLine Integer.  Storing one of these into ___curPos___ upgrades a
	line-only traceback frame to full column precision at the sites that care.

	A LITERAL (``#(...)'') rather than a brace array on purpose: every element
	is a compile-time constant, so the emitted store is a pointer assignment
	that allocates nothing.  That is what lets it sit inside a loop, exactly
	like the bare ``___curPos___ := <line>'' store it replaces (see
	AbstractNode>>___emitCurPosBefore:on:).

	``sourceLine'' is the RAW line including its indentation, because colno is
	ABSOLUTE and traceback.FrameSummary strips the text itself -- so the
	consumer's ``line[colno - indent : end_colno - indent]'' lines up.  It is
	guarded because it reads ``self module source'', and a node parsed outside
	a module (PythonParser parse: leaves every parent nil) has no module to
	ask; a nil source line degrades the frame, it must not break codegen."

	| ws src |
	ws := WriteStream on: String new.
	ws nextPutAll: '#('; print: beginLine; space.
	ws print: self column .
	ws space; print: self endLine ; space.
	ws print: self endColumn . 
	ws space.
	src := [self sourceLine] on: Error do: [:ex | nil].
	src isNil
		ifTrue: [ws nextPutAll: 'nil']
		ifFalse: [
			ws nextPut: $'.
			src do: [:c | c == $' ifTrue: [ws nextPut: $']. ws nextPut: c].
			ws nextPut: $'].
	ws nextPut: $).
	^ ws contents
%

category: 'Grail-other'
method: AbstractLocationNode
sourceLine
	| i j string lf |
	"A line-mapped module's text is an unparse whose lines the node's numbers
	no longer refer to: no line is better than the wrong one."
	([self module ___isLineMapped___] on: Error do: [:ex | false]) ifTrue: [^ nil].
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
method: AbstractLocationNode
setPositionFrom: aNode
  beginLine  := aNode beginLine .
  beginPosition := aNode beginPosition .
  endLine := aNode endLine .
  endPosition := aNode endPosition 
%

category: 'Grail-traceback'
method: AbstractLocationNode
___rebasePositionsBy: dPos line: dLine
	"Shift this node's own span from FIELD coordinates onto the MODULE's --
	see AbstractNode >> ___rebaseFragmentPositionsBy:line: for why.

	The memoized column/endColumn are dropped: they are derived by scanning the
	source back from beginPosition, so an answer computed before the shift
	describes the wrong file."

	beginPosition ifNotNil: [beginPosition := beginPosition + dPos].
	endPosition ifNotNil: [endPosition := endPosition + dPos].
	beginLine ifNotNil: [beginLine := beginLine + dLine].
	endLine ifNotNil: [endLine := endLine + dLine].
	self dynamicInstVarAt: #column put: nil.
	self dynamicInstVarAt: #endColumn put: nil.
%

category: 'Grail-traceback'
method: AbstractLocationNode
___decoratorNodeAt___: anIndex
	"The expression node of decorator anIndex (1 = the outermost, first in the
	source) of this def or class, or nil when it is not known -- see
	PythonParser >> ___recordDecoratorLines___:on: (#1406)."

	| nodes |
	nodes := self dynamicInstVarAt: #decoratorNodes.
	(nodes isNil or: [anIndex > nodes size]) ifTrue: [^ nil].
	^ nodes at: anIndex
%

category: 'Grail-traceback'
method: AbstractLocationNode
___decoratorLineAt___: anIndex
	"The source line of decorator anIndex, or nil (#1406)."

	| node |
	node := self ___decoratorNodeAt___: anIndex.
	(node isNil or: [(node respondsTo: #beginLine) not]) ifTrue: [^ nil].
	^ node beginLine
%

category: 'Grail-traceback'
method: AbstractLocationNode
___decoratedFirstLine___
	"The line CPython starts a decorated def's code object at, its first
	decorator's, or nil when it has none (#1406)."

	^ self ___decoratorLineAt___: 1
%

category: 'Grail-traceback'
method: AbstractLocationNode
___curPosStoreAvailable___
	"Whether the code being emitted has a ``___curPos___'' temp to store into
	-- the guard the statement emitters apply -- and, for a class built inside
	an IR-compiled function, whether its compiled-text helper declares one
	(ClassDefAst >> ___irHelperSourceWithSelector___:...).  A store with no
	temp to receive it is an undefined-symbol compile error."

	(SessionTemps current at: #'___grailIRHelperHasCurPos___' otherwise: nil)
		ifNotNil: [:___declared | ^ ___declared].
	^ CallAst functionBeingCompiled notNil or: [CallAst moduleBodyBeingCompiled]
%

category: 'Grail-traceback'
method: AbstractLocationNode
___mapDecorator___: aNode on: aStream do: aBlock
	"Evaluate aBlock, which emits a decorator's application, and record that
	text against the decorator's node in the method's position map (#1406).

	The map is where a frame's line comes from wherever there is no
	``___curPos___'' store to scan for -- a class built inside an
	IR-compiled function travels as a compiled-text helper whose frame
	reads only its map -- and elsewhere it answers the same line the store
	does.  The innermost recorded node containing the send wins, so a chain
	nests correctly: each decorator's range lies inside the next one out."

	| start |
	start := aStream position.
	aBlock value.
	(aNode notNil
		and: [(aStream isKindOf: PrettyWriteStream)
		and: [(aNode respondsTo: #___hasFullPositionSpan___)
		and: [aNode ___hasFullPositionSpan___
		and: [aNode ___hasFragmentPositions___ not]]]])
			ifTrue: [aStream mapPythonNode: aNode from: start + 1]
%

set compile_env: 0

category: 'Grail-line map'
method: AbstractLocationNode
___remapLines___: aMap
	"Map this node's own lines first, then its children's.  Its columns are
	the unparse's, not the tree's, and the tree's are not known here: they
	become unknown (nil), as CPython reports a position it does not have,
	rather than wrong."

	self dynamicInstVarAt: #'___noColumns___' put: true.
	beginLine isNil ifFalse: [beginLine := self ___mappedLine___: beginLine in: aMap].
	endLine isNil ifFalse: [endLine := self ___mappedLine___: endLine in: aMap].
	^ super ___remapLines___: aMap
%

category: 'Grail-line map'
method: AbstractLocationNode
___mappedLine___: aLine in: aMap
	"aLine of the unparse, as a line of the tree.  The map is the ast module's
	list, which is indexed by line number from 0 -- its first element stands
	for no line -- so line n is at n + 1 here.  A line past the map, or an
	entry the unparse had no statement line for, keeps its own number."

	| mapped |
	(aLine between: 1 and: aMap size - 1) ifFalse: [^ aLine].
	mapped := aMap at: aLine + 1.
	^ (mapped isKindOf: SmallInteger) ifTrue: [mapped] ifFalse: [aLine]
%
