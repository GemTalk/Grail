"A recursive descent parser for Python source code.

Takes a Python source string and produces an AST (Abstract Syntax Tree)
composed of the existing AST node classes (ModuleAst, ExprAst, BinOpAst, etc.).

Usage:
  PythonParser parse: 'x = 1 + 2'
  => returns a ModuleAst

Hierarchy:
Object
  PythonParser(source tokens position)

"
Class {
	#name : 'PythonParser',
	#superclass : 'Object',
	#instVars : [
		'source',
		'tokens',
		'position',
		'variableStack',
		'classNesting',
		'writeStack',
		'paramStack',
		'annotatedStack',
		'compTargetStack',
		'ownReadStack',
		'blockingStack',
		'nonlocalStack',
		'globalStack',
		'inCompTarget',
		'underscoreDefCount',
		'underscoreCurrentName',
		'readStack',
		'walrusAllowed',
		'inWalrusValue',
		'walrusRefusal',
		'mangleClassStack',
		'blockHeader',
		'barryAsFlufl',
		'evalInput',
		'tabErrorPosition',
		'futureImports',
		'expressionHead',
		'openExpressions',
		'specFieldStarts'
	],
	#category : 'Grail-Parser'
}

{ #category : 'Grail-parsing' }
PythonParser class >> ___endOfLinePositionIn___: aSource at: aPosition [
	"The index one PAST the last character of the line containing aPosition.

	An unindent mismatch is reported at END OF LINE by CPython -- offset 10 for a
	nine-character line -- so the caret sits after the statement rather than on
	the whitespace that was wrong."

	| size pos |
	aSource isNil ifTrue: [^ aPosition].
	size := aSource size.
	pos := aPosition.
	(pos isKindOf: Integer) ifFalse: [^ aPosition].
	pos < 1 ifTrue: [pos := 1].
	[(pos <= size) and: [((aSource at: pos) == Character lf) not]]
		whileTrue: [pos := pos + 1].
	^ pos

]

{ #category : 'Grail-parsing' }
PythonParser class >> ___fillSyntaxErrorLocation___: anError source: aSource at: aPosition [
	"Give a location-less SyntaxError one, from a position in the source.

	WHY AT A BOUNDARY AND NOT AT THE RAISE SITES.  There are 42 of them across
	PythonParser, PythonTokenizer and AbstractNode, and they raise with
	``SyntaxError signal:'' -- a Smalltalk signal that carries a messageText and
	no Python location, which is why compile() and exec() answered a bare
	``SyntaxError: invalid syntax'' with no source block for a caret to sit
	under.  Several of those sites have no token in scope at all (''Unknown
	operator'', ''Expected comparison operator''), so there is no position to
	pass even if every one were rewritten.  Filling it in where the parse is
	entered covers all of them, including the ones that could not have been
	fixed individually.

	IDEMPOTENT, and that is what makes it safe to layer over the sites that DO
	report a location: ___signalDeclarationSyntaxError___ builds its own, and a
	present lineno is left alone.  So a site can be given a precise location
	later without this having to change.

	end_lineno / end_offset are set, not left nil, and the reason is the
	renderer: with end_lineno unset a caret line underlines to the END of the
	line, which is right for a hand-built SyntaxError and wrong for a parse
	error -- CPython reports end_offset = offset + 1 for these and draws exactly
	one caret."

	| loc |
	anError isNil ifTrue: [^ anError].
	"A location already present wins; only an absent one is filled."
	[(anError @env0:dynamicInstVarAt: #'lineno') isNil ifFalse: [^ anError]]
		@env0:on: AbstractException do: [:ex | ex @env0:return: nil].
	loc := self ___sourceLocationIn___: aSource at: aPosition.
	loc isNil ifTrue: [^ anError].
	[anError @env0:dynamicInstVarAt: #'filename' put: '<string>'.
	 anError @env0:dynamicInstVarAt: #'lineno' put: (loc @env0:at: 1).
	 anError @env0:dynamicInstVarAt: #'offset' put: (loc @env0:at: 2).
	 anError @env0:dynamicInstVarAt: #'text' put: (loc @env0:at: 3).
	 anError @env0:dynamicInstVarAt: #'end_lineno' put: (loc @env0:at: 1).
	 anError @env0:dynamicInstVarAt: #'end_offset' put: ((loc @env0:at: 2) + 1)]
		@env0:on: AbstractException do: [:ex | ex @env0:return: nil].
	^ anError

]

{ #category : 'Grail-parsing' }
PythonParser class >> ___futureFeatures___ [
	"The names a future statement may import (Include/cpython/compile.h:37-46)."

	^ #(#'nested_scopes' #'generators' #'division' #'absolute_import'
		#'with_statement' #'print_function' #'unicode_literals'
		#'barry_as_FLUFL' #'generator_stop' #'annotations')

]

{ #category : 'Grail-parsing' }
PythonParser class >> ___indexIn___: aSource line: aLine offset: anOffset [
	"The 1-based character index of 1-based line aLine and offset anOffset in
	aSource -- the inverse of ___sourceLocationIn___:at:."

	| line lineStart |
	line := 1.
	lineStart := 1.
	[line < aLine and: [lineStart <= aSource size]] whileTrue: [
		(aSource at: lineStart) == Character lf ifTrue: [line := line + 1].
		lineStart := lineStart + 1].
	^ lineStart + anOffset - 1

]

{ #category : 'Grail-parsing' }
PythonParser class >> ___lineStartPositionIn___: aSource at: aPosition [
	"The index of the FIRST character of the line containing aPosition.

	CPython reports ``unexpected indent'' at column 1, not at the column the
	indent reached -- and the column is load-bearing, because column 1 on an
	indented line makes the renderer's colno negative and so suppresses the
	caret line, which is the three-line render CPython produces."

	| size pos |
	aSource isNil ifTrue: [^ aPosition].
	(aPosition isKindOf: Integer) ifFalse: [^ aPosition].
	size := aSource size.
	pos := aPosition.
	pos > size ifTrue: [pos := size].
	pos < 1 ifTrue: [^ 1].
	[(pos > 1) and: [((aSource at: pos - 1) == Character lf) not]]
		whileTrue: [pos := pos - 1].
	^ pos

]

{ #category : 'Grail-parsing' }
PythonParser class >> ___signal___: aClass message: aMessage in: aSource from: aStart to: anEnd [
	"Raise aClass located as CPython locates its parser errors: from the 1-based
	source index aStart to the EXCLUSIVE index anEnd, as lineno / offset /
	end_lineno / end_offset, all 1-based and in characters.  An anEnd of nil
	means a point (end_offset = offset, the shape CPython's tokenizer gives).

	Every located error the parser raises goes through here, so a position is
	worked out in one place: against the RAW line, leading indentation and
	non-ASCII characters included, which is what 3.14.8's gh-156894 fixed in
	CPython for errors that cover a range."

	| loc endLoc locTuple endLine endOffset |
	loc := self ___sourceLocationIn___: aSource at: aStart.
	loc isNil ifTrue: [^ aClass signal: aMessage].
	anEnd isNil
		ifTrue: [endLine := loc @env0:at: 1. endOffset := loc @env0:at: 2]
		ifFalse: [
			"A range ending just past a NEWLINE ends on the newline's own line,
			one column after it -- CPython's NEWLINE token is one character
			wide.  Past the end of the source (the implicit newline at end of
			input) it counts on from the last column."
			(anEnd > (aSource size + 1))
				ifTrue: [
					endLoc := self ___sourceLocationIn___: aSource at: aSource size + 1.
					endLine := endLoc @env0:at: 1.
					endOffset := (endLoc @env0:at: 2) + (anEnd - aSource size - 1)]
				ifFalse: [
					((anEnd > 1) and: [(anEnd - 1) >= aStart
						and: [(aSource at: anEnd - 1) == Character lf]])
						ifTrue: [
							endLoc := self ___sourceLocationIn___: aSource at: anEnd - 1.
							endLine := endLoc @env0:at: 1.
							endOffset := (endLoc @env0:at: 2) + 1]
						ifFalse: [
							endLoc := self ___sourceLocationIn___: aSource at: anEnd.
							endLoc isNil
								ifTrue: [endLine := loc @env0:at: 1. endOffset := (loc @env0:at: 2) + 1]
								ifFalse: [endLine := endLoc @env0:at: 1. endOffset := endLoc @env0:at: 2]]]].
	locTuple := Array @env0:new: 6.
	locTuple @env0:at: 1 put: '<string>'.
	locTuple @env0:at: 2 put: (loc @env0:at: 1).
	locTuple @env0:at: 3 put: (loc @env0:at: 2).
	locTuple @env0:at: 4 put: (loc @env0:at: 3).
	locTuple @env0:at: 5 put: endLine.
	locTuple @env0:at: 6 put: endOffset.
	^ aClass @env1:___signalNew___:
		(Array @env0:with: aMessage with: (tuple @env0:withAll: locTuple))
		kw: nil

]

{ #category : 'Grail-parsing' }
PythonParser class >> ___signalLocated___: aClass message: aMessage in: aSource at: aPosition endOffset: anEndOffset [
	"Raise aClass with a full Python location derived from a source position.

	aClass, not always SyntaxError, because an indentation problem is an
	IndentationError in CPython and the class is observable: test_bad_indentation
	asks for IndentationError specifically, and ``except IndentationError'' is a
	thing people write.

	anEndOffset is passed through LITERALLY rather than derived, because CPython
	uses it as a signal and not only as a span.  -1 means ``draw one caret'' for an
	unindent mismatch; 0 means the same for an unclosed bracket.  Both look like
	mistakes in the data and are what CPython reports; the renderer normalises
	them to offset + 1."

	| loc locTuple |
	loc := self ___sourceLocationIn___: aSource at: aPosition.
	loc isNil ifTrue: [^ aClass signal: aMessage].
	locTuple := Array @env0:new: 6.
	locTuple @env0:at: 1 put: '<string>'.
	locTuple @env0:at: 2 put: (loc @env0:at: 1).
	locTuple @env0:at: 3 put: (loc @env0:at: 2).
	locTuple @env0:at: 4 put: (loc @env0:at: 3).
	locTuple @env0:at: 5 put: (loc @env0:at: 1).
	locTuple @env0:at: 6 put: anEndOffset.
	^ aClass @env1:___signalNew___:
		(Array @env0:with: aMessage with: (tuple @env0:withAll: locTuple))
		kw: nil

]

{ #category : 'Grail-parsing' }
PythonParser class >> ___signalUnclosedBracket___: aChar in: aSource at: aPosition [
	"CPython's message and CPython's location for a bracket that is never closed.

	Class-side and on the PARSER rather than the tokenizer because the location
	machinery lives here (___sourceLocationIn___:at:), and the tokenizer is filed
	after this class, so the send is a backward reference.

	end_offset is 0, which looks like a mistake and is exactly what CPython
	reports.  The renderer turns an end_offset that is 0 into offset + 1, so it
	draws one caret -- under the bracket."

	^ self ___signalLocated___: SyntaxError
		message: (String with: $') , aChar asString , (String with: $') , ' was never closed'
		in: aSource at: aPosition endOffset: 0

]

{ #category : 'Grail-parsing' }
PythonParser class >> ___sourceLocationIn___: aSource at: aPosition [
	"{ lineno . offset . lineText } for a 1-based character index into aSource,
	or nil if it cannot be computed.

	CPython's shape, measured rather than assumed: lineno and offset are both
	1-BASED, offset counts from the start of the line against the RAW line
	(leading indentation included), and text is the line WITH its trailing
	newline.  For ``    return x!'' CPython reports offset 13 -- the ``!'' at
	column 13 of the indented line, not column 9 of the stripped one.

	The existing ___signalDeclarationSyntaxError___ reported the raw source INDEX as
	the offset, with a comment that a real column ``would need a line-start
	table''.  This is that table, computed on demand: a syntax error is raised
	at most once per parse, so one scan of the source costs nothing worth
	optimising, and nothing needs to be maintained as the parser advances.

	A position one past the end is legal and common -- it is how CPython points
	at end-of-line for a statement that ran out of tokens (``x = 5 | 4 |''
	reports offset 12 against an 11-character line)."

	| pos size lineNo lineStart lineEnd |
	aSource isNil ifTrue: [^ nil].
	aPosition isNil ifTrue: [^ nil].
	(aPosition isKindOf: Integer) ifFalse: [^ nil].
	size := aSource size.
	pos := aPosition.
	pos < 1 ifTrue: [pos := 1].
	pos > (size + 1) ifTrue: [pos := size + 1].
	lineNo := 1.
	lineStart := 1.
	1 to: pos - 1 do: [:i |
		((aSource at: i) == Character lf) ifTrue: [
			lineNo := lineNo + 1.
			lineStart := i + 1]].
	lineEnd := lineStart.
	[(lineEnd <= size) and: [((aSource at: lineEnd) == Character lf) not]]
		whileTrue: [lineEnd := lineEnd + 1].
	^ Array @env0:with: lineNo
		with: pos - lineStart + 1
		with: (aSource copyFrom: lineStart to: (lineEnd min: size))

]

{ #category : 'Grail-parsing' }
PythonParser class >> integerFrom: digits radix: radix [
	"Convert digits (no prefix, no underscores) to an Integer in radix.
	Hand-rolled instead of ('16r' , digits) asInteger because a host
	extent (e.g. a GLASS image) may override CharacterCollection>>
	asInteger with Squeak semantics — 'first run of decimal digits in
	the string' — which returns the RADIX (16) for '16r3F'.  Pure
	codePoint arithmetic depends on no overridable String/Number
	protocol.  Used for 0x/0o/0b literals, \x and \u string escapes,
	and html's &#x...; entities."

	| value |
	value := 0.
	digits do: [:c |
		| cp dv |
		cp := c codePoint.
		dv := (cp >= 48 and: [cp <= 57]) ifTrue: [cp - 48] ifFalse: [
			(cp >= 65 and: [cp <= 90]) ifTrue: [cp - 55] ifFalse: [
			(cp >= 97 and: [cp <= 122]) ifTrue: [cp - 87] ifFalse: [-1]]].
		(dv < 0 or: [dv >= radix]) ifTrue: [
			SyntaxError signal: 'invalid digit ' , c asString , ' for radix ' , radix printString].
		value := value * radix + dv].
	^ value

]

{ #category : 'Grail-parsing' }
PythonParser class >> parse: aString [
	"Parse Python source into a ModuleAst.

	The handler is what gives a SyntaxError its location.  ``source:'' TOKENIZES,
	so a tokenizer error is raised inside this same protected block and gets the
	same treatment; both are enriched from wherever the failure was looking.
	``pass'' re-signals the very same exception object, so a Python ``except
	SyntaxError as e'' sees the instance the parser raised, now with its fields
	filled in."

	^ self parse: aString evalInput: false

]

{ #category : 'Grail-parsing' }
PythonParser class >> parse: aString evalInput: isEvalInput [
	"parse:, by CPython's eval rule when isEvalInput is true (parseEvalInput:).

	A TabError the tokenizer noted (PythonTokenizer >> handleIndentation:) is
	raised HERE, in the order CPython's lazy tokenizer would meet it: an error
	the parser finds before that line stands, and anything else -- an error at
	or after it, or a parse that succeeds -- is the TabError.

	The source is read with universal newlines, as the tokenizer reads it, so
	that an error is located in the text its tokens' positions count
	(PythonParser >> source:)."

	| parser text |
	text := PythonTokenizer translateNewlines: aString.
	parser := self basicNew.
	parser ___evalInput___: isEvalInput.
	^ [ | module |
		module := parser source: text; parseModule.
		parser ___signalPendingTabError___.
		parser ___checkFutureImportsIn___: module.
		module]
		on: SyntaxError
		do: [:ex |
			(parser ___tabErrorPrecedes___: ex) ifTrue: [parser ___signalPendingTabError___].
			self ___fillSyntaxErrorLocation___: ex
				source: text
				at: parser ___currentSourcePosition___.
			ex pass]

]

{ #category : 'Grail-parsing' }
PythonParser class >> parseEvalInput: aString [
	"Parse eval() input or compile(..., 'eval') source by CPython's eval rule,
	``eval: expressions NEWLINE* ENDMARKER'' (___parseEvalInput___), into a
	ModuleAst whose body is the one expression.  The rule is this parser's
	own, so it reaches neither an inner parser (an f-string's) nor a parse
	made while a handler for this one's SyntaxError runs (ModuleAst class >>
	parseSource:allowTopLevelAwait:evalInput:)."

	^ self parse: aString evalInput: true

]

{ #category : 'Grail-parsing' }
PythonParser >> ___atEvalInputEnd___ [
	"Whether eval input has nothing left but newlines and its end marker.  A
	NEWLINE can only trail it -- inside brackets the tokenizer emits none --
	so ``1,'' ends at the comma rather than parsing the NEWLINE after it."

	^ self peek isNil or: [self peek isEndMarker or: [self peek isNewline]]

]

{ #category : 'Grail-parsing - atoms' }
PythonParser >> ___balancedJoinOf: pieces from: startTok [
	"The pieces of an f-string joined by ``+'', as a BALANCED tree: the same
	additions in the same left-to-right order, but log2(n) deep where a left
	fold is n deep.  Every pass over the tree -- validation, both codegen arms
	-- recurses through it, and test_fstring's test_many_expressions joins 256
	f-strings of 255 fields: some 130,000 pieces, which a left fold turned into
	a RecursionError."

	| middle |
	pieces size = 1 ifTrue: [^ pieces first].
	middle := pieces size // 2.
	^ BinOpAst new
		left: (self ___balancedJoinOf: (pieces copyFrom: 1 to: middle) from: startTok);
		op: (AddAst new from: startTok to: startTok; yourself);
		right: (self ___balancedJoinOf: (pieces copyFrom: middle + 1 to: pieces size) from: startTok);
		from: startTok to: self lastToken;
		___beAnFStringJoin___;
		yourself

]

{ #category : 'Grail-parsing' }
PythonParser >> ___bodyRangeAfterColon___: colon [
	"{first. last. end} token indexes of the block a header's colon opens: an
	indented body, after however many NEWLINE tokens (a comment line is one),
	from its first statement to the token before its DEDENT, which is end; or
	a one-line body, through its NEWLINE, which is end.  nil when there is
	none."

	| indent dedent end |
	indent := colon + 1.
	[indent <= tokens size and: [(tokens at: indent) isNewline]]
		whileTrue: [indent := indent + 1].
	(indent > (colon + 1) and: [indent <= tokens size
		and: [(tokens at: indent) type == #INDENT]])
		ifTrue: [
			dedent := self ___indexOfMatchingDedent___: indent.
			dedent isNil ifTrue: [^ nil].
			^ Array with: indent + 1 with: dedent - 1 with: dedent].
	end := colon + 1.
	[end <= tokens size and: [(tokens at: end) isNewline not]] whileTrue: [end := end + 1].
	end > tokens size ifTrue: [^ nil].
	^ Array with: colon + 1 with: end with: end

]

{ #category : 'Grail-parsing' }
PythonParser >> ___bracketLevelAt___: anIndex [
	"How many brackets are open before token anIndex -- CPython's token level."

	| level |
	level := 0.
	1 to: anIndex - 1 do: [:index | | token |
		token := tokens at: index.
		token type == #OP ifTrue: [
			(#('(' '[' '{') includes: token value) ifTrue: [level := level + 1].
			(#(')' ']' '}') includes: token value) ifTrue: [level := level - 1]]].
	^ level

]

{ #category : 'Grail-parsing' }
PythonParser >> ___canStartExpression___: aTok [
	"Could an expression begin at aTok?  For the errors that depend on what
	follows: a missing comma, a statement where an expression was due."

	aTok isNil ifTrue: [^ false].
	(#(#NAME #NUMBER #STRING #FSTRING #BYTES #TSTRING) includes: aTok type) ifTrue: [^ true].
	(aTok type == #KEYWORD) ifTrue: [
		^ #('None' 'True' 'False' 'lambda' 'await' 'not') anySatisfy: [:k | aTok isKeyword: k]].
	(aTok type == #OP) ifTrue: [
		^ #('(' '[' '{' '-' '+' '~' '...') anySatisfy: [:k | aTok isOp: k]].
	^ false

]

{ #category : 'Grail-parsing - simple statements' }
PythonParser >> ___checkAnnotatedNameLegal___: aName at: aToken [
	"The other order of ___checkDeclarationLegal___:kind:at:'s annotation
	test: a SIMPLE annotation of a name this function already declared
	``global'' or ``nonlocal'' is refused with the same message
	(Python/symtable.c:2015-2023)."

	| declared |
	self ___inFunctionScope___ ifFalse: [^ self].
	declared := self ___mangle___: aName.
	((globalStack last) includes: declared) ifTrue: [
		^ self ___signalDeclarationSyntaxError___: 'annotated name ''' , aName asString
			, ''' can''t be global' at: aToken
	].
	((nonlocalStack last) includes: declared) ifTrue: [
		^ self ___signalDeclarationSyntaxError___: 'annotated name ''' , aName asString
			, ''' can''t be nonlocal' at: aToken
	]

]

{ #category : 'Grail-target validation' }
PythonParser >> ___checkAnnotationTarget___: expr [
	"CPython's invalid_assignment rules for an annotated target: only a name,
	an attribute or a subscript can be annotated."

	((expr isKindOf: TupleAst) and: [(self ___isParenthesizedTuple___: expr) not])
		ifTrue: [^ self ___syntaxError___: 'only single target (not tuple) can be annotated'
			node: expr elts first].
	((expr isKindOf: TupleAst) or: [expr isKindOf: ListAst]) ifTrue: [
		^ self ___syntaxError___: 'only single target (not ' , (self ___exprName___: expr)
			, ') can be annotated' node: expr].
	((expr isKindOf: NameAst) or: [(expr isKindOf: AttributeAst)
		or: [expr isKindOf: SubscriptAst]]) ifFalse: [
			^ self ___syntaxError___: 'illegal target for annotation' node: expr]

]

{ #category : 'Grail-parsing' }
PythonParser >> ___checkComplexLiteral___: aValue [
	"A value pattern that adds or subtracts is CPython's complex_number: a
	real literal and an imaginary one, each named when it is not."

	| real imag isNumber |
	((aValue isKindOf: BinOpAst) and: [(aValue op isKindOf: AddAst) or: [aValue op isKindOf: SubAst]])
		ifFalse: [^ aValue].
	"An f-string's parts are folded with ``+'' too, and are no sum the source
	wrote: ``case f'a' 'b':'' is refused later, as an f-string."
	aValue ___isAnFStringJoin___ ifTrue: [^ aValue].
	real := aValue left.
	imag := aValue right.
	(real isKindOf: USubAst) ifTrue: [real := real operand].
	isNumber := [:n | (n isKindOf: ConstantAst) and: [(n value isKindOf: Number) or: [n value isKindOf: complex]]].
	((isNumber value: real) and: [(real value isKindOf: complex) not]) ifFalse: [
		^ self ___syntaxError___: 'real number required in complex literal' node: aValue left].
	((isNumber value: imag) and: [imag value isKindOf: complex]) ifFalse: [
		^ self ___syntaxError___: 'imaginary number required in complex literal' node: imag].
	^ aValue

]

{ #category : 'Grail-validation' }
PythonParser >> ___checkComprehension___: node generators: gens [
	"The three PEP 572 restrictions, in the order CPython reports them."

	| boundUpTo boundAfter |
	"Rule 1 -- no assignment expression anywhere in an ITERABLE expression.
	Checked first, and over the whole subtree, so a walrus nested inside a
	lambda or a further comprehension in that position is caught here rather
	than by the inner node's own rules."
	gens do: [:gen |
		(self ___firstNamedExprIn___: gen iter) ifNotNil: [:ne |
			^ self ___syntaxError___:
				'assignment expression cannot be used in a comprehension iterable expression'
				node: ne]].

	"Rules 2 and 3 differ only by WHICH for-clause binds the name, so build
	the two name sets once per position.  boundUpTo/boundAfter are computed
	per generator index i: names bound at or before i, and names bound after."
	1 to: gens size do: [:i |
		boundUpTo := OrderedCollection new.
		boundAfter := OrderedCollection new.
		1 to: gens size do: [:j |
			self ___collectBoundNamesIn___: (gens at: j) target
				into: (j <= i ifTrue: [boundUpTo] ifFalse: [boundAfter])].
		(gens at: i) ifs do: [:cond |
			self ___checkNamedExprsIn___: cond
				boundUpTo: boundUpTo boundAfter: boundAfter]].

	"The element expression comes last, so EVERY for-clause is 'earlier' for
	it -- ``{(j := 0) for i in range(5) for j in range(5)}'' is a rebound
	iteration variable, not an inner-loop rebind."
	boundUpTo := OrderedCollection new.
	gens do: [:gen | self ___collectBoundNamesIn___: gen target into: boundUpTo].
	(self ___comprehensionElementsOf___: node) do: [:elt |
		self ___checkNamedExprsIn___: elt
			boundUpTo: boundUpTo boundAfter: OrderedCollection new]

]

{ #category : 'Grail-parsing - simple statements' }
PythonParser >> ___checkDeclarationLegal___: aName kind: aKind at: aToken [
	"CPython's symtable rejects ``global x'' -- and ``nonlocal x'', with the
	same four messages naming that keyword -- when x is already a parameter
	of, read in, annotated in or bound in THIS scope, testing in that order
	(Python/symtable.c:2137-2147, 2170-2180).  Grail accepted all four
	silently, so code CPython refuses to compile ran here with the name
	quietly meaning something else; ``nonlocal'' was not checked at all.

	Only inside a FUNCTION scope (___inFunctionScope___): at module level
	``global x'' is legal and a no-op, and a CLASS body permits it too
	(``class C: global x'' rebinds the module's x, which Grail already relies
	on)."

	self ___inFunctionScope___ ifFalse: [^ self].
	((paramStack last) includes: aName) ifTrue: [
		^ self ___signalDeclarationSyntaxError___: 'name ''' , aName asString
			, ''' is parameter and ' , aKind at: aToken
	].
	"ownReadStack, NOT readStack: the latter carries free names propagated
	OUT of nested scopes, so a read inside a nested def counted as a read
	here.  That rejected test_builtin's ``global all, any, tuple'', where
	every use of ``all'' is inside a nested def -- CPython compiles it,
	and a whole module failed to import.

	The check also skips comprehension TARGETS, and only here: a genuine
	assignment puts the name in writeStack, which is tested below, so
	skipping cannot hide a real ``assigned to before''."
	(((ownReadStack last) includes: aName)
		and: [((compTargetStack last) includes: aName) @env0:not]) ifTrue: [
		^ self ___signalDeclarationSyntaxError___: 'name ''' , aName asString
			, ''' is used prior to ' , aKind , ' declaration' at: aToken
	].
	((annotatedStack last) includes: aName) ifTrue: [
		^ self ___signalDeclarationSyntaxError___: 'annotated name ''' , aName asString
			, ''' can''t be ' , aKind at: aToken
	].
	((writeStack last) includes: aName) ifTrue: [
		^ self ___signalDeclarationSyntaxError___: 'name ''' , aName asString
			, ''' is assigned to before ' , aKind , ' declaration' at: aToken
	]

]

{ #category : 'Grail-parsing - atoms' }
PythonParser >> ___checkedFStringConversionIn___: aFieldText at: anIndex token: aTok fieldAt: aFieldStart [
	"The conversion the ``!'' at anIndex opens, checked as CPython checks it
	(Parser/action_helpers.c:966-987): a NAME written right after the ``!'',
	which is one of s, r and a, and then the field's ``:'' or ``}''.  Answer
	the index past that NAME.  Grail took the first letter alone, so
	``f'{3!ss}''' formatted with !s (test_fstring test_conversions)."

	| nameEnd next |
	nameEnd := PythonTokenizer ___identifierEndIn___: aFieldText from: anIndex + 1.
	nameEnd = (anIndex + 1) ifTrue: [
		^ self ___signalNoFStringConversionIn___: aFieldText at: anIndex token: aTok fieldAt: aFieldStart].
	(nameEnd = (anIndex + 2) and: ['sra' includesValue: (aFieldText at: anIndex + 1)]) ifFalse: [
		^ self
			___fstringError___: 'invalid conversion character ''' , (aFieldText copyFrom: anIndex + 1 to: nameEnd - 1)
				, ''': expected ''s'', ''r'', or ''a'''
			token: aTok fieldAt: aFieldStart from: anIndex + 1 to: nameEnd].
	next := PythonTokenizer ___indexAfterWhitespaceIn___: aFieldText from: nameEnd.
	(next > aFieldText size or: [':}' includesValue: (aFieldText at: next)]) ifFalse: [
		^ self ___fstringError___: 'expecting '':'' or ''}''' token: aTok fieldAt: aFieldStart index: next].
	^ nameEnd

]

{ #category : 'Grail-parsing' }
PythonParser >> ___checkFeaturesOf___: aFutureImport [
	"future_check_features (Python/future.c:8-62): each name a future
	statement imports has to be a feature, and ``braces'' has an answer of its
	own.  Located at the name, ``as'' clause included."

	aFutureImport names do: [:alias |
		alias name == #'braces' ifTrue: [
			^ self ___syntaxError___: 'not a chance' node: alias].
		(PythonParser ___futureFeatures___ includes: alias name) ifFalse: [
			^ self ___syntaxError___: 'future feature ' , alias name , ' is not defined'
				node: alias]]

]

{ #category : 'Grail-parsing - atoms' }
PythonParser >> ___checkFieldExpressionStart___: anExpressionText token: aTok field: aFieldStart index: anIndex opensSpec: aBoolean [
	"CPython's refusals for a replacement field whose expression cannot start
	the way it does (invalid_replacement_field, Grammar/python.gram), raised
	before the field is parsed -- Grail parses it wrapped in parentheses, where
	both would be legal or would fail with the parenthesis's own message:
	  * a lambda opening the expression or one of its comma-separated items
	    (``{1, lambda: x}''): its ``:'' ends the expression, so CPython asks
	    for the parentheses that would keep it whole.  Only when there IS that
	    ``:'' -- which the scan took for the format spec's, aBoolean -- as in
	    CPython's ``'lambda' [lambda_params] ':''' (python.gram:1256-1257);
	    ``f'{lambda}''' is no expression at all;
	  * ``**'': no expression starts with it."

	(aBoolean and: [self ___hasTopLevelLambda___: anExpressionText]) ifTrue: [
		^ self ___fstringError___: 'lambda expressions are not allowed without parentheses'
			token: aTok fieldAt: aFieldStart index: anIndex].
	(anExpressionText beginsWith: '**') ifTrue: [
		^ self ___fstringError___: 'expecting a valid expression after ''{'''
			token: aTok fieldAt: aFieldStart index: anIndex]

]

{ #category : 'Grail-target validation' }
PythonParser >> ___checkFirstAssignTarget___: first [
	"Raise CPython's SyntaxError for a statement's FIRST assignment target,
	which cannot be assigned to.  The parser is at the ``='' after it.

	The FIRST target is also what CPython's invalid_named_expression sees:
	when its last element is a bitwise_or followed by ``='' and a bitwise_or,
	the message names that element and adds ``here. Maybe you meant '=='
	instead of '='?'' -- or, for a plain name, suggests ``=='' or ``:=''.
	Not when another ``='' follows the right-hand side: that is a chained
	assignment, and it gets the plain message, as every later target does
	(setStoreCtx:)."

	| bad last rhs |
	true ifTrue: [
		last := ((first isKindOf: TupleAst) and: [(self ___isParenthesizedTuple___: first) not])
			ifTrue: [first elts last] ifFalse: [first].
		(last notNil and: [(self ___isBitwiseOrLevel___: last)
			and: [(self ___startsWithExcludedAtom___: last) not]]) ifTrue: [
				rhs := self ___rhsAfterEqualsIsBitwiseOr___.
				rhs notNil ifTrue: [
					(last isKindOf: NameAst) ifTrue: [
						(self ___invalidTarget___: first kind: #star) isNil ifFalse: [
							^ self ___syntaxError___:
								'invalid syntax. Maybe you meant ''=='' or '':='' instead of ''=''?'
								from: last to: rhs]]
					ifFalse: [
						^ self ___syntaxError___: 'cannot assign to ' , (self ___exprName___: last)
							, ' here. Maybe you meant ''=='' instead of ''=''?'
							node: last]]]].
	bad := self ___invalidTarget___: first kind: #star.
	bad isNil ifFalse: [
		^ self ___syntaxError___: 'cannot assign to ' , (self ___exprName___: bad)
			node: bad]

]

{ #category : 'Grail-parsing' }
PythonParser >> ___checkFutureImportsIn___: aModule [
	"CPython's two checks of future statements, made once the whole module has
	parsed, so that a syntax error anywhere in it is reported first.  The
	leading future statements' features come first (Python/future.c), then any
	``from __future__ import'' outside that block, at any depth, is misplaced
	(Python/symtable.c:1813-1829, check_import_from).  Grail compiled every one
	of them: an unknown feature, ``braces'' and a late import alike
	(test_exceptions testSyntaxErrorOffset, test_future)."

	| leading |
	leading := aModule ___leadingFutureImports___.
	leading do: [:statement | self ___checkFeaturesOf___: statement].
	futureImports do: [:statement |
		(leading includesIdentical: statement) ifFalse: [
			^ self ___syntaxError___: 'from __future__ imports must occur at the beginning of the file'
				node: statement]]

]

{ #category : 'Grail-parsing' }
PythonParser >> ___checkImportTarget___ [
	"After ``as'': a name, ending the alias.  Anything else is CPython's
	invalid_dotted_as_name -- ``cannot use literal as import target'' -- when
	it is an expression, and invalid syntax when it is not."

	| tok nxt expr |
	tok := self peek.
	nxt := position + 1 <= tokens size ifTrue: [tokens at: position + 1] ifFalse: [nil].
	(tok notNil and: [tok type == #NAME and: [nxt isNil or: [(nxt isOp: ',')
		or: [(nxt isOp: ')') or: [(nxt isOp: ';') or: [nxt type == #NEWLINE
		or: [nxt type == #ENDMARKER]]]]]]]) ifTrue: [^ self].
	expr := [self parseExpression] on: SyntaxError do: [:ex | ex return: nil].
	expr isNil ifTrue: [^ self ___invalidSyntaxAt___: tok].
	^ self ___syntaxError___: 'cannot use ' , (self ___exprName___: expr) , ' as import target'
		node: expr

]

{ #category : 'Grail-validation' }
PythonParser >> ___checkNamedExprsIn___: node boundUpTo: earlier boundAfter: later [
	"Raise for any assignment expression under node whose target collides with
	a comprehension for-clause target; earlier and later are the names those
	targets bind, as their NameAsts.  A name bound by an EARLIER (or the same)
	clause is a rebound iteration variable, over the walrus target; one bound
	by a LATER clause is the inner-loop case, which CPython words the other
	way round -- the inner loop rebinds the walrus target, not the reverse --
	and places over that loop's target."

	| found |
	found := OrderedCollection new.
	self ___collectNamedExprsIn___: node into: found.
	found do: [:ne |
		| target rebinder |
		target := ne target.
		(target isKindOf: NameAst) ifTrue: [
			"Detected on the MANGLED id (what CPython binds), reported with the
			 WRITTEN spelling (what CPython quotes) -- see NameAst >> writtenId."
			(earlier detect: [:each | each id = target id] ifNone: [nil]) isNil ifFalse: [
				^ self ___syntaxError___:
					'assignment expression cannot rebind comprehension iteration variable ''' ,
					target writtenId asString , ''''
					node: target].
			rebinder := later detect: [:each | each id = target id] ifNone: [nil].
			rebinder isNil ifFalse: [
				^ self ___syntaxError___:
					'comprehension inner loop cannot rebind assignment expression target ''' ,
					target writtenId asString , ''''
					node: rebinder]]]

]

{ #category : 'Grail-parsing' }
PythonParser >> ___checkStrayEquals___: anExpr [
	"An ``='' where a test ends: CPython's invalid_named_expression.  After a
	bare name it suggests ``=='' or ``:='', drawn over ``name = value''; after
	another expression it says that expression cannot be assigned to here."

	| rhs |
	(self atOp: '=') ifFalse: [^ self].
	((self ___isBitwiseOrLevel___: anExpr)
		and: [(self ___startsWithExcludedAtom___: anExpr) not]) ifFalse: [^ self].
	rhs := self ___rhsAfterEqualsIsBitwiseOr___.
	rhs isNil ifTrue: [^ self].
	(anExpr isKindOf: NameAst) ifTrue: [
		^ self ___syntaxError___:
			'invalid syntax. Maybe you meant ''=='' or '':='' instead of ''=''?'
			from: anExpr to: rhs].
	^ self ___syntaxError___: 'cannot assign to ' , (self ___exprName___: anExpr)
		, ' here. Maybe you meant ''=='' instead of ''=''?' node: anExpr

]

{ #category : 'Grail-parsing - atoms' }
PythonParser >> ___checkStringRunFrom___: anIndex [
	"CPython's refusals of adjacent string literals whose kinds cannot be
	concatenated, in its order.  Bytes beside a str or an f-string is refused
	where CPython's parser stands when it notices -- the token after them
	(Parser/action_helpers.c:1894-1899) -- and a t-string beside any other
	literal, over the two that meet (Grammar/python.gram:1554-1558).  Grail
	ended the literal at the first change of kind, so the next one was
	``invalid syntax'' (test_fstring test_compile_time_concat_errors)."

	| first boundary next |
	first := tokens at: anIndex.
	boundary := anIndex.
	[boundary <= tokens size
		and: [(tokens at: boundary) isAnyString
		and: [(tokens at: boundary) isTString = first isTString]]]
			whileTrue: [boundary := boundary + 1].
	next := boundary <= tokens size ifTrue: [tokens at: boundary] ifFalse: [tokens last].
	(first isTString not and: [self ___stringsMixBytesFrom___: anIndex to: boundary - 1]) ifTrue: [
		^ self ___signalBytesMixAt___: next].
	(boundary <= tokens size and: [next isAnyString]) ifTrue: [
		^ self ___syntaxError___: 'cannot mix t-string literals with string or bytes literals'
			from: (tokens at: boundary - 1) to: next]

]

{ #category : 'Grail-parsing' }
PythonParser >> ___checkTypeParamsAt___: lb [
	"A type parameter list: CPython refuses an empty one, the same name twice,
	what its grammar does not admit in one parameter
	(___checkTypeParamSegment___:), and -- in its code generator, so after
	every grammar error in the list -- a parameter without a default after one
	with a default (Python/codegen.c:1259-1297)."

	| rb names segments sawDefault |
	rb := self ___indexOfClose___: lb.
	rb isNil ifTrue: [^ self].
	rb = (lb + 1) ifTrue: [
		^ PythonParser ___signal___: SyntaxError message: 'Type parameter list cannot be empty'
			in: source from: (tokens at: rb) position to: nil].
	segments := self ___segmentsFrom: lb + 1 to: rb - 1.
	names := IdentitySet new.
	segments do: [:seg |
		| t |
		t := self ___typeParamNameIn___: seg.
		t ifNotNil: [
			(names includes: t value asString asSymbol) ifTrue: [
				^ self ___syntaxError___: 'duplicate type parameter ''' , t value asString , ''''
					at: t].
			names add: t value asString asSymbol].
		self ___checkTypeParamSegment___: seg].
	sawDefault := false.
	segments do: [:seg |
		(self ___topLevelEqualsIn___: seg) notNil
			ifTrue: [sawDefault := true]
			ifFalse: [
				sawDefault ifTrue: [
					^ self ___syntaxError___: 'non-default type parameter '''
						, (self ___typeParamNameIn___: seg) value asString
						, ''' follows default type parameter'
						at: (tokens at: seg first)]]]

]

{ #category : 'Grail-parsing' }
PythonParser >> ___checkTypeParamSegment___: seg [
	"One type parameter, as CPython's type_param and invalid_type_param admit
	it (Grammar/python.gram:685-695, 1230-1239): a TypeVarTuple or a ParamSpec
	takes no bound -- ``cannot use bound with ParamSpec'', or ``constraints''
	when the bound is a tuple, located at its colon -- and only a
	TypeVarTuple's default may be starred, any other being invalid syntax at
	the star.  seg is the parameter's token indexes."

	| nameAt stars colonAt equalsAt |
	nameAt := 1.
	[nameAt <= seg size and: [((tokens at: (seg at: nameAt)) isOp: '*')
		or: [(tokens at: (seg at: nameAt)) isOp: '**']]] whileTrue: [nameAt := nameAt + 1].
	stars := nameAt = 1
		ifTrue: [0]
		ifFalse: [((tokens at: seg first) isOp: '**') ifTrue: [2] ifFalse: [1]].
	equalsAt := self ___topLevelEqualsIn___: seg.
	colonAt := (nameAt < seg size and: [(tokens at: (seg at: nameAt + 1)) isOp: ':'])
		ifTrue: [nameAt + 1]
		ifFalse: [nil].
	(stars > 0 and: [colonAt notNil]) ifTrue: [
		^ self ___syntaxError___: 'cannot use '
			, ((self ___isTupleFrom: (seg at: colonAt + 1)
				to: (seg at: (equalsAt ifNil: [seg size + 1]) - 1))
					ifTrue: ['constraints'] ifFalse: ['bound'])
			, ' with ' , (stars = 1 ifTrue: ['TypeVarTuple'] ifFalse: ['ParamSpec'])
			at: (tokens at: (seg at: colonAt))].
	(stars ~= 1 and: [equalsAt notNil and: [equalsAt < seg size
		and: [(tokens at: (seg at: equalsAt + 1)) isOp: '*']]]) ifTrue: [
			^ self ___invalidSyntaxAt___: (tokens at: (seg at: equalsAt + 1))]

]

{ #category : 'Grail-parsing - atoms' }
PythonParser >> ___checkUnparenthesizedComprehension___: aMessage [
	"A ``for'' standing where a display's CLOSER was expected means the element
	list before it was written UNPARENTHESISED:

	    [i := 0, j := 1 for i, j in [(1, 2), (3, 4)]]

	CPython has two messages for that, MEASURED against 3.14.6 rather than
	guessed, because they do not follow the shape you would expect: a LIST or
	SET display gets the specialised hint, while a DICT display and a
	parenthesised form get plain ``invalid syntax''.  Grail reported its own
	``Expected OP ']' but got KEYWORD 'for''', which no CPython test can match
	(test_named_expressions test_named_expression_invalid_17).

	Callers pass the message their display uses, so the choice stays beside the
	measurement rather than being re-derived here."

	((self atKeyword: 'for') or: [self atKeyword: 'async']) ifTrue: [
		^ self ___invalidSyntaxAt___: self peek]

]

{ #category : 'Grail-parsing' }
PythonParser >> ___checkUnparenthesizedComprehension___: aMessage elements: anArray [
	"The list and set form: CPython's invalid_comprehension draws the hint
	over the elements that should have been parenthesised."

	((self atKeyword: 'for') or: [self atKeyword: 'async']) ifTrue: [
		^ self ___syntaxError___: aMessage from: anArray first to: anArray last]

]

{ #category : 'Grail-validation' }
PythonParser >> ___collectBoundNamesIn___: node into: aCollection [
	"Names BOUND by a for-clause target, as their NameAsts, in source order.

	Only NameAsts in STORE context count, which is what distinguishes the
	names a target binds from the ones it merely reads: in
	``for a, (*b, c[d+e::f(g)], h.i) in j'' the target binds a and b, while c,
	d, e, f, g and h are loads inside a subscript or attribute and bind
	nothing.  setStoreCtx: marks exactly the bound ones, recursing through
	tuples, lists and starred targets and no further."

	node isNil ifTrue: [^ self].
	node isString ifTrue: [^ self].
	(node isKindOf: SequenceableCollection) ifTrue: [
		node do: [:each | self ___collectBoundNamesIn___: each into: aCollection].
		^ self].
	(node isKindOf: AbstractNode) ifFalse: [^ self].
	((node isKindOf: NameAst) and: [node ctx isKindOf: StoreAst]) ifTrue: [
		aCollection add: node].
	node class allInstVarNames doWithIndex: [:nameSym :i |
		nameSym == #parent ifFalse: [
			self ___collectBoundNamesIn___: (node instVarAt: i) into: aCollection]]

]

{ #category : 'Grail-validation' }
PythonParser >> ___collectNamedExprsIn___: node into: aColl [
	"Every NamedExprAst under node, including inside lambdas and nested
	comprehensions -- both are positions CPython still rejects."

	node isNil ifTrue: [^ self].
	node isString ifTrue: [^ self].
	(node isKindOf: SequenceableCollection) ifTrue: [
		node do: [:each | self ___collectNamedExprsIn___: each into: aColl].
		^ self].
	(node isKindOf: AbstractNode) ifFalse: [^ self].
	(node isKindOf: NamedExprAst) ifTrue: [aColl add: node].
	node class allInstVarNames doWithIndex: [:nameSym :i |
		nameSym == #parent ifFalse: [
			self ___collectNamedExprsIn___: (node instVarAt: i) into: aColl]]

]

{ #category : 'Grail-validation' }
PythonParser >> ___comprehensionElementsOf___: node [
	"The element expression(s) of a comprehension: a dict comprehension has
	two, the others one."

	(node isKindOf: DictCompAst) ifTrue: [^ { node key. node value }].
	^ { node elt }

]

{ #category : 'Grail-validation' }
PythonParser >> ___comprehensionGeneratorsOf___: node [
	"The generators of a comprehension node, or nil if node is not one.  All
	four comprehension forms carry them under the same instVar name."

	((node isKindOf: ListCompAst) or: [(node isKindOf: SetCompAst)
		or: [(node isKindOf: DictCompAst) or: [node isKindOf: GeneratorExpAst]]])
		ifFalse: [^ nil].
	^ node generators

]

{ #category : 'Grail-parsing' }
PythonParser >> ___currentSourcePosition___ [
	"Where the parser is looking, as an index into ``source''.

	The token at ``position'' is the one a raise almost always refers to: the
	parser signals on the token it could not accept, before consuming it.  Past
	the end of the token list -- ``unexpected end of input'' -- the answer is one
	past the source, which is exactly how CPython points at end-of-line."

	| tok |
	(tokens isNil or: [position isNil]) ifTrue: [^ nil].
	(position >= 1 and: [position <= tokens size]) ifTrue: [
		tok := tokens at: position.
		(tok notNil and: [tok position notNil]) ifTrue: [^ tok position]].
	"Off the end: fall back to the last token that had a position, then to EOF."
	position - 1 to: 1 by: -1 do: [:i |
		tok := tokens at: i.
		(tok notNil and: [tok position notNil]) ifTrue: [^ tok position]].
	^ source isNil ifTrue: [nil] ifFalse: [source size + 1]

]

{ #category : 'Grail-parsing - compound statements' }
PythonParser >> ___declarativeDecoratorSymbolFor: aDecoratorNode [
	"Normalize a dotted property/staticmethod/classmethod decorator --
	``@enum.property'' (types.DynamicClassAttribute, how enum member
	properties are written), ``@builtins.property'', ``@bltns.property'' -- to
	the bare declarative symbol (#property etc.), so it re-classes the def
	exactly like the plain ``@property'' form.  Without this the def stayed a
	plain method and ``member.surface_gravity'' returned the getter itself, so
	e.g. round(member.surface_gravity, 2) sent #* to a BoundMethod and leaked a
	raw Smalltalk error.  Restricted to those known module bases and the three
	declarative names, so an unrelated dotted decorator (``@abc.abstractproperty'',
	``@functools.cached_property'', a user's ``@obj.property'') is unaffected --
	it is returned unchanged for the normal runtime-decorator path."

	((aDecoratorNode isKindOf: AttributeAst)
		and: [(aDecoratorNode value isKindOf: NameAst)
		and: [(#('enum' 'builtins' 'bltns') includes: aDecoratorNode value id asString)
		and: [#('property' 'staticmethod' 'classmethod') includes: aDecoratorNode attr asString]]])
			ifTrue: [^ aDecoratorNode attr asSymbol].
	^ aDecoratorNode

]

{ #category : 'Grail-parsing' }
PythonParser >> ___emitParameters: segments withDefaultsAs: aPrefix like: ref into: out [
	"A def's parameter list, segment by segment, with the n-th default replaced
	by the name aPrefix , n , '___' -- the scope function's parameter that
	carries it in (___rewriteGenericFunctionAt___:decorators:)."

	| n |
	n := 0.
	segments do: [:seg |
		| at |
		at := self ___topLevelEqualsIn___: seg.
		at isNil
			ifTrue: [seg do: [:k | out add: (tokens at: k)]]
			ifFalse: [
				n := n + 1.
				(seg copyFrom: 1 to: at) do: [:k | out add: (tokens at: k)].
				self ___synth: aPrefix , n printString , '___' like: ref into: out].
		self ___synth: ',' like: ref into: out]

]

{ #category : 'Grail-parsing - type params' }
PythonParser >> ___emitTypeParam: p like: ref into: out [
	"``T = ___typing___._grail_type_param(kind, 'T', bound, constraints,
	default)'', each of the last three a lambda over its tokens or None.  A
	TypeVarTuple default written ``= *X'' is CPython's ``next(iter(X))''."

	self ___synth: (p at: 2) , ' = ___typing___._grail_type_param(' , (p at: 1) printString
		, ', ''' , (p at: 2) , ''''
		like: ref into: out.
	3 to: 5 do: [:n |
		| range |
		range := p at: n.
		self ___synth: ',' like: ref into: out.
		range isNil
			ifTrue: [self ___synth: 'None' like: ref into: out]
			ifFalse: [
				(n = 5 and: [(tokens at: range first) isOp: '*'])
					ifTrue: [
						self ___synth: 'lambda: next(iter(' like: ref into: out.
						range allButFirst do: [:k | out add: (tokens at: k)].
						self ___synth: '))' like: ref into: out]
					ifFalse: [
						self ___synth: 'lambda:' like: ref into: out.
						range do: [:k | out add: (tokens at: k)]]]].
	self ___synth: ')' like: ref into: out.
	self ___synthType: #NEWLINE like: ref into: out

]

{ #category : 'Grail-parsing' }
PythonParser >> ___endOfLegacyStatementArgument___ [
	"The last token of what follows a Python-2 ``print'' or ``exec'' when it
	parses, else nil.  CPython's invalid_legacy_expression needs
	``b=star_expressions'' (Grammar/python.gram:1226), and a PEG rule accepts
	the longest prefix that parses: ``print f(**)'' draws the message over
	``print f'', while ``print {1:(foo.)}'' -- whose first atom fails whole,
	so no prefix parses -- is plain invalid syntax at the brace
	(test_grammar's test_former_statements_refer_to_builtins).  So when the
	whole run does not parse, the prefix tried is ___parseLeadingAtom___'s."

	| saved |
	saved := position.
	^ [[self parseStarExpressions. self lastToken]
		on: SyntaxError do: [:ex |
			position := saved.
			ex return: ([self ___parseLeadingAtom___. self lastToken]
				on: SyntaxError do: [:inner | inner return: nil])]]
		ensure: [position := saved]

]

{ #category : 'Grail-parsing' }
PythonParser >> ___endOfNextExpression___ [
	"The last token of the expression at the cursor, or the token there when
	none parses: the end of a range CPython draws over a construct that runs
	on past the error.  A lookahead for the location only."

	| saved |
	saved := position.
	^ [[self parseExpression. self lastToken]
		on: SyntaxError do: [:ex | ex return: (tokens at: saved)]]
		ensure: [position := saved]

]

{ #category : 'Grail-parsing' }
PythonParser >> ___evalInput___: aBoolean [
	"Parse by CPython's eval rule rather than as a module (PythonParser class
	>> parseEvalInput:)."

	evalInput := aBoolean

]

{ #category : 'Grail-parsing' }
PythonParser >> ___excludesMissingCommaAt___: aHead [
	"Whether the head disjunction spanning the token indices aHead is one
	CPython's missing-comma rule leaves alone: one opening with a soft keyword
	or with a NAME followed by a string, and the bare legacy print or exec
	(Parser/action_helpers.c, _PyPegen_check_legacy_stmt)."

	| first |
	first := tokens at: aHead first.
	first isName ifFalse: [^ false].
	(#('_' 'match' 'case' 'type') includes: first value) ifTrue: [^ true].
	(tokens at: aHead first + 1) isAnyString ifTrue: [^ true].
	^ aHead size = 1 and: [#('print' 'exec') includes: first value]

]

{ #category : 'Grail-token access' }
PythonParser >> ___expectColon___: aHeaderName header: aHeaderTok forced: aBoolean [
	"Consume the colon ending a compound statement's header, or raise what
	CPython's grammar raises.  Where the colon is a FORCED token (else'',
	try'', finally'', a def), any other token is expected ':''.  Elsewhere
	(if'', while'', for'', with'', class'', except'', match'',
	case'') that message is for a header that ENDS where the colon should be
	-- invalid_if_stmt and its siblings match NEWLINE there -- and anything
	else is plain invalid syntax''.

	Also records the header for the block that follows, so a missing indent
	can name it."

	| tok |
	tok := self peek.
	(tok notNil and: [tok isOp: ':']) ifTrue: [
		blockHeader := Array with: aHeaderName
			with: (aHeaderTok isNil ifTrue: [tok line] ifFalse: [aHeaderTok line]).
		^ self advance].
	(aBoolean or: [tok notNil and: [tok type == #NEWLINE]]) ifTrue: [
		^ self ___syntaxError___: 'expected '':''' at: tok].
	^ self ___invalidSyntaxAt___: tok

]

{ #category : 'Grail-parsing' }
PythonParser >> ___expectDictColonAfter___: aKey [
	"The ``:'' after a dictionary key, or CPython's invalid_kvpair: ``':'
	expected after dictionary key'', placed on the key's last character with
	an end_offset of 0, as CPython places it."

	| tok |
	tok := self peek.
	(tok notNil and: [tok isOp: ':']) ifTrue: [^ self advance].
	(tok notNil and: [(tok isOp: '}') or: [tok isOp: ',']]) ifFalse: [
		^ self ___invalidSyntaxAt___: tok].
	^ PythonParser ___signalLocated___: SyntaxError
		message: ''':'' expected after dictionary key'
		in: source at: aKey endPosition endOffset: 0

]

{ #category : 'Grail-token access' }
PythonParser >> ___expectForced___: aValue [
	"A forced token (&&'(''' in CPython's grammar): any other token is
	expected '(''' at that token."

	| tok |
	tok := self peek.
	(tok notNil and: [tok isOp: aValue]) ifTrue: [^ self advance].
	^ self ___syntaxError___: 'expected ''' , aValue , '''' at: tok

]

{ #category : 'Grail-token access' }
PythonParser >> ___expectIndentedBlock___ [
	"Consume the INDENT that opens a block, or raise CPython's
	IndentationError naming the header the block belongs to: expected an
	indented block after 'if' statement on line 1'', at the token that should
	have been indented.  ___expectColon___:header:forced: recorded the header."

	| tok header |
	header := blockHeader.
	blockHeader := nil.
	tok := self peek.
	(tok notNil and: [tok type == #INDENT]) ifTrue: [^ self advance].
	^ self ___raise___: IndentationError
		message: (header isNil
			ifTrue: ['expected an indented block']
			ifFalse: ['expected an indented block after ' , (header at: 1)
				, ' on line ' , (header at: 2) printString])
		from: tok to: tok

]

{ #category : 'Grail-target validation' }
PythonParser >> ___exprName___: aNode [
	"CPython's _PyPegen_get_expr_name: the noun its SyntaxErrors use for an
	expression -- ``cannot assign to function call'', ``cannot delete
	conditional expression''."

	"An f-string or t-string is built as a call (___fformat___, the templatelib
	constructor), so its token says what it was."
	(self ___tokenIndexAt___: aNode position) > 0 ifTrue: [
		| tok |
		tok := tokens at: (self ___tokenIndexAt___: aNode position).
		(tok type == #FSTRING and: [tok endPosition = aNode endPosition])
			ifTrue: [^ 'f-string expression'].
		(tok type == #TSTRING and: [tok endPosition = aNode endPosition])
			ifTrue: [^ 't-string expression']].
	(aNode isKindOf: AttributeAst) ifTrue: [^ 'attribute'].
	(aNode isKindOf: SubscriptAst) ifTrue: [^ 'subscript'].
	(aNode isKindOf: StarredAst) ifTrue: [^ 'starred'].
	(aNode isKindOf: NameAst) ifTrue: [^ 'name'].
	(aNode isKindOf: ListAst) ifTrue: [^ 'list'].
	(aNode isKindOf: TupleAst) ifTrue: [^ 'tuple'].
	(aNode isKindOf: LambdaAst) ifTrue: [^ 'lambda'].
	(aNode isKindOf: CallAst) ifTrue: [^ 'function call'].
	((aNode isKindOf: BoolOpAst) or: [(aNode isKindOf: BinOpAst)
		or: [aNode isKindOf: UnaryOpAst]]) ifTrue: [^ 'expression'].
	(aNode isKindOf: GeneratorExpAst) ifTrue: [^ 'generator expression'].
	((aNode isKindOf: YieldAst) or: [aNode isKindOf: YieldFromAst])
		ifTrue: [^ 'yield expression'].
	(aNode isKindOf: AwaitAst) ifTrue: [^ 'await expression'].
	(aNode isKindOf: ListCompAst) ifTrue: [^ 'list comprehension'].
	(aNode isKindOf: SetCompAst) ifTrue: [^ 'set comprehension'].
	(aNode isKindOf: DictCompAst) ifTrue: [^ 'dict comprehension'].
	(aNode isKindOf: DictAst) ifTrue: [^ 'dict literal'].
	(aNode isKindOf: SetAst) ifTrue: [^ 'set display'].
	((aNode isKindOf: JoinedStrAst) or: [aNode isKindOf: FormattedValueAst])
		ifTrue: [^ 'f-string expression'].
	(aNode isKindOf: TemplateStrAst) ifTrue: [^ 't-string expression'].
	(aNode isKindOf: ConstantAst) ifTrue: [
		aNode value == nil ifTrue: [^ 'None'].
		aNode value == true ifTrue: [^ 'True'].
		aNode value == false ifTrue: [^ 'False'].
		aNode value == #'...' ifTrue: [^ 'ellipsis'].
		^ 'literal'].
	(aNode isKindOf: CompareAst) ifTrue: [^ 'comparison'].
	(aNode isKindOf: IfExpAst) ifTrue: [^ 'conditional expression'].
	(aNode isKindOf: NamedExprAst) ifTrue: [^ 'named expression'].
	^ 'expression'

]

{ #category : 'Grail-parsing - atoms' }
PythonParser >> ___fieldExpressionStartIn___: aFieldText from: anIndex [
	"The index of the first character at or after anIndex that is neither
	whitespace nor part of a comment: where a replacement field's expression
	starts, if it has one.  CPython names that character when it stands in
	for a missing expression, so ``f'''{\n# only a comment\n}''''' is ``valid
	expression required before '}''' on line 3."

	| index whitespace |
	"Python's whitespace, not every separator: a no-break space is an error of
	its own (``invalid non-printable character U+00A0'')."
	whitespace := String withAll: { Character space. Character tab. Character newPage. Character cr. Character lf }.
	index := anIndex.
	[index <= aFieldText size and: [(whitespace includesValue: (aFieldText at: index)) or: [(aFieldText at: index) == $#]]]
		whileTrue: [
			(aFieldText at: index) == $#
				ifTrue: [[index <= aFieldText size and: [(aFieldText at: index) ~~ Character lf]]
					whileTrue: [index := index + 1]]
				ifFalse: [index := index + 1]].
	^ index

]

{ #category : 'Grail-parsing - atoms' }
PythonParser >> ___fieldIndexOf___: anError line: aLineName offset: anOffsetName in: aWrappedSource at: anExpressionStart [
	"The field index of the location anError carries in the fields named
	aLineName and anOffsetName -- a line and column of aWrappedSource, whose
	``('' stands one before anExpressionStart -- or nil when it has none."

	| lineNumber offset |
	lineNumber := anError dynamicInstVarAt: aLineName.
	offset := anError dynamicInstVarAt: anOffsetName.
	((lineNumber isKindOf: Integer) and: [offset isKindOf: Integer]) ifFalse: [^ nil].
	^ anExpressionStart - 2
		+ (PythonParser ___indexIn___: aWrappedSource line: lineNumber offset: offset)

]

{ #category : 'Grail-parsing - atoms' }
PythonParser >> ___fieldSyntaxError___: aMessage token: aTok fieldAt: aFieldStart from: aStartIndex to: anEndIndex [
	"A SyntaxError about an f-string (or t-string) field's text from
	aStartIndex to the EXCLUSIVE anEndIndex, nil for a point.  The text is
	verbatim source, so an index into it maps to the source through the
	field's recorded start."

	| anchor offset |
	anchor := aTok fieldStarts ifNil: [nil] ifNotNil: [:fs |
		fs detect: [:a | (a at: 1) = aFieldStart] ifNone: [nil]].
	anchor isNil ifTrue: [^ SyntaxError signal: aMessage].
	offset := (anchor at: 2) - (anchor at: 1).
	^ PythonParser ___signal___: SyntaxError
		message: aMessage
		in: source from: aStartIndex + offset to: (anEndIndex ifNotNil: [:end | end + offset])

]

{ #category : 'Grail-parsing - atoms' }
PythonParser >> ___fieldTokensIn___: aWrappedSource [
	"The tokens of a replacement field's expression, tokenized in the
	parentheses aWrappedSource adds around it -- which are left out."

	| fieldTokens |
	aWrappedSource isEmpty ifTrue: [^ OrderedCollection new].
	fieldTokens := (PythonTokenizer on: aWrappedSource) tokenize asOrderedCollection.
	[fieldTokens notEmpty and: [(fieldTokens last isOp: ')') not]]
		whileTrue: [fieldTokens removeLast].
	fieldTokens removeLast.
	fieldTokens removeFirst.
	^ fieldTokens

]

{ #category : 'Grail-validation' }
PythonParser >> ___firstNamedExprIn___: node [
	"The first NamedExprAst under node, or nil."

	| found |
	found := OrderedCollection new.
	self ___collectNamedExprsIn___: node into: found.
	^ found isEmpty ifTrue: [nil] ifFalse: [found first]

]

{ #category : 'Grail-parsing - atoms' }
PythonParser >> ___formatSpecJoinedStrFor: formatSpec at: locTok [
	"A field's format spec for ast.parse: an f-string of its own, so a spec
	with a nested field goes through the same child parse compiled code uses,
	and a literal one is its text alone."

	(formatSpec includes: ${) ifTrue: [^ self ___fstringSpecExprFor: formatSpec at: locTok].
	^ JoinedStrAst new
		values: (formatSpec isEmpty
			ifTrue: [#()]
			ifFalse: [{ self ___fstringPartToAst: #literal -> formatSpec from: locTok }]);
		from: locTok to: locTok;
		yourself

]

{ #category : 'Grail-parsing - atoms' }
PythonParser >> ___formattedValueOf: exprAst conversion: conversionChar formatSpec: formatSpec at: locTok [
	"A field as ast.parse answers it: CPython's FormattedValue, with the
	conversion as its code point (-1 for none) and the spec as a JoinedStr of
	its own -- empty for ``{x:}'', and holding a nested field's FormattedValue
	for ``{x:{width}}''."

	^ FormattedValueAst new
		value: exprAst;
		conversion: (conversionChar isNil ifTrue: [-1] ifFalse: [conversionChar codePoint]);
		format_spec: (formatSpec isNil
			ifTrue: [nil]
			ifFalse: [self ___formatSpecJoinedStrFor: formatSpec at: locTok]);
		from: locTok to: locTok;
		yourself

]

{ #category : 'Grail-parsing' }
PythonParser >> ___fstringDebugEqualsIn___: text [
	"Index of the trailing ``='' that makes a replacement field the
	self-documenting ``f'{expr=}''' form, or 0 when there is none.

	Trailing whitespace may follow it -- ``f'{ a = }''' is legal and keeps
	that spacing in the emitted text.  An ``='' preceded by = ! < > : belongs
	to a comparison or a walrus instead, so f'{a==10}' is an ordinary field."

	| i prev newline |
	i := text size.
	"CPython 3.14.8's _strip_interpolation_debug_expr: whitespace, and an
	explicit line continuation (a backslash ending a line), may follow the
	``=''."
	[newline := false.
	 [i > 0 and: [(text at: i) isSeparator]] whileTrue: [
		((text at: i) == Character lf or: [(text at: i) == Character cr])
			ifTrue: [newline := true].
		i := i - 1].
	 newline and: [i > 0 and: [(text at: i) == $\]]]
		whileTrue: [i := i - 1].
	i == 0 ifTrue: [^ 0].
	(text at: i) == $= ifFalse: [^ 0].
	i == 1 ifTrue: [^ i].
	prev := text at: i - 1.
	((prev == $=) or: [(prev == $!) or: [(prev == $<)
		or: [(prev == $>) or: [prev == $:]]]]) ifTrue: [^ 0].
	^ i

]

{ #category : 'Grail-parsing - atoms' }
PythonParser >> ___fstringError___: aMessage token: aTok field: aFieldStart tokenAt: aFieldToken at: anExpressionStart [
	"An f-string field error over aFieldToken, a token of the field's
	expression as tokenized in parentheses -- so one before anExpressionStart."

	^ self ___fstringError___: aMessage token: aTok fieldAt: aFieldStart
		from: anExpressionStart - 2 + aFieldToken position
		to: anExpressionStart - 1 + aFieldToken endPosition

]

{ #category : 'Grail-parsing' }
PythonParser >> ___fstringError___: aMessage token: aTok fieldAt: aFieldStart from: aStartIndex to: anEndIndex [
	"An f-string (or t-string) field error over the field's text from
	aStartIndex to the EXCLUSIVE anEndIndex, mapped to the source as a single
	index is."

	^ self
		___fieldSyntaxError___: (aTok isTString ifTrue: ['t-string: '] ifFalse: ['f-string: ']) , aMessage
		token: aTok fieldAt: aFieldStart from: aStartIndex to: anEndIndex

]

{ #category : 'Grail-parsing' }
PythonParser >> ___fstringError___: aMessage token: aTok fieldAt: aFieldStart index: anIndex [
	"An f-string (or t-string) field error, at the character CPython names:
	the field's text is verbatim source, so an index into it maps to the
	source through the field's recorded start."

	^ self ___fstringError___: aMessage token: aTok fieldAt: aFieldStart
		from: anIndex to: anIndex + 1

]

{ #category : 'Grail-parsing - atoms' }
PythonParser >> ___fstringPartToAst: assoc from: startTok [
	"Turn a (#literal -> string) or (#expr -> exprAst) pair into the
	matching AST node — literals become a ConstantAst, expr-parts are
	already AST nodes ready for the BinOp chain."

	assoc key == #literal ifTrue: [
		^ ConstantAst new
			value: assoc value;
			kind: nil;
			from: startTok to: startTok ; yourself
	].
	^ assoc value

]

{ #category : 'Grail-parsing - atoms' }
PythonParser >> ___fstringSpecExprFor: spec at: locTok [
	"Build an AST expression for a format spec containing {expr}
	placeholders (``f'{x:{width}.{precision}}''').  The spec is read as an
	f-string of its own, by a child parser over one synthetic FSTRING token,
	so a nested field gets everything a field outside a spec gets: its
	expression parsed as if parenthesized (``{ 1}''), quotes that may hold a
	brace (``{3:{'}'}>10}''), its own conversion and spec (``{1 + 1:1d}''),
	and the debug form (``{y=}'').  The scan this replaced matched braces
	blindly and parsed the text bare, so test_fstring could not compile.
	The child's declared names are propagated, as for any field."

	| innerParser specAst specToken |
	innerParser := PythonParser basicNew source: ''.
	innerParser ___mangleClassStack___: self ___mangleClassStack___ copy.
	"The spec's fields, anchored in THIS source as the field scan recorded
	them, so the child's errors and nodes are located in it -- an error in
	``f'{10:{ }}''' had no location at all (eval reported ``None'')."
	innerParser ___sourceText___: source.
	specToken := PythonToken type: #FSTRING value: spec line: locTok line position: locTok position.
	(specFieldStarts at: spec otherwise: nil) ifNotNil: [:starts | specToken fieldStarts: starts].
	specAst := innerParser ___parseFStringLiteralToken___: specToken.
	innerParser ___variableStack___ do: [:innerScope |
		innerScope do: [:varName | self declareVariable: varName]].
	^ specAst

]

{ #category : 'Grail-parsing' }
PythonParser >> ___ftstringExprWithoutComments___: text [
	"A replacement field's source with its comments removed -- CPython's
	set_ftstring_expr (Parser/lexer/lexer.c), which builds both the debug
	text of ``f'{x=}''' and a t-string Interpolation's expression.  A ``#''
	outside a string literal drops the rest of its line but not the newline;
	a backslash copies the next character unread, so an escaped quote neither
	opens nor closes a string.  Quote tracking is CPython's own: any quote
	opens, only the same quote closes, which is right for the valid string
	tokens a field can hold.  Answers ``text'' itself (the identical object)
	when there is no comment."

	| out i ch inString quote |
	(text includes: $#) ifFalse: [^ text].
	out := WriteStream on: Unicode7 new.
	inString := false.
	i := 1.
	[i <= text size] whileTrue: [
		ch := text at: i.
		ch == $\
			ifTrue: [
				out nextPut: ch.
				i := i + 1.
				i <= text size ifTrue: [out nextPut: (text at: i)]]
			ifFalse: [
				(ch == $" or: [ch == $'])
					ifTrue: [
						inString
							ifFalse: [inString := true. quote := ch]
							ifTrue: [ch == quote ifTrue: [inString := false]].
						out nextPut: ch]
					ifFalse: [
						(ch == $# and: [inString not])
							ifTrue: [
								[i <= text size and: [(text at: i) ~= Character lf]]
									whileTrue: [i := i + 1].
								i <= text size ifTrue: [out nextPut: Character lf]]
							ifFalse: [out nextPut: ch]]].
		i := i + 1].
	"A ``#'' inside a string literal removes nothing."
	^ out contents = text ifTrue: [text] ifFalse: [out contents]

]

{ #category : 'Grail-parsing - atoms' }
PythonParser >> ___hasTopLevelLambda___: anExpressionText [
	"Whether a lambda opens anExpressionText or one of its top-level
	comma-separated items -- not one inside brackets, ``{(lambda: 1)}'', and
	not a name that merely starts with it, ``{lambdax}''.  Tokenized
	parenthesised, as the field is parsed, so a multi-line field has no
	NEWLINE tokens; text the tokenizer refuses answers false and is left to
	the parse to report."

	| fieldTokens depth previous |
	fieldTokens := [PythonTokenizer tokenize: '(' , anExpressionText , ')']
		on: SyntaxError do: [:ex | ex return: #()].
	depth := 0.
	previous := nil.
	2 to: fieldTokens size do: [:i |
		| token |
		token := fieldTokens at: i.
		((token isKeyword: 'lambda') and: [depth = 0
			and: [previous isNil or: [previous isOp: ',']]]) ifTrue: [^ true].
		((token isOp: '(') or: [(token isOp: '[') or: [token isOp: '{']]) ifTrue: [depth := depth + 1].
		((token isOp: ')') or: [(token isOp: ']') or: [token isOp: '}']]) ifTrue: [depth := depth - 1].
		previous := token].
	^ false

]

{ #category : 'Grail-parsing' }
PythonParser >> ___headerColonAfter___: anIndex [
	"The index of the ``:'' that ends a compound statement's header, searching
	after anIndex outside brackets -- past a def's ``-> R'' -- or nil at the
	end of the line."

	| depth k |
	depth := 0.
	k := anIndex + 1.
	[k <= tokens size and: [(tokens at: k) isNewline not]] whileTrue: [
		| t |
		t := tokens at: k.
		((t isOp: '(') or: [(t isOp: '[') or: [t isOp: '{']]) ifTrue: [depth := depth + 1].
		((t isOp: ')') or: [(t isOp: ']') or: [t isOp: '}']]) ifTrue: [depth := depth - 1].
		(depth = 0 and: [t isOp: ':']) ifTrue: [^ k].
		k := k + 1].
	^ nil

]

{ #category : 'Grail-token access' }
PythonParser >> ___hexPairs___: aString [
	"Two lowercase hex digits per UTF-8 byte."

	| out |
	out := WriteStream on: String new.
	aString encodeAsUTF8 asByteArray do: [:byte |
		out nextPut: ('0123456789abcdef' at: (byte bitShift: -4) + 1).
		out nextPut: ('0123456789abcdef' at: (byte bitAnd: 15) + 1)].
	^ out contents

]

{ #category : 'Grail-node construction' }
PythonParser >> ___illegalStoreTargetDesc___: anExpr [
	"Answer a CPython-style noun for anExpr when it can NEVER be an assignment
	(store) target, else nil.  Deliberately PERMISSIVE -- it flags only the
	comprehension / generator-expression forms (``{k: v for ...} = 5'' is
	``cannot assign to dict comprehension'', test_dictcomps
	test_illegal_assignment) and lets every other node through, so ordinary
	Name / Attribute / Subscript / tuple / list / starred targets are
	unaffected.  (The stricter augmented-assignment rule -- only a single
	simple target -- is enforced separately at the ``+='' parse site.)

	A CONSTANT is the other form that can never be a target: ``None = 1'',
	``with mock as None:'' and ``with mock as (foo, None, bar):'' are all
	SyntaxError in CPython, and Grail used to accept every one of them and
	emit code that silently did the wrong thing.  test_with's
	testAssignmentToNoneError / ...TupleOnlyContainingNone... /
	...TupleContainingNone... are three tests on exactly this.

	CPython appends ``here. Maybe you meant '==' instead of '='?'' when the
	target is a literal in an ``='' STATEMENT specifically; this hook is
	shared by every store context (with-as and for-targets get the bare
	message), so it emits the bare noun in all of them."

	(anExpr isKindOf: DictCompAst) ifTrue: [^ 'dict comprehension'].
	(anExpr isKindOf: ListCompAst) ifTrue: [^ 'list comprehension'].
	(anExpr isKindOf: SetCompAst) ifTrue: [^ 'set comprehension'].
	(anExpr isKindOf: GeneratorExpAst) ifTrue: [^ 'generator expression'].
	(anExpr isKindOf: ConstantAst) ifTrue: [
		"CPython names the three keyword constants; every other literal
		(number, string, ellipsis, ...) is just ``literal''."
		anExpr value == nil ifTrue: [^ 'None'].
		anExpr value == true ifTrue: [^ 'True'].
		anExpr value == false ifTrue: [^ 'False'].
		^ 'literal'].
	^ nil

]

{ #category : 'Grail-parsing - type params' }
PythonParser >> ___indexOfClose___: openIndex [
	"The index of the bracket closing the one at openIndex, counting all three
	kinds, or nil."

	| depth |
	depth := 0.
	openIndex to: tokens size do: [:k |
		| t |
		t := tokens at: k.
		((t isOp: '(') or: [(t isOp: '[') or: [t isOp: '{']]) ifTrue: [depth := depth + 1].
		((t isOp: ')') or: [(t isOp: ']') or: [t isOp: '}']]) ifTrue: [
			depth := depth - 1.
			depth = 0 ifTrue: [^ k]]].
	^ nil

]

{ #category : 'Grail-parsing - type params' }
PythonParser >> ___indexOfMatchingDedent___: indentIndex [
	| depth |
	depth := 0.
	indentIndex to: tokens size do: [:k |
		| t |
		t := tokens at: k.
		t type == #INDENT ifTrue: [depth := depth + 1].
		t type == #DEDENT ifTrue: [
			depth := depth - 1.
			depth = 0 ifTrue: [^ k]]].
	^ nil

]

{ #category : 'Grail-parsing - simple statements' }
PythonParser >> ___inFunctionScope___ [
	"Whether the statement being parsed is in a function's own scope: neither
	the module's (variableStack holds one scope there) nor a class body's
	(classNesting, which every def body zeroes)."

	^ variableStack size @env0:> 1 and: [classNesting @env0:= 0]

]

{ #category : 'Grail-parsing' }
PythonParser >> ___invalidSyntaxAt___: aTok [
	"CPython's generic error: ``invalid syntax'' at the token the parse could
	not accept.  A tokenizer error later in the source is reported instead, as
	CPython's _PyPegen_tokenize_full_source_to_check_for_errors does -- and
	Grail's tokenizer has already run over the whole source, so nothing is
	left to report here."

	aTok isNil ifTrue: [^ SyntaxError signal: 'invalid syntax'].
	(aTok type == #INDENT) ifTrue: [
		"CPython 3.14.8 places it at the indentation's last column: offset
		equal to its width, end_offset -1."
		| lineStart k |
		lineStart := PythonParser ___lineStartPositionIn___: source at: aTok position.
		k := lineStart.
		[k <= source size and: [(source at: k) == $  or: [(source at: k) == Character tab]]]
			whileTrue: [k := k + 1].
		^ PythonParser ___signalLocated___: IndentationError
			message: 'unexpected indent'
			in: source
			at: ((k - 1) max: lineStart)
			endOffset: -1].
	self ___signalMissingCommaBefore___: aTok.
	^ self ___syntaxError___: 'invalid syntax' at: aTok

]

{ #category : 'Grail-target validation' }
PythonParser >> ___invalidTarget___: aNode kind: aKind [
	"CPython's _PyPegen_get_invalid_target: the first sub-expression of aNode
	that cannot be an assignment (aKind #star), for-loop (#for) or del (#del)
	target, or nil.  Names, attributes and subscripts are targets; tuples and
	lists are when all their elements are; a starred one is, except in del."

	| child |
	aNode isNil ifTrue: [^ nil].
	((aNode isKindOf: TupleAst) or: [aNode isKindOf: ListAst]) ifTrue: [
		aNode elts do: [:each |
			child := self ___invalidTarget___: each kind: aKind.
			child isNil ifFalse: [^ child]].
		^ nil].
	(aNode isKindOf: StarredAst) ifTrue: [
		aKind == #del ifTrue: [^ aNode].
		^ self ___invalidTarget___: aNode value kind: aKind].
	(aNode isKindOf: CompareAst) ifTrue: [
		"``for x in y'' read as an expression is the comparison ``x in y''."
		(aKind == #for and: [(aNode cmpopList first isKindOf: InAst)])
			ifTrue: [^ self ___invalidTarget___: aNode left kind: aKind].
		^ aNode].
	((aNode isKindOf: NameAst) or: [(aNode isKindOf: SubscriptAst)
		or: [aNode isKindOf: AttributeAst]]) ifTrue: [^ nil].
	^ aNode

]

{ #category : 'Grail-parsing - expressions' }
PythonParser >> ___inWalrusValue___: aBoolean do: aBlock [
	"Track whether what is being parsed is the VALUE of a walrus.  One
	caller reads it: the refusal message for a ``:='' inside a lambda
	body -- see ___walrusRefusalMessage___."

	| saved |
	saved := inWalrusValue.
	inWalrusValue := aBoolean.
	^ [aBlock value] ensure: [inWalrusValue := saved]

]

{ #category : 'Grail-parsing - atoms' }
PythonParser >> ___isBareGenerator___: anExpression in: aWrappedSource [
	"Whether anExpression, parsed from a replacement field's text in the
	parentheses aWrappedSource adds, is a generator only those parentheses
	made: a field is an annotated_rhs, so ``f'{x for x in y}''' is refused at
	the ``for'' (test_fstring), while ``f'{(x for x in y)}''' is a generator."

	| fieldTokens level |
	(anExpression isKindOf: GeneratorExpAst) ifFalse: [^ false].
	fieldTokens := self ___fieldTokensIn___: aWrappedSource.
	(fieldTokens first isOp: '(') ifFalse: [^ true].
	level := 0.
	fieldTokens doWithIndex: [:each :index |
		each type == #OP ifTrue: [
			(#('(' '[' '{') includes: each value) ifTrue: [level := level + 1].
			(#(')' ']' '}') includes: each value) ifTrue: [level := level - 1]].
		(level = 0 and: [index < fieldTokens size]) ifTrue: [^ true]].
	^ false

]

{ #category : 'Grail-target validation' }
PythonParser >> ___isBitwiseOrLevel___: aNode [
	"Would CPython's bitwise_or rule have parsed exactly aNode?  Not when it is
	a comparison, a not, a boolean operation, a conditional, a lambda, a
	starred or named expression, or a yield -- unless it is parenthesised,
	which makes it an atom."

	(self ___isParenthesized___: aNode) ifTrue: [^ true].
	^ ((aNode isKindOf: CompareAst) or: [(aNode isKindOf: NotAst)
		or: [(aNode isKindOf: BoolOpAst) or: [(aNode isKindOf: IfExpAst)
		or: [(aNode isKindOf: LambdaAst) or: [(aNode isKindOf: StarredAst)
		or: [(aNode isKindOf: NamedExprAst) or: [(aNode isKindOf: YieldAst)
		or: [aNode isKindOf: YieldFromAst]]]]]]]]) not

]

{ #category : 'Grail-parsing - atoms' }
PythonParser >> ___isExpression___: aWrappedSource [
	"Whether aWrappedSource -- part of a replacement field's text, in
	parentheses -- is an expression as a field takes one: all of it, and not a
	generator the parentheses made (CPython's annotated_rhs)."

	^ [| parser expression |
		parser := PythonParser basicNew source: aWrappedSource.
		parser ___mangleClassStack___: self ___mangleClassStack___ copy.
		expression := parser parseExpression.
		(parser peek isNil or: [parser peek isNewline or: [parser peek isEndMarker]])
			and: [(self ___isBareGenerator___: expression in: aWrappedSource) not]]
		on: SyntaxError do: [:ex | ex return: false]

]

{ #category : 'Grail-parsing' }
PythonParser >> ___isInsideStringLedOperands___ [
	"Whether an expression still being parsed opens with a plain string or
	bytes literal followed by ``+'' or ``-''.  CPython's invalid_expression
	first tries ``STRING (!STRING expression_without_invalid)+ STRING''
	(Grammar/python.gram:1243-1245) there: it parses the operands with its
	error rules off, and the failures that memoizes keep the missing-comma
	rule from running inside them.  So ``'a' + (1 2)'' is plain invalid
	syntax where ``x + (1 2)'' is a missing comma."

	^ openExpressions anySatisfy: [:startIndex | | first next |
		first := tokens at: startIndex.
		next := startIndex < tokens size ifTrue: [tokens at: startIndex + 1] ifFalse: [first].
		(first isString or: [first isBytes])
			and: [(next isOp: '+') or: [next isOp: '-']]]

]

{ #category : 'Grail-parsing - type params' }
PythonParser >> ___isKeywordArgument___: aSegment [
	"``name=value'' or ``**mapping'' -- the class arguments that must follow
	every base, so the generic base goes before the first of them."

	| t |
	t := tokens at: aSegment first.
	(t isOp: '**') ifTrue: [^ true].
	^ aSegment size > 1 and: [t isName and: [(tokens at: (aSegment at: 2)) isOp: '=']]

]

{ #category : 'Grail-parsing - atoms' }
PythonParser >> ___isOpenField___: aFieldStart of: anFString [
	"Whether the replacement field starting at aFieldStart is the one
	anFString ended inside of: its last."

	^ anFString openFieldAt notNil
		and: [anFString fieldStarts notNil
		and: [(anFString fieldStarts last at: 1) = aFieldStart]]

]

{ #category : 'Grail-parsing - type params' }
PythonParser >> ___isParenthesisedTuple___: aRange [
	"Does the token range read ``( a, b )'' -- one parenthesised group with a
	comma directly inside it?"

	| close |
	aRange isEmpty ifTrue: [^ false].
	((tokens at: aRange first) isOp: '(') ifFalse: [^ false].
	close := self ___indexOfClose___: aRange first.
	close = aRange last ifFalse: [^ false].
	^ (self ___segmentsFrom: aRange first + 1 to: aRange last - 1) size > 1
		or: [((tokens at: aRange last - 1) isOp: ',')]

]

{ #category : 'Grail-target validation' }
PythonParser >> ___isParenthesized___: aNode [
	"Is aNode written inside its own parentheses -- ``(yield)'', ``(a + b)''?
	The tree keeps no record of a group, but the tokens do: the token before
	the node's first is ``('' and the one after its last is the matching ``)''."

	| i close |
	i := self ___tokenIndexAt___: aNode position.
	i <= 1 ifTrue: [^ false].
	((tokens at: i - 1) isOp: '(') ifFalse: [^ false].
	close := self ___indexOfClose___: i - 1.
	close isNil ifTrue: [^ false].
	^ (tokens at: close - 1) endPosition = aNode endPosition

]

{ #category : 'Grail-target validation' }
PythonParser >> ___isParenthesizedTuple___: aNode [
	"Is aNode a tuple written with its own parentheses -- (a, b)'', not
	a, b'' or (a), b''?"

	| i close |
	(aNode isKindOf: TupleAst) ifFalse: [^ false].
	i := self ___tokenIndexAt___: aNode position.
	(i = 0 or: [((tokens at: i) isOp: '(') not]) ifTrue: [^ false].
	close := self ___indexOfClose___: i.
	^ close notNil and: [(tokens at: close) endPosition = aNode endPosition]

]

{ #category : 'Grail-parsing - atoms' }
PythonParser >> ___isTripleQuoteIn: aString at: anIndex [
	"Is the quote at anIndex of aString the first of three identical ones?"

	| quote |
	quote := aString at: anIndex.
	^ anIndex + 2 <= aString size
		and: [(aString at: anIndex + 1) == quote and: [(aString at: anIndex + 2) == quote]]

]

{ #category : 'Grail-parsing' }
PythonParser >> ___isTupleFrom: first to: last [
	"Whether tokens first..last are one parenthesised tuple -- ``()'' or a
	group with a comma at its own depth -- which is what makes a bound a list
	of constraints."

	| close |
	first > last ifTrue: [^ false].
	((tokens at: first) isOp: '(') ifFalse: [^ false].
	close := self ___indexOfClose___: first.
	close = last ifFalse: [^ false].
	close = (first + 1) ifTrue: [^ true].
	^ (self ___segmentsFrom: first + 1 to: close - 1) size > 1
		or: [(tokens at: close - 1) isOp: ',']

]

{ #category : 'Grail-parsing - atoms' }
PythonParser >> ___joinedStrFromParts___: parts from: startTok [
	"What ast.parse answers for an f-string: CPython's JoinedStr, holding the
	literal text -- adjacent pieces merged into one Constant, as CPython's
	parser merges them -- and a FormattedValue per field.  Only the ast
	module sees it; compiled code keeps the concatenation parseFStringLiteral
	builds, which is why the ast form answered a Call or a BinOp."

	| values literal |
	values := OrderedCollection new.
	literal := nil.
	parts do: [:part |
		part key == #literal
			ifTrue: [literal := literal isNil ifTrue: [part value] ifFalse: [literal , part value]]
			ifFalse: [
				literal isNil ifFalse: [
					values add: (self ___fstringPartToAst: #literal -> literal from: startTok).
					literal := nil].
				values add: part value]].
	literal isNil ifFalse: [values add: (self ___fstringPartToAst: #literal -> literal from: startTok)].
	^ JoinedStrAst new
		values: values asArray;
		from: startTok to: self lastToken;
		yourself

]

{ #category : 'Grail-node construction' }
PythonParser >> ___joinStringParts___: parts [
	"Concatenate adjacent string-literal parts.  With no surrogate part this
	is the original Unicode7 stream, byte for byte.  With one, the whole
	result must be a PyStrSurrogate -- concatenating a representable prefix
	onto an unrepresentable character does not make it representable."

	| anySurrogate cps writeStream |
	anySurrogate := parts anySatisfy: [:p | p isKindOf: PyStrSurrogate].
	anySurrogate ifFalse: [
		writeStream := AppendStream on: Unicode7 new.
		parts do: [:p | writeStream nextPutAll: p].
		^ writeStream contents].
	cps := OrderedCollection new.
	parts do: [:p |
		(p isKindOf: PyStrSurrogate)
			ifTrue: [cps addAll: p ___codePoints___]
			ifFalse: [p do: [:c | cps add: c codePoint]]].
	^ PyStrSurrogate ___fromCodePoints___: cps

]

{ #category : 'Grail-parsing' }
PythonParser >> ___lastTokenOfExpressionFrom___: anIndex [
	"The last token of the expression that starts at token anIndex, or nil
	when none does.  A lookahead only: the cursor is restored."

	| saved |
	saved := position.
	position := anIndex.
	^ [[self parseExpression. self lastToken]
		on: SyntaxError do: [:ex | ex return: nil]]
		ensure: [position := saved]

]

{ #category : 'Grail-parsing' }
PythonParser >> ___lastTokenOfLine___ [
	"The last token before the NEWLINE that ends the current logical line."

	| j |
	j := position.
	[j < tokens size and: [((tokens at: j + 1) type == #NEWLINE
		or: [(tokens at: j + 1) type == #ENDMARKER]) not]] whileTrue: [j := j + 1].
	^ tokens at: (j min: tokens size)

]

{ #category : 'Grail-name mangling' }
PythonParser >> ___mangle___: aName [
	"CPython PRIVATE-NAME MANGLING, applied as each identifier is recorded.

	An identifier spelled ``__x'' anywhere inside a class body -- method bodies,
	nested defs, lambdas, comprehensions, defaults and decorators included --
	is rewritten to ``_C__x''.  The rule is LEXICAL, which is why it belongs
	here rather than in codegen: codegen used to mangle only the attribute-shaped
	names (class attributes, private methods, ``self.__x''), and applying it to
	bare names there as well cannot be made consistent.  Every scope set this
	parser builds -- variables, writes, globals, parameters -- is keyed on the
	name AS RECORDED, so a name mangled only at emit time is looked up under
	one spelling and bound under another.  Tried and measured: mangling the
	emit alone fixed ``global __x'' and broke a walrus targeting the
	pre-mangled spelling, two cases that had passed.  Mangling at the source
	gives every downstream consumer, text and IR, a single spelling.

	WHAT STAYS RAW, each measured on CPython 3.14.6:
	  * a def's or class's own NAME field -- __name__ and __qualname__ keep the
	    written spelling (``C.__m''); only the binding is mangled, through
	    declareWrite: here and ___mangledName___ / ___manglePrivate___: in
	    codegen;
	  * call-site keywords -- ``self.f(__a=1)'' passes __a even inside C;
	  * attribute names -- AttributeAst mangles those itself;
	  * anything outside a class body, and every dunder.

	The rule itself is AbstractNode class >> ___mangle___:forClass:, shared
	with codegen so the two cannot disagree.  It is idempotent, so codegen's
	existing calls pass harmlessly over names already mangled here.  Answers
	aName itself when nothing changes."

	| stack m |
	stack := self ___mangleClassStack___.
	stack isEmpty ifTrue: [^ aName].
	m := AbstractNode ___mangle___: aName forClass: stack last.
	m == aName ifTrue: [^ aName].
	^ m asSymbol

]

{ #category : 'Grail-name mangling' }
PythonParser >> ___mangleClassStack___ [
	"The enclosing class names, innermost last.  Lazy because an f-string's
	child parser is made with basicNew and is handed its parent's stack
	afterwards (___mangleClassStack___:) -- a field ``{__v}'' inside a method
	must mangle exactly as the same name outside the braces does."

	^ mangleClassStack ifNil: [mangleClassStack := OrderedCollection new]

]

{ #category : 'Grail-name mangling' }
PythonParser >> ___mangleClassStack___: aCollection [
	mangleClassStack := aCollection

]

{ #category : 'Grail-parsing - compound statements' }
PythonParser >> ___markAsyncFunctionDef: funcNode [
	"Record that funcNode was written ``async def'' -- but ONLY when doing so
	does not destroy a more important classification.

	Both async-def parse paths used to re-class unconditionally, and inside a
	CLASS BODY that overwrote the Instance/Static/ClassFunctionDefAst the def
	had just been given.  ClassDefAst collects a class's methods by selecting
	InstanceFunctionDefAst nodes, so an ``async def'' in a class body was
	collected by nothing and SILENTLY DISCARDED -- the method simply did not
	exist:

	    class C:
	        async def m(self): ...
	    hasattr(C, 'm')        # False; CPython says True

	Nothing was reported, at parse time or after.  ``async def'' at MODULE
	scope was unaffected, which is why this survived: the node is a plain
	FunctionDefAst there and re-classing it costs nothing.

	The guard is ``still a plain FunctionDefAst''.  AsyncFunctionDefAst is a
	pure MARKER -- it adds no methods and overrides no codegen, because Grail
	emits ``async def'' as a regular def (see AsyncFunctionDefAst's class
	comment and AwaitAst) -- so declining to apply it inside a class body loses
	nothing that generates code, while applying it lost the method entirely.
	THE FLAG is what carries ``this was async'' now that the class cannot.  It is
	set UNCONDITIONALLY, so a class-body async def is both an
	InstanceFunctionDefAst and async, and FunctionDefAst >> ___wrapsBody___ can
	ask the question the codegen actually needs.  The changeClassTo: is kept for
	the module-scope case only, where it costs nothing and is what
	PythonParserTestCase pins."

	funcNode isAsync: true.
	funcNode class == FunctionDefAst ifTrue: [
		funcNode changeClassTo: AsyncFunctionDefAst].
	^funcNode

]

{ #category : 'Grail-parsing - match' }
PythonParser >> ___matchSequenceOf___: elts from: tok [
	"Build a sequence pattern.  More than one star is CPython's code
	generator's error, not its grammar's, so it is raised after the parse
	with the others (MatchSequenceAst >> ___validateBinding___:irrefutableAllowed:)."

	^MatchSequenceAst new
		patterns: elts;
		from: tok to: self lastToken ; yourself

]

{ #category : 'Grail-parsing - atoms' }
PythonParser >> ___messageOf___: aSyntaxError [
	"aSyntaxError's message: its ``msg'' when one was stored, its messageText
	when it was signalled without Python arguments."

	| message |
	message := aSyntaxError dynamicInstVarAt: #'msg'.
	^ (message isKindOf: CharacterCollection)
		ifTrue: [message]
		ifFalse: [aSyntaxError messageText]

]

{ #category : 'Grail-parsing - atoms' }
PythonParser >> ___parseDictOrSetDisplay___ [

	| startTok first elts |
	startTok := self advance. "consume '{'"

	"Empty dict"
	(self atOp: '}') ifTrue: [
		self advance.
		^DictAst new
			keys: Array new;
			values: Array new;
			from: startTok to: self lastToken ; yourself
	].

	"Check for **unpack in dict"
	(self atOp: '**') ifTrue: [
		^self parseDictDisplayFromStar: startTok
	].

	first := self parseStarExpression.
	self ___checkStrayEquals___: first.

	"Dict: key : value"
	(self matchOp: ':') ifTrue: [
		| value keys values |

		value := self ___parseDictValue___.

		"Dict comprehension — ``for`` or ``async for`` opens the clause"
		((self atKeyword: 'for') or: [self atKeyword: 'async']) ifTrue: [
			| generators |
			generators := self parseComprehensions.
			self expect: #OP value: '}'.
			^DictCompAst new
				key: first;
				value: value;
				generators: generators;
				from: startTok to: self lastToken ; yourself
		].

		"Regular dict"
		keys := Array new.
		values := Array new.
		keys add: first.
		values add: value.
		[self matchOp: ','] whileTrue: [
			(self atOp: '}') ifFalse: [
				(self atOp: '**') ifTrue: [
					self advance.
					keys add: nil.
					values add: self parseBitwiseOr.
				] ifFalse: [
					keys add: self parseExpression.
					self ___expectDictColonAfter___: keys last.
					values add: self ___parseDictValue___.
				].
			].
		].
		self ___checkUnparenthesizedComprehension___: 'invalid syntax'.
		self expect: #OP value: '}'.
		^DictAst new
			keys: keys;
			values: values;
			from: startTok to: self lastToken ; yourself
	].

	"Set comprehension — ``for`` or ``async for`` opens the clause"
	((self atKeyword: 'for') or: [self atKeyword: 'async']) ifTrue: [
		| generators |
		(first isKindOf: StarredAst) ifTrue: [
			^ self ___syntaxError___: 'iterable unpacking cannot be used in comprehension'
				node: first].
		generators := self parseComprehensions.
		self expect: #OP value: '}'.
		^SetCompAst new
			elt: first;
			generators: generators;
			from: startTok to: self lastToken ; yourself
	].

	"Regular set"
	elts := Array new.
	elts add: first.
	[self matchOp: ','] whileTrue: [
		(self atOp: '}') ifFalse: [
			elts add: self parseStarExpression.
			self ___checkStrayEquals___: elts last.
		].
	].
	self ___checkUnparenthesizedComprehension___: 'did you forget parentheses around the comprehension target?'
		elements: elts.
	self expect: #OP value: '}'.
	^SetAst new
		elts: elts;
		from: startTok to: self lastToken ; yourself

]

{ #category : 'Grail-parsing' }
PythonParser >> ___parseDictValue___ [
	"A dictionary value after its ``:''.  CPython names the two ways it goes
	wrong: nothing there, and a starred expression."

	| tok |
	tok := self peek.
	(tok notNil and: [(tok isOp: '}') or: [tok isOp: ',']]) ifTrue: [
		^ self ___syntaxError___: 'expression expected after dictionary key and '':'''
			at: self lastToken].
	(tok notNil and: [tok isOp: '*']) ifTrue: [
		self advance.
		^ self ___syntaxError___: 'cannot use a starred expression in a dictionary value'
			from: tok to: self ___endOfNextExpression___].
	^ self parseExpression

]

{ #category : 'Grail-parsing' }
PythonParser >> ___parseEvalExpression___ [
	"One element of eval input: CPython's ``expression'', a lambda or a
	conditional expression -- not a starred one, not a named expression, not a
	yield, each of which only a statement or a bracket admits."

	| tok |
	tok := self peek.
	((tok notNil and: [(tok isOp: '*') or: [tok isKeyword: 'yield']]))
		ifTrue: [^ self ___invalidSyntaxAt___: tok].
	^ (tok notNil and: [tok isKeyword: 'lambda'])
		ifTrue: [self parseLambda]
		ifFalse: [self parseTernary]

]

{ #category : 'Grail-parsing' }
PythonParser >> ___parseEvalInput___ [
	"CPython's eval rule, ``eval: expressions NEWLINE* ENDMARKER''
	(Grammar/python.gram): one expression, or several separated by commas, and
	nothing after.  The first token outside it is ``invalid syntax'' there.

	Parsed as a module, ``x = 1 = 2'' raised the assignment's own ``cannot
	assign to literal'', ``f'' = 3'' its f-string refusal, and ``x = 1'' or
	``del x'' an ``invalid syntax'' with no location at all, found only after
	the whole module had parsed (test_fstring test_assignment, test_del)."

	| startTok value elements |
	startTok := self peek.
	self ___atEvalInputEnd___ ifTrue: [^ self ___invalidSyntaxAt___: startTok].
	value := self ___parseEvalExpression___.
	(self atOp: ',') ifTrue: [
		elements := OrderedCollection with: value.
		[(self matchOp: ',') and: [self ___atEvalInputEnd___ not]]
			whileTrue: [elements add: self ___parseEvalExpression___].
		value := TupleAst new
			elts: elements asArray;
			ctx: self loadCtx;
			from: startTok to: self lastToken;
			yourself].
	self skipNewlines.
	self ___atEvalInputEnd___ ifFalse: [^ self ___invalidSyntaxAt___: self peek].
	^ Array with: (ExprAst new
		value: value;
		from: startTok to: self lastToken;
		yourself)

]

{ #category : 'Grail-parsing - atoms' }
PythonParser >> ___parseFStringLiteralToken___: aToken [
	"Parse aToken, and nothing else, as an f-string literal."

	tokens := Array with: aToken.
	position := 1.
	^ self parseFStringLiteral

]

{ #category : 'Grail-parsing' }
PythonParser >> ___parseLeadingAtom___ [
	"The shortest prefix of an expression that PEG backtracking can leave
	parsed: its unary operators and ``not''s, then one atom."

	[self peek notNil
		and: [(#('+' '-' '~' '*') anySatisfy: [:operator | self peek isOp: operator])
			or: [self peek isKeyword: 'not']]]
				whileTrue: [self advance].
	^ self parseAtom

]

{ #category : 'Grail-parsing - atoms' }
PythonParser >> ___parseListDisplay___ [

	| startTok expr elts |
	startTok := self advance. "consume '['"

	"Empty list"
	(self atOp: ']') ifTrue: [
		self advance.
		^ListAst new
			elts: Array new;
			ctx: self loadCtx;
			from: startTok to: self lastToken ; yourself
	].

	expr := self parseStarExpression.
	self ___checkStrayEquals___: expr.

	"List comprehension — either ``for`` or ``async for`` opens the clause"
	((self atKeyword: 'for') or: [self atKeyword: 'async']) ifTrue: [
		| generators |
		(expr isKindOf: StarredAst) ifTrue: [
			^ self ___syntaxError___: 'iterable unpacking cannot be used in comprehension'
				node: expr].
		generators := self parseComprehensions.
		self expect: #OP value: ']'.
		^ListCompAst new
			elt: expr;
			generators: generators;
			from: startTok to: self lastToken ; yourself
	].

	"Regular list"
	elts := Array new.
	elts add: expr.
	[self matchOp: ','] whileTrue: [
		(self atOp: ']') ifFalse: [
			elts add: self parseStarExpression.
			self ___checkStrayEquals___: elts last.
		].
	].
	self ___checkUnparenthesizedComprehension___: 'did you forget parentheses around the comprehension target?'
		elements: elts.
	self expect: #OP value: ']'.
	^ListAst new
		elts: elts;
		ctx: self loadCtx;
		from: startTok to: self lastToken ; yourself

]

{ #category : 'Grail-parsing - atoms' }
PythonParser >> ___parseParenExpr___ [

	| startTok expr exprs |
	startTok := self advance. "consume '('"

	"Empty tuple"
	(self atOp: ')') ifTrue: [
		self advance.
		^TupleAst new
			elts: Array new;
			ctx: self loadCtx;
			from: startTok to: self lastToken ; yourself
	].

	(self atOp: '**') ifTrue: [
		^ self ___syntaxError___: 'cannot use double starred expression here' at: self peek].
	"A YIELD EXPRESSION IS A WHOLE GROUP: CPython's group is ``'(' (yield_expr
	| named_expression) ')''', one of the few places a yield may start -- see
	___parseStarExpressionsOrYield___.  An f-string field arrives here too,
	parsed as ``(expr)''."
	(self atKeyword: 'yield') ifTrue: [
		expr := self parseYieldExpression.
		self expect: #OP value: ')'.
		^ expr].
	expr := self parseStarExpression.
	self ___checkStrayEquals___: expr.

	"Check for comprehension (generator expression) — ``for`` or ``async for`` opens the clause"
	((self atKeyword: 'for') or: [self atKeyword: 'async']) ifTrue: [
		| generators |
		(expr isKindOf: StarredAst) ifTrue: [
			^ self ___syntaxError___: 'iterable unpacking cannot be used in comprehension'
				node: expr].
		generators := self parseComprehensions.
		self expect: #OP value: ')'.
		^GeneratorExpAst new
			elt: expr;
			generators: generators;
			from: startTok to: self lastToken ; yourself
	].

	"Tuple or single expression"
	(self matchOp: ',') ifTrue: [
		"Tuple"
		exprs := Array new.
		exprs add: expr.
		(self atOp: ')') ifFalse: [
			exprs add: self parseStarExpression.
			self ___checkStrayEquals___: exprs last.
			[self matchOp: ','] whileTrue: [
				(self atOp: ')') ifFalse: [
					exprs add: self parseStarExpression.
					self ___checkStrayEquals___: exprs last.
				].
			].
		].
		self ___checkUnparenthesizedComprehension___: 'invalid syntax'.
		self expect: #OP value: ')'.
		^TupleAst new
			elts: exprs;
			ctx: self loadCtx;
			from: startTok to: self lastToken ; yourself
	] ifFalse: [
		"Parenthesized single expression"
		(expr isKindOf: StarredAst) ifTrue: [
			^ self ___syntaxError___: 'cannot use starred expression here' node: expr].
		self expect: #OP value: ')'.
		^expr
	].

]

{ #category : 'Grail-parsing - expressions' }
PythonParser >> ___parseStarExpressionsOrYield___ [
	"An assignment's right-hand side: CPython's ``yield_expr |
	star_expressions'', for ``='', the augmented forms and an annotated
	assignment's value.  A yield expression may start here and nowhere inside
	an expression -- see parseAtom."

	(self atKeyword: 'yield') ifTrue: [^ self parseYieldExpression].
	^ self parseStarExpressions

]

{ #category : 'Grail-parsing - expressions' }
PythonParser >> ___parseTernary___ [
	"parseTernary's parse."

	| expr startTok startIndex |
	startTok := self peek.
	startIndex := position.
	expr := self parseDisjunction.
	expressionHead := startIndex to: position - 1.
	(self atKeyword: 'if') ifTrue: [
		| test orelse |
		self advance. "consume 'if'"
		test := self parseDisjunction.
		"CPython's invalid_expression: a conditional with no else names
		itself, from its body to its condition -- and an else with no
		expression after it says that a statement was given."
		(self atKeyword: 'else') ifFalse: [
			(self atOp: ':') ifTrue: [^ self ___invalidSyntaxAt___: self peek].
			^ self ___syntaxError___: 'expected ''else'' after ''if'' expression'
				from: startTok to: test].
		self advance.
		(self ___canStartExpression___: self peek) ifFalse: [
			^ self ___syntaxError___:
				'expected expression after ''else'', but statement is given'
				at: self peek].
		"``disjunction 'if' disjunction 'else' expression'' -- the else arm
		is EXPRESSION, so ``(a if b else c := 1)'' is not a walrus in the
		arm but a walrus applied to the whole conditional, which CPython
		refuses by name.  Parsed permitted, the arm swallowed the ``:=''
		and the construct was accepted."
		orelse := self
			___withWalrus___: false
			refusal: 'cannot use assignment expressions with conditional expression'
			do: [self parseExpression].
		^IfExpAst new
			test: test;
			body: expr;
			orelse: orelse;
			from: startTok to: self lastToken ; yourself
	].
	^expr

]

{ #category : 'Grail-parsing' }
PythonParser >> ___parsingEvalInput___ [
	"Whether this parse is of eval() input or compile(..., 'eval') source,
	which CPython parses with its eval rule rather than as a module (PythonParser
	class >> parseEvalInput:)."

	^ evalInput == true

]

{ #category : 'Grail-parsing' }
PythonParser >> ___parsingForAst___ [
	"Whether this parse builds the tree the ast module answers (builtins >>
	___astTreeFor___:mode:optimized:level:), which is the tree the source
	spells: a generic def or class there stays a FunctionDef or ClassDef with
	its type_params, not the annotation scope ___rewriteTypeParamStatement___
	compiles it as.  A generic type alias is still rewritten -- the parser has
	no module-level TypeAlias with parameters to build instead."

	^ (SessionTemps current at: #'GrailParsingForAst' otherwise: nil) == true

]

{ #category : 'Grail-parsing - statements' }
PythonParser >> ___py2StatementKeywordOf___: aStmt [
	"``print'' or ``exec'' when aStmt is an expression statement that is exactly
	that bare NAME -- the two Python-2 statement keywords CPython gives a
	migration hint for.  Answers nil for anything else, including a CALL of
	either (``print(x)'' is an ExprAst wrapping a CallAst, not a NameAst)."

	| val |
	(aStmt isKindOf: ExprAst) ifFalse: [^ nil].
	val := aStmt value.
	(val isKindOf: NameAst) ifFalse: [^ nil].
	((val id asString = 'print') or: [val id asString = 'exec'])
		ifTrue: [^ val id asString].
	^ nil

]

{ #category : 'Grail-parsing' }
PythonParser >> ___raise___: aClass message: aMessage from: startTokOrNode to: endTokOrNode [
	| startPos endPos |
	startPos := startTokOrNode isNil ifTrue: [nil] ifFalse: [startTokOrNode position].
	startPos isNil ifTrue: [^ aClass signal: aMessage].
	endPos := endTokOrNode isNil ifTrue: [nil] ifFalse: [endTokOrNode endPosition].
	endPos isNil ifTrue: [endPos := startPos].
	"An operator's width is its text; a newline or end-of-input marker is one
	character wide (___signal___: counts it past the end of the line)."
	((endTokOrNode isKindOf: PythonToken) and: [endTokOrNode type == #OP])
		ifTrue: [endPos := endPos max: endTokOrNode position + endTokOrNode value size - 1].
	((endTokOrNode isKindOf: PythonToken)
		and: [#(#NEWLINE #ENDMARKER #DEDENT) includes: endTokOrNode type])
			ifTrue: [endPos := endTokOrNode position].
	^ PythonParser ___signal___: aClass message: aMessage in: source
		from: startPos to: endPos + 1

]

{ #category : 'Grail-parsing - compound statements' }
PythonParser >> ___recordDecoratorLines___: decorators on: aNode [
	"Keep each decorator's expression node on the def or class it decorates,
	and answer aNode (#1406).  CPython runs a decorator at its own line and
	starts a decorated def's code object at the first one; the def's decorator
	list cannot say, because a bare ``@name'' is reduced to a Symbol.  The
	nodes, not just their lines: the IR arm positions a send at a node."

	decorators isEmpty ifFalse: [
		aNode dynamicInstVarAt: #decoratorNodes put: decorators asArray].
	^ aNode

]

{ #category : 'Grail-token access' }
PythonParser >> ___recordTypeParamBound___: someTokens in: names [
	"Append a TypeVar's bound to its entry in names -- ``T:b'' or, for a
	parenthesised tuple, ``T:c'' (constraints, the syntactic distinction CPython
	makes), then the bound's SOURCE, hex-encoded.

	Source rather than an AST because the entry is a string literal in four
	generated places (the def cascade and its IR twin, the class-side method
	table, the class's own names) and in ExecBlock's side table, and only
	ExecBlock class >> ___pyTypeVarNamed___:globals: ever reads it: that is where
	the bound is evaluated, on first read of __type_params__, in the defining
	module's globals -- CPython evaluates it lazily too.  HEX because a bound may
	be anything, and nothing that lands in a Smalltalk literal can break it.

	A bound holding a STRING token (``T: 'Fwd''') is dropped, as every bound
	was before: its token value is the decoded string, not the source, so it
	cannot be rebuilt faithfully."

	| src kind last |
	(someTokens isNil or: [someTokens isEmpty]) ifTrue: [^ self].
	names isEmpty ifTrue: [^ self].
	(someTokens anySatisfy: [:t | t type == #STRING]) ifTrue: [^ self].
	src := WriteStream on: String new.
	someTokens do: [:t | src nextPutAll: t value asString] separatedBy: [src space].
	kind := 'b'.
	((someTokens first isOp: '(') and: [(someTokens last isOp: ')')
		and: [self ___tokensHaveTopLevelComma___: someTokens]]) ifTrue: [kind := 'c'].
	last := names removeLast.
	names add: last , ':' , kind , (self ___hexPairs___: src contents)

]

{ #category : 'Grail-parsing' }
PythonParser >> ___rejectStarredOperand___ [
	"An operand cannot be starred: ``1 + *2'' is invalid syntax at the star.
	parseAtom builds a StarredAst wherever an atom may stand, which the star-
	aware callers (assignment targets, displays, calls, subscripts) rely on, so
	the refusal is made here, after an operator, where no star is legal."

	(self atOp: '*') ifTrue: [^ self ___invalidSyntaxAt___: self peek]

]

{ #category : 'Grail-target validation' }
PythonParser >> ___reportForTargetFrom___: aPosition comprehension: aBoolean [
	"A ``for'' whose target is not followed by ``in''.  CPython re-reads
	what follows the ``for'': in a comprehension, bitwise_or expressions not
	followed by ``in'' are ``'in' expected after for-loop variables''
	(invalid_for_if_clause); then the whole as star_expressions, where a
	target that cannot be assigned to is named (invalid_for_target --
	``for x + 1 in y'' is ``cannot assign to expression'').  Otherwise it is
	the generic error, at the token the target stopped on."

	| failTok expr bad |
	failTok := self peek.
	aBoolean ifTrue: [
		position := aPosition.
		expr := [self parseBitwiseOr. [self matchOp: ','] whileTrue: [
					(self atKeyword: 'in') ifFalse: [self parseBitwiseOr]]. true]
			on: SyntaxError do: [:ex | ex return: false].
		(expr and: [(self atKeyword: 'in') not]) ifTrue: [
			^ self ___syntaxError___: '''in'' expected after for-loop variables'
				at: self peek]].
	position := aPosition.
	expr := [self parseStarExpressions] on: SyntaxError do: [:ex | ex return: nil].
	expr isNil ifFalse: [
		bad := self ___invalidTarget___: expr kind: #for.
		bad isNil ifFalse: [
			^ self ___syntaxError___: 'cannot assign to ' , (self ___exprName___: bad)
				node: bad]].
	^ self ___invalidSyntaxAt___: failTok

]

{ #category : 'Grail-parsing - atoms' }
PythonParser >> ___resignal___: anError message: aMessage in: aWrappedSource token: aTok field: aFieldStart at: anExpressionStart [
	"Raise aMessage where anError, from the child parse of aWrappedSource,
	was located -- moved onto the field, whose expression starts at
	anExpressionStart -- or at the expression's start when it was not."

	| start end |
	start := self ___fieldIndexOf___: anError line: #'lineno' offset: #'offset'
		in: aWrappedSource at: anExpressionStart.
	start isNil ifTrue: [^ self ___fieldSyntaxError___: aMessage token: aTok fieldAt: aFieldStart
		from: anExpressionStart to: nil].
	end := self ___fieldIndexOf___: anError line: #'end_lineno' offset: #'end_offset'
		in: aWrappedSource at: anExpressionStart.
	^ self ___fieldSyntaxError___: aMessage token: aTok fieldAt: aFieldStart
		from: start to: ((end notNil and: [end > start]) ifTrue: [end] ifFalse: [nil])

]

{ #category : 'Grail-scope tracking' }
PythonParser >> ___retractTargetRead___: aNameAst [
	"aNameAst was parsed as a load, and counted as a read of this scope, before
	its statement made it a target: take that one mention back (see
	ownReadStack in pushScope)."

	ownReadStack last remove: aNameAst id ifAbsent: []

]

{ #category : 'Grail-parsing' }
PythonParser >> ___rewriteGenericFunctionAt___: i decorators: decoRanges [
	"``[async] def f[T](params) -> R: body'' at module or function level,
	rewritten as the class and alias forms are (___rewriteTypeParamStatement___)
	into the annotation scope CPython's compiler builds for it:

	    def ___generic_parameters_of_f___(___tpdefault1___):
	        global f                  -- nonlocal f inside a function
	        ___typing___ = __import__('_typing')
	        T = ___typing___._grail_type_param(0, 'T', None, None, None)
	        def f(x=___tpdefault1___) -> R:
	            body
	        f.__type_params__ = (T,)
	        return f
	    f = deco(___generic_parameters_of_f___(<the default>))
	    del ___generic_parameters_of_f___

	so T is bound for the body and the annotations, which used to raise
	NameError.  The DEFAULTS are evaluated outside, before the scope function
	runs, as CPython evaluates them (Python/codegen.c, codegen_function):
	``def f[A](a=list[A]())'' stays a NameError.  The global / nonlocal
	declaration makes the def bind the function's own name, so a body that
	calls f reaches the decorated f, as in CPython, not a scope-local copy.

	A METHOD -- a def directly in a class body -- is rewritten too, inside a
	synthesized ``if True:'' and without the declaration: its name is a class
	attribute, bound by the class body's own assignment.  As for a generic
	class there (___rewriteTypeParamStatement___), the scope function is then
	emitted inline in the class build, so its bounds see the class namespace,
	and the method is the plain function it returns -- which a class attribute
	binds on an instance read as CPython's does.  It used to keep its parameter
	NAMES only, its bounds evaluated in the module's globals: T was a NameError
	in its annotations and body, and a bound naming a class attribute or an
	enclosing local was lost (test_type_params test_method_access_01,
	test_bound)."

	| defAt nameTok lb rb pOpen pClose colon range params name w ref out names
	  segments defaults inClassBody |
	defAt := ((tokens at: i) isKeyword: 'async') ifTrue: [i + 1] ifFalse: [i].
	defAt + 2 > tokens size ifTrue: [^ false].
	nameTok := tokens at: defAt + 1.
	(nameTok isName and: [(tokens at: defAt + 2) isOp: '[']) ifFalse: [^ false].
	lb := defAt + 2.
	rb := self ___indexOfClose___: lb.
	rb isNil ifTrue: [^ false].
	pOpen := rb + 1.
	(pOpen <= tokens size and: [(tokens at: pOpen) isOp: '(']) ifFalse: [^ false].
	pClose := self ___indexOfClose___: pOpen.
	pClose isNil ifTrue: [^ false].
	colon := self ___headerColonAfter___: pClose.
	colon isNil ifTrue: [^ false].
	range := self ___bodyRangeAfterColon___: colon.
	range isNil ifTrue: [^ false].
	self ___checkTypeParamsAt___: lb.
	params := self ___typeParamsFrom: lb + 1 to: rb - 1.
	params isEmpty ifTrue: [^ false].
	name := nameTok value asString.
	w := '___generic_parameters_of_' , name , '___'.
	ref := tokens at: i.
	names := String new.
	params do: [:p | names := names , (p at: 2) , ','].
	segments := self ___segmentsFrom: pOpen + 1 to: pClose - 1.
	defaults := OrderedCollection new.
	segments do: [:seg |
		(self ___topLevelEqualsIn___: seg) ifNotNil: [:at |
			defaults add: (seg copyFrom: at + 1 to: seg size)]].
	out := OrderedCollection new.
	inClassBody := classNesting > 0.
	inClassBody ifTrue: [
		self ___synth: 'if True:' like: ref into: out.
		self ___synthType: #NEWLINE like: ref into: out.
		self ___synthType: #INDENT like: ref into: out].
	self ___synth: 'def ' , w , '(' like: ref into: out.
	1 to: defaults size do: [:n |
		self ___synth: '___tpdefault' , n printString , '___,' like: ref into: out].
	self ___synth: '):' like: ref into: out.
	self ___synthType: #NEWLINE like: ref into: out.
	self ___synthType: #INDENT like: ref into: out.
	inClassBody ifFalse: [
		self ___synth: (((variableStack size > 1) and: [((globalStack last) includes: name asSymbol) not])
				ifTrue: ['nonlocal '] ifFalse: ['global ']) , name
			like: ref into: out.
		self ___synthType: #NEWLINE like: ref into: out].
	self ___synth: '___typing___ = __import__(''_typing'')' like: ref into: out.
	self ___synthType: #NEWLINE like: ref into: out.
	params do: [:p | self ___emitTypeParam: p like: ref into: out].
	i to: defAt do: [:k | out add: (tokens at: k)].
	out add: nameTok.
	out add: (tokens at: pOpen).
	self ___emitParameters: segments withDefaultsAs: '___tpdefault' like: ref into: out.
	pClose to: colon do: [:k | out add: (tokens at: k)].
	self ___synthType: #NEWLINE like: ref into: out.
	self ___synthType: #INDENT like: ref into: out.
	(range at: 1) to: (range at: 2) do: [:k | out add: (tokens at: k)].
	self ___synthType: #DEDENT like: ref into: out.
	self ___synth: name , '.__type_params__ = (' , names , ')' like: ref into: out.
	self ___synthType: #NEWLINE like: ref into: out.
	self ___synth: 'return ' , name like: ref into: out.
	self ___synthType: #NEWLINE like: ref into: out.
	self ___synthType: #DEDENT like: ref into: out.
	inClassBody ifTrue: [self ___synthType: #DEDENT like: ref into: out].
	self ___synth: name , ' =' like: ref into: out.
	decoRanges do: [:r |
		(r at: 1) to: (r at: 2) do: [:k | out add: (tokens at: k)].
		self ___synth: '(' like: ref into: out].
	self ___synth: w , '(' like: ref into: out.
	defaults do: [:expression |
		expression do: [:k | out add: (tokens at: k)].
		self ___synth: ',' like: ref into: out].
	self ___synth: ')' like: ref into: out.
	decoRanges size timesRepeat: [self ___synth: ')' like: ref into: out].
	self ___synthType: #NEWLINE like: ref into: out.
	self ___synth: 'del ' , w like: ref into: out.
	self ___synthType: #NEWLINE like: ref into: out.
	tokens := (tokens copyFrom: 1 to: position - 1) , out asArray
		, (tokens copyFrom: (range at: 3) + 1 to: tokens size).
	^ true

]

{ #category : 'Grail-parsing - type params' }
PythonParser >> ___rewriteTypeParamStatement___ [
	"PEP 695 type parameters on a CLASS or a TYPE ALIAS, by rewriting the tokens
	into what CPython's compiler builds -- an annotation scope that binds the
	parameters, with the definition inside it:

	    @deco
	    class C[T: int](Base, metaclass=M): body

	becomes

	    def ___generic_parameters_of_C___():
	        ___typing___ = __import__('_typing')
	        T = ___typing___._grail_type_param(0, 'T', lambda: int, None, None)
	        class C(Base, ___typing___._grail_generic_base((T,)), metaclass=M):
	            body
	        C.__type_params__ = (T,)
	        return C
	    C = deco(___generic_parameters_of_C___())
	    del ___generic_parameters_of_C___

	and ``type A[T] = V'' becomes the same function returning
	``___typing___._grail_type_alias('A', lambda: V, (T,))''.

	WHY TOKENS, and not an AST built by hand.  The parser keeps scope books as
	it goes -- declared writes, reads, globals, nonlocals, the class-nesting
	count, the private-name mangling stack -- and a synthesized FunctionDefAst
	would have to reproduce every one of them to be compiled correctly.
	Rewriting the tokens in place lets the ordinary def/class/assign parsers
	keep those books, so T is an ordinary local of the scope function and an
	ordinary free variable everywhere inside it: the class body, its methods,
	its lazily-evaluated annotations (``class Bar[T]: x: T''), a bound that
	names an earlier parameter.  None of that was reachable before, when only
	the NAMES were kept (skipTypeParams) and T resolved to whatever the
	enclosing scope happened to hold.

	The generic base is CPython's too: _Py_subscript_generic appends
	``Generic[*params]'' after the positional bases, which is what makes
	``class X[T](NamedTuple)'' have __orig_bases__ ``(NamedTuple, Generic[T])''
	and ``X[int]'' work at all.  The scope function is transparent to
	__qualname__ (CallAst class >> ___isTypeParamScope___:), as CPython's
	annotation scope is.

	Directly in a CLASS BODY (classNesting > 0) the scope function goes inside
	a synthesized ``if True:''.  CPython's annotation scope there sees the
	class namespace (Python/symtable.c:2872): ``class C: class Base: ...;
	class Child[T](Base)'' reads C's Base, and ``type A[X] = T'' after ``T =
	int'' C's T.  A class-body def compiled as a METHOD has no hold on the
	class it is defined in -- the body calls it with no receiver -- while a def
	in a class-body ``if'' is emitted inline in the class build, as a closure
	that sees the class's own variable (FunctionDefAst >>
	printSmalltalkClassBodyRuntimeDefOn:), which is what NameAst >>
	___annotationScopeClass___ reads it through.  A generic CLASS there used to
	keep its parameter names only, so its own T was a NameError in its body
	and its bases had no Generic[T].  Answers whether it rewrote anything; when
	it did, the tokens at ``position'' now start the scope function's
	statement."

	| i decoRanges kwTok nameTok isClass lb rb params w ref out names c indent
	  bodyStart bodyEnd end name segs valueEnd inClassBody |
	i := position.
	decoRanges := OrderedCollection new.
	[i <= tokens size and: [(tokens at: i) isOp: '@']] whileTrue: [
		| j |
		j := i + 1.
		[j <= tokens size and: [(tokens at: j) isNewline not]] whileTrue: [j := j + 1].
		decoRanges add: (Array with: i + 1 with: j - 1).
		i := j + 1].
	i + 2 > tokens size ifTrue: [^ false].
	kwTok := tokens at: i.
	"A generic FUNCTION outside a class body has a rewrite of its own."
	((kwTok isKeyword: 'def') or: [(kwTok isKeyword: 'async')
		and: [(tokens at: i + 1) isKeyword: 'def']]) ifTrue: [
			self ___parsingForAst___ ifTrue: [^ false].
			^ self ___rewriteGenericFunctionAt___: i decorators: decoRanges].
	isClass := kwTok isKeyword: 'class'.
	(isClass and: [self ___parsingForAst___]) ifTrue: [^ false].
	(isClass or: [decoRanges isEmpty and: [kwTok isName and: [kwTok value = 'type']]])
		ifFalse: [^ false].
	nameTok := tokens at: i + 1.
	(nameTok isName and: [(tokens at: i + 2) isOp: '[']) ifFalse: [^ false].
	lb := i + 2.
	rb := self ___indexOfClose___: lb.
	rb isNil ifTrue: [^ false].
	self ___checkTypeParamsAt___: lb.
	params := self ___typeParamsFrom: lb + 1 to: rb - 1.
	params isEmpty ifTrue: [^ false].
	name := nameTok value asString.
	w := '___generic_parameters_of_' , name , '___'.
	ref := kwTok.
	names := String new.
	params do: [:p | names := names , (p at: 2) , ','].
	out := OrderedCollection new.
	inClassBody := classNesting > 0.
	inClassBody ifTrue: [
		self ___synth: 'if True:' like: ref into: out.
		self ___synthType: #NEWLINE like: ref into: out.
		self ___synthType: #INDENT like: ref into: out].
	self ___synth: 'def ' , w , '():' like: ref into: out.
	self ___synthType: #NEWLINE like: ref into: out.
	self ___synthType: #INDENT like: ref into: out.
	self ___synth: '___typing___ = __import__(''_typing'')' like: ref into: out.
	self ___synthType: #NEWLINE like: ref into: out.
	params do: [:p | self ___emitTypeParam: p like: ref into: out].
	isClass
		ifTrue: [
			c := rb + 1.
			segs := #().
			(c <= tokens size and: [(tokens at: c) isOp: '(']) ifTrue: [
				| close |
				close := self ___indexOfClose___: c.
				close isNil ifTrue: [^ false].
				segs := self ___segmentsFrom: c + 1 to: close - 1.
				c := close + 1].
			((tokens at: c) isOp: ':') ifFalse: [^ false].
			self ___synth: 'class ' , name , '(' like: ref into: out.
			(segs reject: [:s | self ___isKeywordArgument___: s]) do: [:s |
				s do: [:k | out add: (tokens at: k)].
				self ___synth: ',' like: ref into: out].
			self ___synth: '___typing___._grail_generic_base((' , names , '))' like: ref into: out.
			(segs select: [:s | self ___isKeywordArgument___: s]) do: [:s |
				self ___synth: ',' like: ref into: out.
				s do: [:k | out add: (tokens at: k)]].
			self ___synth: '):' like: ref into: out.
			self ___synthType: #NEWLINE like: ref into: out.
			self ___synthType: #INDENT like: ref into: out.
			"An indented body, after however many NEWLINE tokens: a comment
			line between the header and the first statement is a NEWLINE of
			its own, and reading only one of them mistook ``class G[T]:
			# note'' for a one-line body."
			indent := c + 1.
			[indent <= tokens size and: [(tokens at: indent) isNewline]]
				whileTrue: [indent := indent + 1].
			(indent > (c + 1) and: [indent <= tokens size
				and: [(tokens at: indent) type == #INDENT]])
				ifTrue: [
					bodyStart := indent + 1.
					end := self ___indexOfMatchingDedent___: indent.
					end isNil ifTrue: [^ false].
					bodyEnd := end - 1]
				ifFalse: [
					bodyStart := c + 1.
					end := bodyStart.
					[end <= tokens size and: [(tokens at: end) isNewline not]]
						whileTrue: [end := end + 1].
					end > tokens size ifTrue: [^ false].
					bodyEnd := end].
			bodyStart to: bodyEnd do: [:k | out add: (tokens at: k)].
			self ___synthType: #DEDENT like: ref into: out.
			"Stored on the finished class, not bound in its body: a body binding
			is an attribute subclasses INHERIT, and CPython's __type_params__ is
			read from the class's own dict -- ``type('C', (A,), {})'' answers
			``()''.  A store lands in the class's own holder, which is exactly
			what Behavior >> __type_params__ reads."
			self ___synth: name , '.__type_params__ = (' , names , ')' like: ref into: out.
			self ___synthType: #NEWLINE like: ref into: out.
			self ___synth: 'return ' , name like: ref into: out]
		ifFalse: [
			((tokens at: rb + 1) isOp: '=') ifFalse: [^ false].
			end := rb + 2.
			[end <= tokens size and: [(tokens at: end) isNewline not
				and: [((tokens at: end) isOp: ';') not]]] whileTrue: [end := end + 1].
			end > tokens size ifTrue: [^ false].
			valueEnd := end - 1.
			self ___synth: 'return ___typing___._grail_type_alias(''' , name , ''', lambda:'
				like: ref into: out.
			rb + 2 to: valueEnd do: [:k | out add: (tokens at: k)].
			self ___synth: ', (' , names , '))' like: ref into: out].
	self ___synthType: #NEWLINE like: ref into: out.
	self ___synthType: #DEDENT like: ref into: out.
	inClassBody ifTrue: [self ___synthType: #DEDENT like: ref into: out].
	self ___synth: name , ' =' like: ref into: out.
	decoRanges do: [:r |
		(r at: 1) to: (r at: 2) do: [:k | out add: (tokens at: k)].
		self ___synth: '(' like: ref into: out].
	self ___synth: w , '()' like: ref into: out.
	decoRanges size timesRepeat: [self ___synth: ')' like: ref into: out].
	self ___synthType: #NEWLINE like: ref into: out.
	self ___synth: 'del ' , w like: ref into: out.
	self ___synthType: #NEWLINE like: ref into: out.
	tokens := (tokens copyFrom: 1 to: position - 1) , out asArray
		, (tokens copyFrom: end + 1 to: tokens size).
	^ true

]

{ #category : 'Grail-target validation' }
PythonParser >> ___rhsAfterEqualsIsBitwiseOr___ [
	"At an ``='': does a bitwise_or follow it that is not itself followed by
	``='' or ``:=''?  The tail of CPython's invalid_named_expression.  Answers
	the parsed node, or nil.  Looks ahead only: the position is restored."

	| saved node tok |
	saved := position.
	^ [self advance.
	   tok := self peek.
	   (tok isNil or: [(tok isKeyword: 'not') or: [(tok isKeyword: 'lambda')
		or: [(tok isKeyword: 'yield') or: [(tok isOp: '*') or: [tok isOp: '**']]]]])
			ifTrue: [nil]
			ifFalse: [
				node := [self parseBitwiseOr] on: SyntaxError do: [:ex | ex return: nil].
				(node notNil and: [(tok := self peek) notNil
					and: [(tok isOp: '=') or: [tok isOp: ':=']]]) ifTrue: [node := nil].
				node]]
		ensure: [position := saved]

]

{ #category : 'Grail-parsing - type params' }
PythonParser >> ___segmentsFrom: first to: last [
	"The comma-separated pieces of tokens first..last at bracket depth 0, each
	as an Array of token indexes.  An empty piece (a trailing comma) is
	dropped."

	| result current depth |
	result := OrderedCollection new.
	current := OrderedCollection new.
	depth := 0.
	first to: last do: [:k |
		| t |
		t := tokens at: k.
		((t isOp: '(') or: [(t isOp: '[') or: [t isOp: '{']]) ifTrue: [depth := depth + 1].
		((t isOp: ')') or: [(t isOp: ']') or: [t isOp: '}']]) ifTrue: [depth := depth - 1].
		(depth = 0 and: [t isOp: ','])
			ifTrue: [
				current isEmpty ifFalse: [result add: current asArray].
				current := OrderedCollection new]
			ifFalse: [current add: k]].
	current isEmpty ifFalse: [result add: current asArray].
	^ result

]

{ #category : 'Grail-parsing - atoms' }
PythonParser >> ___signalBytesMixAt___: aToken [
	"CPython's ``cannot mix bytes and nonbytes literals'', at the token its
	parser fetched last: the one after the run -- of which only the opening,
	prefix and quotes, when it is an f-string or a t-string, because CPython's
	lexer hands that over as a token of its own."

	| openingEnd |
	(aToken isFString or: [aToken isTString]) ifFalse: [
		^ self ___syntaxError___: 'cannot mix bytes and nonbytes literals' at: aToken].
	openingEnd := aToken position.
	[(source at: openingEnd) isLetter] whileTrue: [openingEnd := openingEnd + 1].
	openingEnd := openingEnd + ((self ___isTripleQuoteIn: source at: openingEnd) ifTrue: [3] ifFalse: [1]).
	^ PythonParser ___signal___: SyntaxError
		message: 'cannot mix bytes and nonbytes literals'
		in: source from: aToken position to: openingEnd

]

{ #category : 'Grail-parsing - simple statements' }
PythonParser >> ___signalDeclarationSyntaxError___: aMessage at: aToken [
	"A declaration CPython's symbol table refuses (``name 'x' is parameter and
	global''), located as it locates it: the whole global, nonlocal or
	annotated statement."

	| i j |
	i := self ___tokenIndexAt___: aToken position.
	i = 0 ifTrue: [^ SyntaxError signal: aMessage].
	j := i.
	[j < tokens size and: [((tokens at: j + 1) type == #NEWLINE
		or: [((tokens at: j + 1) isOp: ';') or: [(tokens at: j + 1) type == #ENDMARKER]]) not]]
			whileTrue: [j := j + 1].
	^ self ___syntaxError___: aMessage from: aToken to: (tokens at: j)

]

{ #category : 'Grail-parsing - atoms' }
PythonParser >> ___signalFieldError___: anError in: aWrappedSource token: aTok field: aFieldStart at: anExpressionStart [
	"anError, raised by the child parse of a replacement field's expression
	(aWrappedSource, the expression in parentheses, its first character at
	anExpressionStart of the field), as CPython reports it.  The wrapping is
	Grail's, so two kinds of error are its artifacts: a plain ``invalid
	syntax'', and the messages a parenthesized group has and a bare field does
	not.  CPython's own field rules answer those
	(___signalFieldStrayIn___:...); a starred field is codegen's error there.
	Any other error is the expression's own, moved from the child's
	coordinates to the field's: Grail reported it at the child's, so
	``f'{a +}''' pointed at column 5 of the source whatever the field's place
	in it (test_fstring test_invalid_syntax_error_message)."

	| message |
	message := self ___messageOf___: anError.
	"A bracket the field leaves open, in a field the f-string ended inside of:
	CPython's parser asks for the token after it and meets its lexer's error
	first (``f'{a(''')."
	((self ___isOpenField___: aFieldStart of: aTok) and: [message endsWith: 'was never closed'])
		ifTrue: [^ self ___signalOpenFieldOf___: aTok].
	message = 'cannot use starred expression here' ifTrue: [
		^ self ___resignal___: anError message: 'can''t use starred expression here'
			in: aWrappedSource token: aTok field: aFieldStart at: anExpressionStart].
	(#('invalid syntax' 'invalid syntax. Maybe you meant ''=='' or '':='' instead of ''=''?')
		includes: message) ifTrue: [
			^ self ___signalFieldStrayIn___: aWrappedSource token: aTok field: aFieldStart at: anExpressionStart].
	^ self ___resignal___: anError message: message
		in: aWrappedSource token: aTok field: aFieldStart at: anExpressionStart

]

{ #category : 'Grail-parsing - atoms' }
PythonParser >> ___signalFieldStrayIn___: aWrappedSource token: aTok field: aFieldStart at: anExpressionStart [
	"CPython's errors for a replacement field whose expression is not one
	(Grammar/python.gram:1510-1527, invalid_fstring_replacement_field): the
	longest leading run of its tokens that is an expression, and the token
	after it.  None at all: ``expecting a valid expression after '{'''.  Then
	the debug ``='' and something other than a conversion, spec or end:
	``expecting '!', or ':', or '}'''.  Otherwise the stray token:
	``expecting '=', or '!', or ':', or '}'''.  Each is located at the token
	it names.  Grail reported ``invalid syntax'' (test_fstring
	test_invalid_syntax_error_message, test_missing_expression)."

	| fieldTokens prefixEnd stray |
	fieldTokens := self ___fieldTokensIn___: aWrappedSource.
	prefixEnd := (fieldTokens size to: 1 by: -1)
		detect: [:k | self ___isExpression___: (aWrappedSource copyFrom: 1 to: (fieldTokens at: k) endPosition) , ')']
		ifNone: [0].
	stray := prefixEnd < fieldTokens size ifTrue: [fieldTokens at: prefixEnd + 1] ifFalse: [nil].
	"A field the f-string ended inside of: CPython's lexer error, whenever the
	parser would have asked for the token that was not there -- nothing after
	the ``{'', or nothing that ends the expression, or a string (whose next
	token the parser fetches first)."
	((self ___isOpenField___: aFieldStart of: aTok)
		and: [fieldTokens isEmpty or: [aTok isOpenInFormatSpec not
			and: [stray isNil or: [stray isAnyString]]]])
				ifTrue: [^ self ___signalOpenFieldOf___: aTok].
	fieldTokens isEmpty ifTrue: [
		^ self ___fstringError___: 'expecting a valid expression after ''{''' token: aTok
			fieldAt: aFieldStart index: anExpressionStart].
	prefixEnd = 0 ifTrue: [
		^ self ___fstringError___: 'expecting a valid expression after ''{'''
			token: aTok field: aFieldStart tokenAt: fieldTokens first at: anExpressionStart].
	((stray isOp: '=') and: [prefixEnd + 2 <= fieldTokens size]) ifTrue: [
		^ self ___fstringError___: 'expecting ''!'', or '':'', or ''}'''
			token: aTok field: aFieldStart tokenAt: (fieldTokens at: prefixEnd + 2) at: anExpressionStart].
	^ self ___fstringError___: 'expecting ''='', or ''!'', or '':'', or ''}'''
		token: aTok field: aFieldStart tokenAt: stray at: anExpressionStart

]

{ #category : 'Grail-parsing' }
PythonParser >> ___signalMissingCommaBefore___: aTok [
	"CPython's invalid_expression (Grammar/python.gram:1248-1250): inside
	brackets, an expression whose head disjunction is followed directly by
	another expression is ``invalid syntax. Perhaps you forgot a comma?'',
	from the head to the end of the other.  Not when the head opens with a soft
	keyword or is a NAME followed by a string -- the shapes of a misspelt
	statement or string prefix -- nor when it is the legacy print or exec.
	Answer self when the rule does not apply.

	The head is the one parseTernary recorded last, which is the one that ends
	right before aTok when the rule applies: a comprehension's iterable and
	conditions are parsed as disjunctions, not expressions, and record none, as
	CPython's grammar has no expression there (``[a for x in y z]'' is plain
	invalid syntax)."

	| head index last |
	head := expressionHead.
	index := tokens indexOf: aTok.
	(head notEmpty and: [head last + 1 = index]) ifFalse: [^ self].
	((self ___canStartExpression___: aTok) and: [(self ___bracketLevelAt___: index) > 0])
		ifFalse: [^ self].
	(self ___excludesMissingCommaAt___: head) ifTrue: [^ self].
	self ___isInsideStringLedOperands___ ifTrue: [^ self].
	last := self ___lastTokenOfExpressionFrom___: index.
	last isNil ifTrue: [^ self].
	^ self ___syntaxError___: 'invalid syntax. Perhaps you forgot a comma?'
		from: (tokens at: head first) to: last

]

{ #category : 'Grail-parsing - atoms' }
PythonParser >> ___signalNoFStringConversionIn___: aFieldText at: anIndex token: aTok fieldAt: aFieldStart [
	"CPython's errors for a ``!'' with no NAME right after it, each located at
	what follows the ``!'' (Grammar/python.gram:1528-1530 and
	Parser/action_helpers.c:968-974): nothing before the ``:'' or ``}'', a
	NAME separated from the ``!'', or something that is not a NAME."

	| next nameEnd |
	next := PythonTokenizer ___indexAfterWhitespaceIn___: aFieldText from: anIndex + 1.
	"The f-string ended before a conversion could follow: CPython's lexer
	error, met as the parser asked for the NAME (``f'{3!''')."
	(next > aFieldText size and: [aTok openFieldAt notNil]) ifTrue: [
		^ self ___signalOpenFieldOf___: aTok].
	(next <= aFieldText size and: [':}' includesValue: (aFieldText at: next)]) ifTrue: [
		^ self ___fstringError___: 'missing conversion character' token: aTok fieldAt: aFieldStart index: next].
	nameEnd := PythonTokenizer ___identifierEndIn___: aFieldText from: next.
	nameEnd > next ifTrue: [
		^ self ___fstringError___: 'conversion type must come right after the exclamation mark'
			token: aTok fieldAt: aFieldStart from: anIndex to: nameEnd].
	^ self ___fstringError___: 'invalid conversion character' token: aTok fieldAt: aFieldStart index: next

]

{ #category : 'Grail-parsing - atoms' }
PythonParser >> ___signalOpenFieldOf___: anFString [
	"The error of anFString, a token that ended with its last replacement field
	open, once nothing in the field is wrong before its end: CPython's
	``expecting '}', or format specs'' at the quote that ended it inside the
	format spec, or its lexer's ``expecting '}''' -- a point, at the string
	inside the field that took the f-string's quote
	(Parser/lexer/lexer.c:1180-1192; test_fstring test_mismatched_braces)."

	| prefix |
	prefix := anFString isTString ifTrue: ['t-string: '] ifFalse: ['f-string: '].
	anFString isOpenInFormatSpec ifTrue: [
		^ PythonParser ___signal___: SyntaxError
			message: prefix , 'expecting ''}'', or format specs'
			in: source from: anFString openFieldAt to: anFString openFieldAt + 1].
	^ PythonParser ___signal___: SyntaxError
		message: prefix , 'expecting ''}'''
		in: source from: anFString openFieldAt to: nil

]

{ #category : 'Grail-parsing' }
PythonParser >> ___signalPendingTabError___ [
	"The TabError the tokenizer noted, if it noted one: CPython's E_TABSPACE,
	on its line at offset 1 with an end_offset of 0."

	tabErrorPosition ifNil: [^ self].
	^ PythonParser ___signalLocated___: TabError
		message: 'inconsistent use of tabs and spaces in indentation'
		in: source
		at: tabErrorPosition
		endOffset: 0

]

{ #category : 'Grail-parsing' }
PythonParser >> ___signalSyntaxError___: aMessage from: startTok to: endTok [
	"Raise a SyntaxError that SPANS a range of source, not just a point.

	The boundary handler in ``parse:'' fills in a location for any error that
	lacks one, but it can only report where the parser was LOOKING -- one
	position, and by then usually past the construct that was wrong.  An error
	about a whole construct wants the construct's extent: CPython underlines all
	of ``y for y in range(30)'' for an unparenthesized generator expression, and
	the boundary would have drawn a single caret somewhere after it.  So a site
	that knows its own span says so, and the boundary leaves it alone (it fills
	only an ABSENT lineno).

	``endTok'' is INCLUSIVE -- the last token of the construct -- and its width is
	added, because CPython's end_offset points one PAST the last character."

	| startPos loc offset endPos endOffset locTuple |
	startPos := startTok isNil ifTrue: [nil] ifFalse: [startTok position].
	loc := PythonParser ___sourceLocationIn___: source at: startPos.
	"No usable position: fall back to the plain signal and let the boundary try."
	loc isNil ifTrue: [^ SyntaxError signal: aMessage].
	offset := loc @env0:at: 2.
	endPos := (endTok isNil or: [endTok position isNil])
		ifTrue: [nil]
		ifFalse: [endTok position
			+ (endTok value isNil ifTrue: [1] ifFalse: [endTok value size])].
	endOffset := endPos isNil
		ifTrue: [offset + 1]
		ifFalse: [offset + (endPos - startPos)].
	locTuple := Array @env0:new: 6.
	locTuple @env0:at: 1 put: '<string>'.
	locTuple @env0:at: 2 put: (loc @env0:at: 1).
	locTuple @env0:at: 3 put: offset.
	locTuple @env0:at: 4 put: (loc @env0:at: 3).
	locTuple @env0:at: 5 put: (loc @env0:at: 1).
	locTuple @env0:at: 6 put: endOffset.
	^ SyntaxError @env1:___signalNew___:
		(Array @env0:with: aMessage with: (tuple @env0:withAll: locTuple))
		kw: nil

]

{ #category : 'Grail-parsing' }
PythonParser >> ___signalTryWithoutHandler___ [
	"``expected 'except' or 'finally' block'', where CPython puts it: at the
	newline ending the try's body, with an end_offset of -1."

	| k |
	k := position - 1.
	[k >= 1 and: [(tokens at: k) type ~~ #NEWLINE]] whileTrue: [k := k - 1].
	k < 1 ifTrue: [^ self ___syntaxError___: 'expected ''except'' or ''finally'' block' at: self peek].
	^ PythonParser ___signalLocated___: SyntaxError
		message: 'expected ''except'' or ''finally'' block'
		in: source at: (tokens at: k) position endOffset: -1

]

{ #category : 'Grail-parsing' }
PythonParser >> ___sourceText___: aString [
	"The text this parser locates its errors in, for a parse of one token cut
	from it rather than of all of it (___fstringSpecExprFor:at:)."

	source := aString

]

{ #category : 'Grail-parsing - atoms' }
PythonParser >> ___specFieldStartFor: anFString field: aFieldStart at: aBraceIndex specSize: aSpecSize [
	"The anchor of a field nested in a format spec, whose brace is at
	aBraceIndex of anFString's value and whose spec so far is aSpecSize long:
	{ its text's index in the spec. its source offset. its line }, the shape
	PythonToken >> fieldStarts holds -- or nil when the enclosing field has no
	anchor of its own.  The spec's text may be shorter than the source before
	it (its escapes are decoded), but a field's text is verbatim, so one anchor
	per field is enough."

	| anchor sourceOffset location |
	anchor := anFString fieldStarts ifNil: [nil] ifNotNil: [:fs |
		fs detect: [:a | (a at: 1) = aFieldStart] ifNone: [nil]].
	anchor isNil ifTrue: [^ nil].
	sourceOffset := (anchor at: 2) - (anchor at: 1) + aBraceIndex + 1.
	location := PythonParser ___sourceLocationIn___: source at: sourceOffset.
	location isNil ifTrue: [^ nil].
	^ { aSpecSize + 2. sourceOffset. location at: 1 }

]

{ #category : 'Grail-target validation' }
PythonParser >> ___startsWithExcludedAtom___: aNode [
	"CPython's ``!(list|tuple|genexp|'True'|'None'|'False')'' lookahead: does
	the source at aNode begin with one of those?"

	| tok i close |
	i := self ___tokenIndexAt___: aNode position.
	i = 0 ifTrue: [^ false].
	tok := tokens at: i.
	((tok isKeyword: 'None') or: [(tok isKeyword: 'True') or: [tok isKeyword: 'False']])
		ifTrue: [^ true].
	((tok isOp: '(') or: [tok isOp: '[']) ifFalse: [^ false].
	close := self ___indexOfClose___: i.
	close isNil ifTrue: [^ false].
	(tok isOp: '[') ifTrue: [
		"a list display, not a list comprehension"
		^ ((i + 1 to: close - 1) anySatisfy: [:k | (tokens at: k) isKeyword: 'for']) not].
	"a tuple or a generator expression, not a plain group"
	^ (self ___segmentsFrom: i + 1 to: close - 1) size > 1
		or: [((tokens at: close - 1) isOp: ',')
		or: [(i + 1 to: close - 1) anySatisfy: [:k | (tokens at: k) isKeyword: 'for']]]

]

{ #category : 'Grail-parsing - atoms' }
PythonParser >> ___stringsMixBytesFrom___: aStartIndex to: anEndIndex [
	"Whether the string literals from aStartIndex to anEndIndex hold both bytes
	and something else."

	| strings |
	strings := (aStartIndex to: anEndIndex) collect: [:index | tokens at: index].
	^ (strings anySatisfy: [:each | each isBytes])
		and: [strings anySatisfy: [:each | each isBytes not]]

]

{ #category : 'Grail-parsing' }
PythonParser >> ___syntaxError___: aMessage at: aTok [
	"CPython's RAISE_SYNTAX_ERROR_KNOWN_LOCATION on a token: the whole token."

	^ self ___syntaxError___: aMessage from: aTok to: aTok

]

{ #category : 'Grail-parsing' }
PythonParser >> ___syntaxError___: aMessage from: startTokOrNode to: endTokOrNode [
	"CPython's RAISE_SYNTAX_ERROR_KNOWN_RANGE: from the first character of
	the first token or node to one past the last character of the second."

	^ self ___raise___: SyntaxError message: aMessage
		from: startTokOrNode to: endTokOrNode

]

{ #category : 'Grail-parsing' }
PythonParser >> ___syntaxError___: aMessage node: aNode [
	"A compile-time error about one construct, located at its node."

	^ self ___syntaxError___: aMessage from: aNode to: aNode

]

{ #category : 'Grail-parsing - type params' }
PythonParser >> ___synth: aString like: refTok into: out [
	"Append the tokens of a source FRAGMENT, each placed at refTok so an error
	in synthesized code reports the statement it came from.

	Scanned here rather than by PythonTokenizer, because the fragments are
	pieces of a statement -- ``class C('' and ``))'' -- and the tokenizer
	rightly refuses an unbalanced bracket.  The rewrite writes only names,
	keywords, small integers, single-quoted strings without escapes, ``**''
	and one-character operators, so that is all this recognises."

	| i n c keywords |
	keywords := PythonTokenizer keywords.
	i := 1.
	n := aString size.
	[i <= n] whileTrue: [
		c := aString at: i.
		c isSeparator
			ifTrue: [i := i + 1]
			ifFalse: [
				| j type value |
				j := i + 1.
				"The names here are the user's own, so PEP 3131's rule, as the
				tokenizer applies it."
				(PythonTokenizer ___isIdentifierStart___: c)
					ifTrue: [
						[j <= n and: [PythonTokenizer ___isIdentifierPart___: (aString at: j)]]
							whileTrue: [j := j + 1].
						value := aString copyFrom: i to: j - 1.
						type := (keywords includes: value) ifTrue: [#KEYWORD] ifFalse: [#NAME]]
					ifFalse: [
						c isDigit
							ifTrue: [
								[j <= n and: [(aString at: j) isDigit]] whileTrue: [j := j + 1].
								value := aString copyFrom: i to: j - 1.
								type := #NUMBER]
							ifFalse: [
								c == $'
									ifTrue: [
										[(aString at: j) == $'] whileFalse: [j := j + 1].
										value := aString copyFrom: i + 1 to: j - 1.
										j := j + 1.
										type := #STRING]
									ifFalse: [
										(c == $* and: [j <= n and: [(aString at: j) == $*]])
											ifTrue: [j := j + 1].
										value := aString copyFrom: i to: j - 1.
										type := #OP]]].
				self ___synthType: type value: value like: refTok into: out.
				i := j]]

]

{ #category : 'Grail-parsing - type params' }
PythonParser >> ___synthType: aType like: refTok into: out [
	self ___synthType: aType value: '' like: refTok into: out

]

{ #category : 'Grail-parsing - type params' }
PythonParser >> ___synthType: aType value: aString like: refTok into: out [
	out add: ((PythonToken type: aType value: aString line: refTok line position: refTok position)
		endPosition: refTok endPosition; endLine: refTok endLine; yourself)

]

{ #category : 'Grail-parsing' }
PythonParser >> ___tabErrorPrecedes___: aSyntaxError [
	"Would CPython's lexer have met the noted TabError before the parser met
	aSyntaxError?  It would unless the parser failed on an earlier line --
	``\tif 1:'' is an unexpected indent on line 1, whatever line 3 does."

	| failure |
	tabErrorPosition ifNil: [^ false].
	(aSyntaxError isKindOf: TabError) ifTrue: [^ false].
	failure := self ___currentSourcePosition___.
	^ failure isNil or: [failure >= tabErrorPosition]

]

{ #category : 'Grail-parsing - atoms' }
PythonParser >> ___templateFromParts___: parts from: startTok [
	"PEP 750: a t-string's parts as a TemplateStrAst -- a call to
	string.templatelib's _from_literal with each literal run as a str and each
	field as a (value, expression, conversion, format_spec) tuple.

	Reached through ``__import__'' because Template and Interpolation are Python
	classes in string/templatelib.py; CPython's are C types the compiler builds
	directly, so it needs no name at all.  The parts are also kept on the node,
	unevaluated, for the STRING format's source text (TemplateStrAst)."

	| loc args templateParts callee |
	loc := startTok.
	args := OrderedCollection new.
	templateParts := OrderedCollection new.
	parts do: [:assoc |
		assoc key == #literal
			ifTrue: [
				args add: (self ___fstringPartToAst: assoc from: loc).
				templateParts add: assoc value asString]
			ifFalse: [ | f conv spec specAst |
				f := assoc value.
				conv := (f at: 3) isNil ifTrue: [nil] ifFalse: [(f at: 3) asString].
				spec := f at: 4.
				specAst := spec isNil
					ifTrue: [ConstantAst new value: ''; kind: nil; from: loc to: loc; yourself]
					ifFalse: [(spec includes: ${)
						ifTrue: [self ___fstringSpecExprFor: spec at: loc]
						ifFalse: [ConstantAst new value: spec asString; kind: nil; from: loc to: loc; yourself]].
				args add: (TupleAst new
					elts: { f at: 1.
						ConstantAst new value: (f at: 2); kind: nil; from: loc to: loc; yourself.
						ConstantAst new value: conv; kind: nil; from: loc to: loc; yourself.
						specAst };
					ctx: self loadCtx;
					from: loc to: loc; yourself).
				templateParts add: { f at: 2. conv. spec isNil ifTrue: [nil] ifFalse: [spec asString] }]].
	callee := AttributeAst new
		value: (CallAst new
			function: (NameAst new id: #'__import__'; ctx: self loadCtx; from: loc to: loc; yourself);
			arguments: {
				ConstantAst new value: 'string.templatelib'; kind: nil; from: loc to: loc; yourself.
				ConstantAst new value: nil; kind: nil; from: loc to: loc; yourself.
				ConstantAst new value: nil; kind: nil; from: loc to: loc; yourself.
				TupleAst new
					elts: { ConstantAst new value: '_from_literal'; kind: nil; from: loc to: loc; yourself };
					ctx: self loadCtx;
					from: loc to: loc; yourself };
			keywords: Array new;
			from: loc to: loc; yourself);
		attr: #'_from_literal';
		ctx: self loadCtx;
		from: loc to: loc; yourself.
	^ TemplateStrAst new
		function: callee;
		arguments: args asArray;
		keywords: Array new;
		templateParts: templateParts asArray;
		from: startTok to: self lastToken; yourself

]

{ #category : 'Grail-target validation' }
PythonParser >> ___tokenIndexAt___: aPosition [
	"The index in ``tokens'' of the token starting at source index aPosition."

	tokens doWithIndex: [:each :i | each position = aPosition ifTrue: [^ i]].
	^ 0

]

{ #category : 'Grail-token access' }
PythonParser >> ___tokensHaveTopLevelComma___: someTokens [
	"Is ``( ... )'' a TUPLE -- a comma directly inside the outer parentheses --
	rather than a parenthesised single expression?"

	| depth |
	depth := 0.
	someTokens do: [:t |
		((t isOp: '(') or: [(t isOp: '[') or: [t isOp: '{']]) ifTrue: [depth := depth + 1].
		((t isOp: ')') or: [(t isOp: ']') or: [t isOp: '}']]) ifTrue: [depth := depth - 1].
		(depth = 1 and: [t isOp: ',']) ifTrue: [^ true]].
	^ false

]

{ #category : 'Grail-parsing' }
PythonParser >> ___topLevelEqualsIn___: seg [
	"The position within seg of its first ``='' outside brackets -- where a type
	parameter's default starts -- or nil."

	| depth |
	depth := 0.
	seg doWithIndex: [:index :at |
		| t |
		t := tokens at: index.
		((t isOp: '(') or: [(t isOp: '[') or: [t isOp: '{']]) ifTrue: [depth := depth + 1].
		((t isOp: ')') or: [(t isOp: ']') or: [t isOp: '}']]) ifTrue: [depth := depth - 1].
		(depth = 0 and: [t isOp: '=']) ifTrue: [^ at]].
	^ nil

]

{ #category : 'Grail-parsing - type alias' }
PythonParser >> ___typeAliasTarget___: aToken [
	"The alias name as a STORE target -- ``type X = int'' binds X in the
	enclosing scope exactly as an assignment would."

	| node |
	node := NameAst new
		id: (self ___mangle___: aToken value asSymbol);
		ctx: self loadCtx;
		token: aToken ; yourself.
	self setStoreCtx: node.
	^node

]

{ #category : 'Grail-parsing' }
PythonParser >> ___typeParamNameIn___: seg [
	"The NAME token of the type parameter seg holds, past its stars, or nil."

	seg do: [:index |
		| t |
		t := tokens at: index.
		((t isOp: '*') or: [t isOp: '**']) ifFalse: [^ t isName ifTrue: [t] ifFalse: [nil]]].
	^ nil

]

{ #category : 'Grail-parsing - type params' }
PythonParser >> ___typeParamsFrom: first to: last [
	"Each type parameter between the brackets, as {kind. name. boundRange.
	constraintsRange. defaultRange} -- kind 0 TypeVar, 1 TypeVarTuple (``*Ts''),
	2 ParamSpec (``**P''); each range an Array of token indexes, or nil.

	``T: (A, B)'' is a CONSTRAINT tuple, not a bound -- CPython tells them
	apart syntactically, by the bound being a parenthesised tuple."

	| result |
	result := OrderedCollection new.
	(self ___segmentsFrom: first to: last) do: [:seg |
		| k kind pname eq bound constraints default |
		k := 1.
		kind := 0.
		((tokens at: (seg at: k)) isOp: '*') ifTrue: [kind := 1. k := k + 1].
		((tokens at: (seg at: k)) isOp: '**') ifTrue: [kind := 2. k := k + 1].
		pname := (tokens at: (seg at: k)) value asString.
		k := k + 1.
		eq := nil.
		k to: seg size do: [:m |
			(eq isNil and: [(tokens at: (seg at: m)) isOp: '=']) ifTrue: [eq := m]].
		bound := nil. constraints := nil. default := nil.
		(k <= seg size and: [(tokens at: (seg at: k)) isOp: ':']) ifTrue: [
			bound := seg copyFrom: k + 1 to: (eq ifNil: [seg size + 1]) - 1.
			(self ___isParenthesisedTuple___: bound)
				ifTrue: [constraints := bound. bound := nil]].
		eq notNil ifTrue: [default := seg copyFrom: eq + 1 to: seg size].
		result add: (Array with: kind with: pname with: bound with: constraints with: default)].
	^ result

]

{ #category : 'Grail-validation' }
PythonParser >> ___validateComprehensions___: node [
	"Walk node top-down, checking every comprehension found.  Same guards as
	ModuleAst >> collectGlobalNamesFrom:into:: strings are
	SequenceableCollections and recursing into one walks Characters for
	nothing, and ``parent'' is skipped so the walk cannot cycle upwards."

	node isNil ifTrue: [^ self].
	node isString ifTrue: [^ self].
	(node isKindOf: SequenceableCollection) ifTrue: [
		node do: [:each | self ___validateComprehensions___: each].
		^ self].
	(node isKindOf: AbstractNode) ifFalse: [^ self].
	"Check BEFORE recursing -- see the note above on why order matters."
	(self ___comprehensionGeneratorsOf___: node) ifNotNil: [:gens |
		self ___checkComprehension___: node generators: gens].
	node class allInstVarNames doWithIndex: [:nameSym :i |
		nameSym == #parent ifFalse: [
			self ___validateComprehensions___: (node instVarAt: i)]]

]

{ #category : 'Grail-token access' }
PythonParser >> ___variableStack___ [
	"Read access to the parser's variableStack — used by the
	f-string parser to harvest declared variables from a child
	parser back into the outer scope."

	^ variableStack

]

{ #category : 'Grail-parsing - expressions' }
PythonParser >> ___walrusRefusalMessage___ [
	"What to say about a ``:='' in a position the grammar forbids.
	``invalid syntax'' unless the site that forbade it asked for CPython's
	more specific word -- see ___withWalrus___:refusal:do:."

	^ walrusRefusal ifNil: ['invalid syntax']

]

{ #category : 'Grail-parsing - expressions' }
PythonParser >> ___walrusTargetName___: anExpr [
	"CPython's name for the shape anExpr is, for the message
	``cannot use assignment expressions with <name>'' -- or nil when
	anExpr is a bare NAME, the one target PEP 572 allows.

	This is _PyPegen_get_expr_name, which CPython's invalid_named_expression
	rule uses to say WHICH thing was written on the left.  Only the tuple
	case existed here, because it was the only one a test named; the rest
	fell through and were accepted, so ``(a.b := 1)'' and ``(f() := 1)''
	compiled to Smalltalk that either stored somewhere Python has no
	business storing or did not compile at all."

	(anExpr isKindOf: NameAst) ifTrue: [^ nil].
	^ self ___exprName___: anExpr

]

{ #category : 'Grail-parsing - expressions' }
PythonParser >> ___withWalrus___: aBoolean do: aBlock [
	"Evaluate aBlock with the walrus permitted (or not), restoring the
	previous setting afterwards.

	PEP 572 does not let ``:='' appear just anywhere: the grammar admits it
	only where the production is ``namedexpr_test'', which is why ``x := 0''
	is a SyntaxError while ``(x := 0)'' is fine.  The two produce the SAME
	AST, so this cannot be checked after parsing the way the async and
	parameter placement rules are -- the distinction is the parenthesis,
	and only the parser knows about it.

	Default FORBIDDEN, permitted explicitly at each site the grammar allows,
	which is the safer direction: a site missed here refuses valid code
	loudly rather than accepting invalid code silently, and the corpus finds
	it immediately."
	^ self ___withWalrus___: aBoolean refusal: nil do: aBlock

]

{ #category : 'Grail-parsing - expressions' }
PythonParser >> ___withWalrus___: aBoolean refusal: aStringOrNil do: aBlock [
	"As ___withWalrus___:do:, and additionally says what a ``:='' found
	here should be REFUSED with.  Two sites want a word other than
	``invalid syntax'', because CPython's grammar reaches the whole
	``<thing> := <value>'' through a rule that names what was on the left
	while Grail's recursive descent has already committed to the left:

	  * a LAMBDA BODY -- ``cannot use assignment expressions with lambda''
	  * a CONDITIONAL's else arm -- ``... with conditional expression''

	Saved and restored with walrusAllowed, and CLEARED by the plain
	___withWalrus___:do: -- so descending from a lambda body into any
	construct that decides walrus permission for itself gets the generic
	word back.  ``lambda: f(a=x := 1)'' is ``invalid syntax'' in CPython:
	the objection there is the keyword-argument value, not the lambda."

	| savedAllowed savedRefusal |
	savedAllowed := walrusAllowed.
	savedRefusal := walrusRefusal.
	walrusAllowed := aBoolean.
	walrusRefusal := aStringOrNil.
	^ [aBlock value] ensure: [
		walrusAllowed := savedAllowed.
		walrusRefusal := savedRefusal]

]

{ #category : 'Grail-parsing - atoms' }
PythonParser >> ___wrapFStringExpr: exprAst conversion: conversionChar formatSpec: formatSpec at: locTok [
	"Wrap an f-string placeholder expression in the conversion /
	format pipeline: ``___fformat___(expr, conversion, spec)'', which
	applies ``!s'' / ``!r'' / ``!a'' and then answers format(value, spec)
	-- CPython's CONVERT_VALUE + FORMAT_SIMPLE / FORMAT_WITH_SPEC.
	``locTok`` is a real PythonToken (the source f-string token) used for
	AST location info.

	It used to call the builtins BY NAME -- str(expr), repr(expr),
	format(expr, spec) -- and three things were wrong with that:
	  * they are ordinary names, so a local or module global called
	    ``format'' / ``str'' / ``repr'' captured every field:
	    ``def f(format): return f'{1:>3}''' raised ``'str' object is not
	    callable''.  CPython's opcodes look nothing up.
	  * a field with no spec ran str(), not format(value, ''), so a class
	    with its own __format__ lost it: ``f'{x}''' is ``x.__format__('')''.
	  * a field with BOTH a conversion and a spec dropped the conversion:
	    ``f'{s!r:>5}''' formatted ``s'', not ``repr(s)''.
	No Python name can shadow ``___fformat___'' (the ___ spelling is Grail's
	own), so the call site's builtin fast path always reaches builtins.

	A spec containing {expr} placeholders (``f'{x:0{w}d}''' -- PEP 498
	one-level nesting) becomes a runtime concatenation instead of a literal
	(___fstringSpecExprFor:at:); vendored fractions.py's __format__ tests
	build specs this way."

	| conversionText specAst |
	conversionText := conversionChar isNil
		ifTrue: ['']
		ifFalse: [conversionChar asString].
	specAst := formatSpec isNil
		ifTrue: [ConstantAst new value: ''; kind: nil; from: locTok to: locTok; yourself]
		ifFalse: [
			(formatSpec includes: ${)
				ifTrue: [self ___fstringSpecExprFor: formatSpec at: locTok]
				ifFalse: [
					ConstantAst new
						value: formatSpec;
						kind: nil;
						from: locTok to: locTok ; yourself]].
	^ CallAst new
		function: (NameAst new
			id: #'___fformat___';
			ctx: self loadCtx;
			from: locTok to: locTok ; yourself);
		arguments: { exprAst.
			ConstantAst new value: conversionText; kind: nil; from: locTok to: locTok; yourself.
			specAst };
		keywords: Array new;
		from: locTok to: locTok ; yourself

]

{ #category : 'Grail-token access' }
PythonParser >> advance [
	"Consume and return the current token."

	| tok |
	tok := tokens at: position.
	position := position + 1.
	^tok

]

{ #category : 'Grail-token access' }
PythonParser >> atKeyword: aString [
	"Check if the current token is the given keyword without consuming."

	| tok |
	tok := self peek.
	^tok notNil and: [tok isKeyword: aString]

]

{ #category : 'Grail-parsing - helpers' }
PythonParser >> atKeywordSkippingNewlines: aString [
	"True when the next non-newline token is the given keyword -- AND
	consume the intervening newlines in that case; otherwise leave the
	stream position untouched.  Needed for compound-statement
	continuations after a SINGLE-LINE suite: ``try: a.clear()'' leaves
	the trailing NEWLINE unconsumed, so a bare atKeyword: 'except'
	never matched and the clause fell out to statement level
	(test_bytes line 2409)."

	| saved |
	saved := position.
	self skipNewlines.
	(self atKeyword: aString) ifTrue: [^ true].
	position := saved.
	^ false

]

{ #category : 'Grail-parsing - match' }
PythonParser >> atMatchStatement [
	"Is the current NAME ``match'' opening a match STATEMENT rather than
	being used as an ordinary identifier?

	``match'' is a soft keyword, so this cannot be answered by the token
	alone.  CPython's grammar accepts it only as

	    match SUBJECT ':' NEWLINE INDENT

	so the test is: the next token could start an expression, and the
	logical line ends with a colon.  That distinguishes every real-world
	shape without backtracking:

	    match x:         -> statement    (':' ends the line)
	    match(x)         -> a call       (no ':')
	    match = 1        -> assignment   (next token cannot start an expr)
	    match, y = 1, 2  -> tuple assign (ditto)
	    match: int = 5   -> annotated    (ditto)
	    match[i] = 2     -> subscript    (no ':')
	    match[i]: int    -> annotated    (':' present but not last)

	Deciding by lookahead rather than by trying-and-backtracking matters
	for error quality: a syntax error INSIDE a real match statement stays
	a match-statement error instead of being silently re-reported as a
	confusing expression-statement error."

	| tok next depth i lastWasColon |
	tok := self peek.
	(tok notNil and: [tok isName and: [tok value = 'match']]) ifFalse: [^false].
	next := position + 1 <= tokens size ifTrue: [tokens at: position + 1] ifFalse: [nil].
	next ifNil: [^false].
	"An operator that cannot begin an expression means ``match'' is being
	used as a plain name.  '-', '+', '~', '*', '(', '[', '{' and the Ellipsis
	'...' CAN begin one -- ``match ...:'' is a statement (test_patma), which
	read as an expression statement and was invalid syntax."
	(next type == #OP and: [
		(#('-' '+' '~' '*' '(' '[' '{' '...') includes: next value) not]) ifTrue: [^false].
	next isEndMarker ifTrue: [^false].
	next type == #NEWLINE ifTrue: [^false].
	"Scan the logical line: the colon that opens the block is the LAST
	token on it, at bracket depth zero."
	depth := 0.
	i := position + 1.
	lastWasColon := false.
	[i <= tokens size] whileTrue: [
		| t |
		t := tokens at: i.
		t isEndMarker ifTrue: [^false].
		(t type == #NEWLINE and: [depth = 0]) ifTrue: [^lastWasColon].
		t type == #OP ifTrue: [
			(#('(' '[' '{') includes: t value) ifTrue: [depth := depth + 1].
			(#(')' ']' '}') includes: t value) ifTrue: [depth := depth - 1]].
		lastWasColon := depth = 0 and: [t type == #OP and: [t value = ':']].
		i := i + 1].
	^false

]

{ #category : 'Grail-token access' }
PythonParser >> atOp: aString [
	"Check if the current token is the given operator without consuming."

	| tok |
	tok := self peek.
	^tok notNil and: [tok isOp: aString]

]

{ #category : 'Grail-parsing - type alias' }
PythonParser >> atTypeAliasStatement [
	"Is the current NAME ``type'' opening a PEP 695 type-alias statement?

	``type'' is a soft keyword AND a builtin, so it appears as an ordinary
	identifier far more often than it opens a statement.  The grammar is

	    type NAME [type_params] '=' expression

	so the test is: ``type'' followed by a NAME, followed by ``='' or
	``[''.  Nothing else can look like that:

	    type X = int       -> statement    (NAME then '=')
	    type X[T] = list   -> statement    (NAME then '[')
	    type(x)            -> builtin call ('(' is not a NAME)
	    type = 5           -> assignment   ('=' is not a NAME)
	    type.__name__      -> attribute    ('.' is not a NAME)
	    isinstance(x, type)-> not at a statement head at all

	``type X'' with neither ``='' nor ``['' after it is not valid Python in
	any reading, so declining it here loses nothing."

	| tok next after |
	tok := self peek.
	(tok notNil and: [tok isName and: [tok value = 'type']]) ifFalse: [^false].
	next := position + 1 <= tokens size ifTrue: [tokens at: position + 1] ifFalse: [nil].
	(next notNil and: [next isName]) ifFalse: [^false].
	after := position + 2 <= tokens size ifTrue: [tokens at: position + 2] ifFalse: [nil].
	after ifNil: [^false].
	^(after isOp: '=') or: [after isOp: '[']

]

{ #category : 'Grail-parsing - statements' }
PythonParser >> checkSimpleStatementTerminator: lastStmt [
	"A run of simple statements ends at a NEWLINE or the end of input.  Anything
	else means two expressions were juxtaposed with no separator between them,
	which is a SyntaxError -- and used to parse as TWO STATEMENTS, silently:

	    print ''Hello World''      -> ExprAst(print), ExprAst(''Hello World'')

	so a Python-2 print statement ran the name lookup, discarded the string and
	reported nothing.  ``print p'' did raise, but as a NameError naming p, which
	is a confusing way to be told the syntax is Python 2.

	The PY2 HINT is CPython's, and it is why this check earns its place rather
	than merely answering ``invalid syntax'': a bare ``print'' or ``exec''
	followed by the start of another expression is the one juxtaposition common
	enough to name, so CPython names it (test_print's TestPy2MigrationHint, six
	tests).  The message must keep CPython's exact wording -- the tests match
	its text, not the exception type."

	| tok |
	tok := self peek.
	tok isNil ifTrue: [^ self].
	(tok isNewline or: [tok isEndMarker]) ifTrue: [^ self].
	"Every ``;'' has already been consumed by the caller's loop, so reaching
	here with one is impossible; a dedent is the block parser's business."
	(self ___py2StatementKeywordOf___: lastStmt) ifNotNil: [:kw |
		"From the keyword to the end of what follows it, as CPython's
		invalid_legacy_expression draws it -- when anything that follows
		parses at all; otherwise the plain error below."
		self ___endOfLegacyStatementArgument___ ifNotNil: [:end |
			^ self ___syntaxError___: 'Missing parentheses in call to ''' , kw
				, '''. Did you mean ' , kw , '(...)?'
				from: lastStmt to: end]].
	((tok isKeyword: 'if') and: [(lastStmt isKindOf: PassAst)
		or: [(lastStmt isKindOf: BreakAst) or: [lastStmt isKindOf: ContinueAst]]]) ifTrue: [
			^ self ___syntaxError___: 'expected expression before ''if'', but statement is given'
				node: lastStmt].
	^ self ___invalidSyntaxAt___: tok

]

{ #category : 'Grail-node construction' }
PythonParser >> declareParameter: aSymbol [
	"Register a parameter: in scope exactly as declareVariable: does, and
	additionally in the scope's PARAMETER set.

	The extra set exists for one caller -- ``global x'' has to report
	``name 'x' is parameter and global'' rather than one of the other
	three diagnostics, and declareVariable: alone cannot say which names
	were parameters (it is also used for f-string name propagation)."

	self declareVariable: aSymbol.
	paramStack last add: (self ___mangle___: aSymbol)

]

{ #category : 'Grail-node construction' }
PythonParser >> declareVariable: aSymbol [
	"Register a name as ``in scope'' here — used for name resolution.
	Adds to the current scope's variable set only.  Use this for
	parameter declarations (the name is bound externally, so it
	shouldn't count as a body write) and for scope-resolution hints
	like names propagated from inner parsers (f-string expressions).

	For genuine body bindings — NameAst store ctx, walrus targets,
	def/class/import names — use declareWrite: instead so the binding
	also lands in the block's write set."

	variableStack last add: (self ___mangle___: aSymbol).

]

{ #category : 'Grail-node construction' }
PythonParser >> declareWrite: aSymbol [
	"Register a name as both ``in scope'' and ``written in this
	scope''.  Use this for any binding-creating form whose name is a
	body-local write — assignment targets (via setStoreCtx:), walrus
	targets, def/class statement names, import aliases, etc.

	The duplicated variableStack registration keeps existing name-
	resolution callers (isVariableIsDeclared:, NameAst codegen)
	working unchanged; the writeStack entry feeds
	FunctionDefAst >> assignedNamesInBody and is what the method-arg
	optimisation consults to decide whether a param needs a temp.

	COMPREHENSION TARGETS are the exception (inCompTarget, set by
	parseComprehensions around its target registration): Python 3
	scopes them to the comprehension itself, not the enclosing
	function, so they must NOT land in the enclosing scope's write
	set — ``writes'' is the set of true Python locals bound in the
	scope (params live on the args node) and NameAst's LEGB
	resolution depends on its precision.  They do not land in
	variableStack either: ``variables'' is what BlockAst declares as
	Smalltalk temps and what isVariableIsDeclared: reports, so a leaked
	target made the enclosing scope declare a nil temp that a LATER read
	of the same name then found -- ``[x for x in range(3)]; return x''
	raised UnboundLocalError instead of reading the enclosing/global x
	(test_listcomps test_nested_free and eight siblings).  Reads INSIDE
	the comprehension resolve through NameAst >>
	___isEnclosingComprehensionTarget___:, a parent-chain walk that does
	not depend on this set, and the comprehension codegen declares each
	target as a block-local temp of its own emitted block."

	"Any NON-def binding of ``_'' (assignment, for-target, ``with ... as _'',
	import alias) reaches here already renamed to the base ``___unused___''.
	It rebinds the name, so a later read of ``_'' must see it rather than a
	numbered def -- see underscoreDefName."
	aSymbol == #'___unused___' ifTrue: [underscoreCurrentName := #'___unused___'].
	inCompTarget == true ifTrue: [
		"Remember it: a comprehension is its own SCOPE in Python 3, so its
		target neither binds nor reads in the enclosing function -- and
		``global c'' after ``[c for c in ...]'' is therefore legal.  The
		reads emitted inside the comprehension do land in this scope's
		readStack, which without this would report ``used prior to global
		declaration'' for code CPython accepts."
		compTargetStack last add: (self ___mangle___: aSymbol).
		^ self
	].
	"Mangled here as well as at each name's source: def, class and import
	 names reach this helper as RAW tokens, and their NODES keep the raw
	 spelling on purpose -- CPython mangles the BINDING (_C__m) but leaves
	 __name__ and __qualname__ as written (__m, C.__m)."
	variableStack last add: (self ___mangle___: aSymbol).
	writeStack last add: (self ___mangle___: aSymbol).

]

{ #category : 'Grail-node construction' }
PythonParser >> delCtx [

	^DelAst basicNew

]

{ #category : 'Grail-token access' }
PythonParser >> expect: aType value: aValue [
	"Consume a token matching the given type and value, or signal an error."

	| tok |
	tok := self advance.
	(tok type == aType and: [tok value = aValue]) ifFalse: [
		^ self ___invalidSyntaxAt___: tok].
	^tok

]

{ #category : 'Grail-token access' }
PythonParser >> expectType: aType [
	"Consume a token of the given type, or signal an error."

	| tok |
	tok := self advance.
	tok type == aType ifFalse: [
		^ self ___invalidSyntaxAt___: tok].
	^tok

]

{ #category : 'Grail-node construction' }
PythonParser >> lastSpanToken [
	"The most recently consumed token that OCCUPIES SOURCE TEXT -- the token a
	COMPOUND statement's span has to end on.

	``lastToken'' is the literal previous token, and after ``parseBlock'' that is
	the block's closing DEDENT.  A DEDENT is recognised by seeing the SMALLER
	INDENTATION OF THE NEXT STATEMENT, so it is emitted with the tokenizer already
	standing on that statement's first character.  Ending a span there swallowed
	every blank line after the block plus one character of whatever followed:
	``def answer():'' + ``return 42'' reported endLine 5 and a span ending on the
	``d'' of the next ``def'' (issue #825).

	Skipping ONE DEDENT is not enough.  Closing several suites at once emits
	several -- ``def outer():'' / ``if c:'' / ``return 1'' followed by a
	module-level statement dedents 8 to 0 in one step -- and the inner block's
	parseBlock consumed only the first.  Hence the loop.

	The NEWLINE that terminated the block's last statement is skipped for the same
	reason it is never part of a SIMPLE statement's span: those nodes are built
	BEFORE their terminator is consumed.  Stopping on it would make a compound
	statement end one character past the simple statement nested inside it.

	Answers the literal last token if everything consumed is layout -- unreachable
	after a block, but it keeps the accessor total rather than answering nil."

	| i tok |
	i := position - 1.
	[i >= 1] whileTrue: [
		tok := tokens at: i.
		(tok isNewline
			or: [tok isEndMarker
			or: [tok type == #'INDENT'
			or: [tok type == #'DEDENT']]]) ifFalse: [^ tok].
		i := i - 1].
	^ self lastToken

]

{ #category : 'Grail-node construction' }
PythonParser >> lastToken [
	"Return the most recently consumed token."

	^tokens at: position - 1

]

{ #category : 'Grail-node construction' }
PythonParser >> loadCtx [

	^LoadAst basicNew

]

{ #category : 'Grail-node construction' }
PythonParser >> markScopeReturnBlocking [
	"Mark the current scope as containing a node whose codegen places
	statements AFTER the inlined body in the same Smalltalk block
	(``with'', ``try-finally'').  When the enclosing function body's
	BlockAst is built, its ``hasReturnBlocking'' is set to true and
	FunctionDefAst falls back to PythonReturn-exception ``return''
	codegen rather than Smalltalk ``^ X.''."

	blockingStack at: blockingStack size put: true.

]

{ #category : 'Grail-token access' }
PythonParser >> matchKeyword: aString [
	"If the current token is the given keyword, consume it and return true."

	| tok |
	tok := self peek.
	(tok notNil and: [tok isKeyword: aString]) ifTrue: [
		self advance.
		^true
	].
	^false

]

{ #category : 'Grail-parsing - helpers' }
PythonParser >> matchOp: aString [
	"If the current token is the given operator, consume it and return true."

	| tok |
	tok := self peek.
	(tok notNil and: [tok isOp: aString]) ifTrue: [
		self advance.
		^true
	].
	^false

]

{ #category : 'Grail-parsing - helpers' }
PythonParser >> operatorClassFor: opString [
	"Return the operator AST class for the given operator string."

	opString = '+' ifTrue: [^AddAst].
	opString = '-' ifTrue: [^SubAst].
	opString = '*' ifTrue: [^MultAst].
	opString = '/' ifTrue: [^DivAst].
	opString = '//' ifTrue: [^FloorDivAst].
	opString = '%' ifTrue: [^ModAst].
	opString = '**' ifTrue: [^PowAst].
	opString = '@' ifTrue: [^MatMultAst].
	opString = '<<' ifTrue: [^LShiftAst].
	opString = '>>' ifTrue: [^RShiftAst].
	opString = '|' ifTrue: [^BitOrAst].
	opString = '^' ifTrue: [^BitXorAst].
	opString = '&' ifTrue: [^BitAndAst].
	SyntaxError signal: 'Unknown operator: ' , opString.

]

{ #category : 'Grail-parsing - simple statements' }
PythonParser >> parseAssert [
	"Parse: assert expr [, expr]"

	| tok test msg |
	tok := self advance. "consume 'assert'"
	test := self parseExpression.
	msg := nil.
	(self matchOp: ',') ifTrue: [
		msg := self parseExpression.
	].
	^ AssertAst new 
		test: test;
		msg: msg;
		from: tok to: self lastToken ; yourself

]

{ #category : 'Grail-parsing - compound statements' }
PythonParser >> parseAsync [
	"Parse: async def/for/with"

	| tok |
	tok := self advance. "consume 'async'"
	(self atKeyword: 'def') ifTrue: [
		| funcNode |
		funcNode := self parseFunctionDef.
		self ___markAsyncFunctionDef: funcNode.
		^funcNode
	].
	(self atKeyword: 'for') ifTrue: [
		| forNode |
		forNode := self parseFor.
		forNode changeClassTo: AsyncForAst.
		^forNode
	].
	(self atKeyword: 'with') ifTrue: [
		| withNode |
		withNode := self parseWith.
		withNode changeClassTo: AsyncWithAst.
		^withNode
	].
	^ self ___invalidSyntaxAt___: self peek

]

{ #category : 'Grail-parsing - expressions' }
PythonParser >> parseAtom [
	"Parse an atomic expression: literal, name, parenthesized, list, dict, set."

	| tok |
	tok := self peek.
	tok ifNil: [SyntaxError signal: 'Unexpected end of input'].

	"None, True, False"
	(tok isKeyword: 'None') ifTrue: [
		self advance.
		^ ConstantAst new
			value: nil;
			kind: nil;
			token: tok ; yourself 
	].
	(tok isKeyword: 'True') ifTrue: [
		self advance.
		^ConstantAst new
			value: true;
			kind: nil;
			token: tok ; yourself
	].
	(tok isKeyword: 'False') ifTrue: [
		self advance.
		^ConstantAst new
			value: false;
			kind: nil;
			token: tok ; yourself
	].

	"Numeric literals"
	tok isNumber ifTrue: [
		self advance.
		^ConstantAst new
			value: (self parseNumberValue: tok value);
			kind: nil;
			token: tok ; yourself
	].

	"Adjacent string literals are one run whatever their kinds; a run whose
	kinds cannot be concatenated is refused first."
	tok isAnyString ifTrue: [self ___checkStringRunFrom___: position].

	"String literals (may be multiple concatenated).  When any
	adjacent token is an FSTRING, drop into the f-string parser
	which handles mixed STRING+FSTRING runs and emits a concat
	chain."
	"PEP 750 t-string: the same field scanner, building a Template instead."
	tok isTString ifTrue: [^ self parseFStringLiteral].
	(tok isString or: [tok isFString]) ifTrue: [
		"Look ahead: if any token in the adjacent string run is an
		FSTRING, route through parseFStringLiteral; otherwise the
		fast path produces a plain ConstantAst."
		| scan anyF |
		scan := position.
		anyF := false.
		[scan <= tokens size
			and: [(tokens at: scan) isString
				or: [(tokens at: scan) isFString or: [(tokens at: scan) isTString]]]] whileTrue: [
			((tokens at: scan) isFString or: [(tokens at: scan) isTString]) ifTrue: [anyF := true].
			scan := scan + 1.
		].
		anyF ifTrue: [^ self parseFStringLiteral].
		^ self parseStringLiteral
	].

	"Bytes literals"
	tok isBytes ifTrue: [
		^self parseBytesLiteral
	].

	"Ellipsis.  The value is the interned Symbol #'...' used as a compile-time
	MARKER -- ConstantAst turns it into a reference to the ``Ellipsis'' global,
	which is the singleton of the ``ellipsis'' class.  It is deliberately the one
	Symbol-valued ConstantAst in the parser, so that identity test is exact."
	(tok isOp: '...') ifTrue: [
		self advance.
		^ConstantAst new
			value: #'...';
			kind: nil;
			token: tok ; yourself
	].

	"Identifiers.  Python `_` (the conventional 'unused' name) isn't a
	valid Smalltalk identifier (Smalltalk requires letters), so rename
	it consistently at parse time — every NameAst that referred to `_`
	now refers to `___unused___`."
	tok isName ifTrue: [
		| nameSym written |
		self advance.
		nameSym := tok value asSymbol.
		nameSym = #'_' ifTrue: [nameSym := self underscoreReadName].
		"Private-name mangling for every bare-name reference, loads and stores
		 alike -- this is the single funnel for both, so one line covers for /
		 with / walrus / comprehension targets and del as well."
		written := nameSym.
		nameSym := self ___mangle___: nameSym.
		"Record the MENTION in this scope's read set.  This is the single
		funnel for every bare-name reference, which is what makes the free-
		variable set cheap to collect (see popScope).  Store targets pass
		through here too -- they are parsed as loads and retargeted later by
		setStoreCtx: -- but a name this scope binds is filtered out when the
		set is used, so the imprecision is harmless."
		readStack last add: nameSym.
		ownReadStack last add: nameSym.
		^NameAst new
			id: nameSym;
			writtenId: (written == nameSym ifTrue: [nil] ifFalse: [written]);
			ctx: self loadCtx;
			token: tok ; yourself
	].

	"Parenthesized expression, tuple, or generator"
	(tok isOp: '(') ifTrue: [
		^self parseParenExpr
	].

	"List or list comprehension"
	(tok isOp: '[') ifTrue: [
		^self parseListDisplay
	].

	"Dict, set, or comprehension"
	(tok isOp: '{') ifTrue: [
		^self parseDictOrSetDisplay
	].

	"Starred expression"
	(tok isOp: '*') ifTrue: [
		| value |
		self advance.
		value := self parsePrimary.
		^StarredAst new
			value: value;
			ctx: self loadCtx;
			from: tok to: self lastToken ; yourself
	].

	"A yield expression is no atom.  CPython's grammar admits one only as a
	statement, as the right-hand side of an assignment, and as a whole
	parenthesised group -- ___parseStarExpressionsOrYield___ and
	___parseParenExpr___ take those -- so one met here is inside a tuple, a
	call or an operator: ``1, yield 2'', ``f(yield 1)''."
	(tok isKeyword: 'yield') ifTrue: [
		^ self ___invalidSyntaxAt___: tok
	].

	"Await expression"
	(tok isKeyword: 'await') ifTrue: [
		| value nxt |
		self advance.
		"CPython's grammar restricts await's operand to a power expression, so
		``await await fut'' is a SyntaxError while ``await (await fut)'' is
		fine -- and at TOKEN level the two are trivially distinct: the legal
		spelling opens a parenthesis (test_coroutines' test_badsyntax_1)."
		nxt := self peek.
		(nxt notNil and: [nxt isKeyword: 'await']) ifTrue: [
			SyntaxError signal: 'invalid syntax'].
		value := self parsePrimary.
		^AwaitAst new
			value: value;
			from: tok to: self lastToken ; yourself
	].

	"An INDENT where an expression was expected is CPython's ``unexpected
	 indent'' -- an IndentationError, reported at COLUMN 1 with end_offset -1.
	 Column 1 is what suppresses the caret line: the renderer computes
	 colno = offset - 1 - (leading whitespace), which goes NEGATIVE for an
	 indented line, and CPython draws no caret at all there.  So the three-line
	 render test_bad_indentation asserts is a CONSEQUENCE of the offset, not a
	 special case in the renderer -- which is why the offset has to be 1 and not
	 the column the indent actually reached."
	^ self ___invalidSyntaxAt___: tok

]

{ #category : 'Grail-parsing - expressions' }
PythonParser >> parseBitwiseAnd [
	"Parse: shift_expr ('&' shift_expr)*"

	| left startTok |
	startTok := self peek.
	left := self parseShift.
	[self atOp: '&'] whileTrue: [
		| right |
		self advance.
		self ___rejectStarredOperand___.
		right := self parseShift.
		left := BinOpAst new
			left: left;
			op: BitAndAst basicNew;
			right: right;
			from: startTok to: self lastToken ; yourself.
	].
	^left

]

{ #category : 'Grail-parsing - expressions' }
PythonParser >> parseBitwiseOr [
	"Parse: bitwise_xor ('|' bitwise_xor)*"

	| left startTok |
	startTok := self peek.
	left := self parseBitwiseXor.
	[self atOp: '|'] whileTrue: [
		| right |
		self advance.
		self ___rejectStarredOperand___.
		right := self parseBitwiseXor.
		left := BinOpAst new
			left: left;
			op: BitOrAst basicNew;
			right: right;
			from: startTok to: self lastToken ; yourself.
	].
	^left

]

{ #category : 'Grail-parsing - expressions' }
PythonParser >> parseBitwiseXor [
	"Parse: bitwise_and ('^' bitwise_and)*"

	| left startTok |
	startTok := self peek.
	left := self parseBitwiseAnd.
	[self atOp: '^'] whileTrue: [
		| right |
		self advance.
		self ___rejectStarredOperand___.
		right := self parseBitwiseAnd.
		left := BinOpAst new
			left: left;
			op: BitXorAst basicNew;
			right: right;
			from: startTok to: self lastToken ; yourself.
	].
	^left

]

{ #category : 'Grail-parsing - compound statements' }
PythonParser >> parseBlock [
	"Parse an indented block or a single-line body.
	Indented: NEWLINE INDENT stmt* DEDENT
	Single-line: simple_stmts (on same line as colon)
	Returns an array of statements."

	| stmts type aTok |
	"Check for single-line body (no NEWLINE/INDENT)"
	((aTok := self peek) notNil and: [ (type := aTok type)  ~~ #NEWLINE and: [ type ~~ #NL and: [ type ~~ #INDENT]]]) ifTrue: [
		^self parseSimpleStatements
	].
	self skipNewlines.
	self ___expectIndentedBlock___.
	stmts := self parseStatements.
	self expectType: #DEDENT.
	^stmts

]

{ #category : 'Grail-parsing - simple statements' }
PythonParser >> parseBreak [

	| tok |
	tok := self advance. "consume 'break'"
	^BreakAst new token: tok ; yourself

]

{ #category : 'Grail-parsing - atoms' }
PythonParser >> parseBytesLiteral [
	"Parse one or more adjacent bytes tokens (implicit concatenation)."

	| startTok writeStream str ba tok |
	startTok := self peek.
	writeStream := AppendStream on: Unicode7 new.
	[ (tok := self peek) notNil and: [ tok isBytes]] whileTrue: [
		writeStream nextPutAll: self advance value.
	].
	str := writeStream contents.
	ba := ByteArray new: str size.
	1 to: str size do: [:i | ba at: i put: (str at: i) codePoint].
	^ConstantAst new
		value: ba;
		kind: nil;
		from: startTok to: self lastToken ; yourself

]

{ #category : 'Grail-parsing - arguments' }
PythonParser >> parseCallArgList [
	"Parse function call arguments. Returns an Array of {positional. keywords}."

	| args kwargs sawKeyword sawKwargsUnpack kwNames tok argStartTok |
	args := Array new.
	kwargs := Array new.
	"Argument-ordering guards, matching CPython (test_keywordonlyarg
	testSyntaxErrorForFunctionCall).  ``sawKeyword'' tracks a ``name=value''
	keyword, ``sawKwargsUnpack'' a ``**'' splat; ``kwNames'' collects keyword
	names for the repeat check."
	sawKeyword := false.
	sawKwargsUnpack := false.
	kwNames := IdentitySet new.
	((tok := self peek) notNil and: [(tok isOp: ')') not]) ifTrue: [
		[
			(self peek isOp: ')') ifTrue: [false] ifFalse: [
				argStartTok := self peek.
				"**kwargs"
				(self atOp: '**') ifTrue: [
					| kwValue |
					self advance.
					kwValue := self parseExpression.
					(self atOp: '=') ifTrue: [
						self advance.
						^ self ___syntaxError___: 'cannot assign to keyword argument unpacking'
							from: argStartTok to: self ___endOfNextExpression___].
					kwargs add: (KeywordAst new
						arg: nil;
						value: kwValue;
						from: self lastToken to: self lastToken ; yourself).
					sawKwargsUnpack := true.
				] ifFalse: [
				"*args"
				(self atOp: '*') ifTrue: [
					"``*x'' fills positional slots, so it may follow a keyword
					(``f(a=1, *b)'' is legal) but NOT ``**'' unpacking."
					| commaTok starValue |
					commaTok := self lastToken.
					self advance.
					starValue := self parseExpression.
					sawKwargsUnpack ifTrue: [
						^ self ___syntaxError___:
							'iterable argument unpacking follows keyword argument unpacking'
							from: commaTok to: self lastToken].
					(self atOp: '=') ifTrue: [
						self advance.
						^ self ___syntaxError___: 'cannot assign to iterable argument unpacking'
							from: argStartTok to: self ___endOfNextExpression___].
					args add: (StarredAst new
						value: starValue;
						ctx: self loadCtx;
						from: self lastToken to: self lastToken ; yourself).
				] ifFalse: [
					| expr exprStartTok |
					"Kept so an unparenthesized generator expression can report its
					 own extent -- parseExpression has consumed it by the time the
					 ``for'' is seen."
					exprStartTok := self peek.
					"A POSITIONAL argument is a namedexpr_test, so ``f(y := 5)''
					is legal -- one of the shapes PEP 572 exists for.  The keyword
					VALUE below is not: ``f(a=b := 1)'' is a SyntaxError, which is
					why the permission stops here rather than covering the whole
					argument list."
					expr := self ___withWalrus___: true do: [self parseExpression].
					"Check for keyword argument: name=value"
					(self atOp: '=') ifTrue: [
						| name value eqTok |
						eqTok := self advance.
						"CPython's invalid_kwarg: only a bare name takes a keyword
						value.  True/False/None, any other expression, and a missing
						value are each refused with their own message."
						((expr isKindOf: ConstantAst) and: [(expr value == true)
							or: [(expr value == false) or: [expr value == nil]]]) ifTrue: [
								^ self ___syntaxError___: 'cannot assign to ' , exprStartTok value asString
									from: exprStartTok to: eqTok].
						(expr isKindOf: NameAst) ifFalse: [
							^ self ___syntaxError___:
								'expression cannot contain assignment, perhaps you meant "=="?'
								from: expr to: eqTok].
						(self peek isNil or: [(self atOp: ',') or: [self atOp: ')']]) ifTrue: [
							^ self ___syntaxError___: 'expected argument value expression'
								from: exprStartTok to: eqTok].
						"The keyword's RAW spelling, from its own token: expr is a NameAst
						 that parseAtom has MANGLED, and CPython never mangles a call-site
						 keyword -- ``self.f(__a=1)'' inside class C passes __a, which is
						 why it is a TypeError against a mangled parameter.  ``_'' keeps the
						 id it always had."
						name := (expr isKindOf: NameAst)
							ifTrue: [(exprStartTok notNil and: [exprStartTok value asString ~= '_'])
								ifTrue: [exprStartTok value asString]
								ifFalse: [expr id asString]]
							ifFalse: [nil].
						name ifNotNil: [
							(kwNames includes: name asSymbol) ifTrue: [
								^ self ___syntaxError___: 'keyword argument repeated: ' , name
									from: exprStartTok to: self ___endOfNextExpression___].
							kwNames add: name asSymbol].
						sawKeyword := true.
						"Explicitly FORBIDDEN even though the call as a whole
						permits one: the value of ``name=...'' is a plain test."
						value := self ___withWalrus___: false do: [self parseExpression].
						kwargs add: (KeywordAst new
							arg: name;
							value: value;
							from: self lastToken to: self lastToken ; yourself).
					] ifFalse: [
						"A bare positional argument may not follow a keyword or
						``**'' unpacking."
						sawKwargsUnpack ifTrue: [
							^ self ___syntaxError___: 'positional argument follows keyword argument unpacking'
								at: self peek].
						sawKeyword ifTrue: [
							^ self ___syntaxError___: 'positional argument follows keyword argument'
								at: self peek].
						"Check for comprehension in generator expression — either ``for`` or ``async for``"
						((self atKeyword: 'for') or: [self atKeyword: 'async']) ifTrue: [
							| generators genEndTok |
							generators := self parseComprehensions.
							genEndTok := self lastToken.
							"A BARE generator expression is legal only as the SOLE
							 argument: ``f(x for x in y)'' is fine, ``f(a, x for x in
							 y)'' and ``f(x for x in y, z)'' are not.  Grail built the
							 GeneratorExpAst either way, so it silently accepted code
							 CPython refuses -- and the meaning it gave the accepted
							 form is not obviously the one the author intended.
							 Reported over the genexp's own extent, which is what
							 CPython underlines."
							(args isEmpty
								and: [kwargs isEmpty
									and: [(self peek notNil and: [self peek isOp: ',']) not]])
								ifFalse: [
									self ___signalSyntaxError___:
										'Generator expression must be parenthesized'
										from: exprStartTok to: genEndTok].
							args add: (GeneratorExpAst new
								elt: expr;
								generators: generators;
								from: self lastToken to: self lastToken ; yourself).
						] ifFalse: [
							args add: expr.
						].
					].
				]].
				"A comma, or the end of the list.  It was optional, so ``f(a b)''
				compiled; CPython's invalid_expression calls it a missing comma
				(___signalMissingCommaBefore___:)."
				(self matchOp: ',') ifFalse: [
					(self peek isNil or: [self atOp: ')']) ifFalse: [
						^ self ___invalidSyntaxAt___: self peek]].
				true
			]
		] whileTrue.
	].
	^Array with: args with: kwargs

]

{ #category : 'Grail-parsing - match' }
PythonParser >> parseCaseBlock [
	"Parse: case PATTERNS [if GUARD] ':' BLOCK

	``case'' is a soft keyword too, but unambiguous here -- nothing else
	may open a statement inside a match body."

	| tok pattern guard body |
	tok := self peek.
	(tok notNil and: [tok isName and: [tok value = 'case']]) ifFalse: [
		SyntaxError signal: 'expected ''case'' in match body at line ',
			(tok isNil ifTrue: ['?'] ifFalse: [tok line printString])].
	self advance.
	pattern := self parseMatchPatterns.
	guard := nil.
	(self matchKeyword: 'if') ifTrue: [guard := self parseExpression].
	self ___expectColon___: '''case'' statement' header: tok forced: false.
	body := self parseBlock.
	^MatchCaseAst new
		pattern: pattern;
		guard: guard;
		body: (self wrapSuite: body);
		from: tok to: self lastSpanToken ; yourself

]

{ #category : 'Grail-parsing - match' }
PythonParser >> parseCaseBlocks [
	"The indented run of ``case'' clauses that forms a match body."

	| cases |
	self expectType: #NEWLINE.
	self skipNewlines.
	self ___expectIndentedBlock___.
	cases := Array new.
	self skipNewlines.
	[(self peek notNil)
		and: [self peek isEndMarker not
		and: [self peekType ~~ #DEDENT]]] whileTrue: [
			cases := cases copyWith: self parseCaseBlock.
			self skipNewlines].
	self peekType == #DEDENT ifTrue: [self advance].
	^cases

]

{ #category : 'Grail-parsing - compound statements' }
PythonParser >> parseClassDef [
	"Parse: class name[(bases)]: body"

	^self parseClassDefWithDecorators: Array new

]

{ #category : 'Grail-parsing - compound statements' }
PythonParser >> parseClassDefWithDecorators: decorators [
	"Parse a class definition with already-parsed decorators."

	| tok nameTok bases keywords body block variables writes blocking scope  classTypeParams |	tok := self advance. "consume 'class'"
	nameTok := self expectType: #NAME.
	"``class _:`` -- same parse-time rename as def _ / NameAst reads."
	nameTok value = '_' ifTrue: [nameTok value: self underscoreDefName asString].
	self declareWrite: nameTok value asSymbol.
	"KEEP the PEP 695 parameter names.  skipTypeParams already ANSWERS them --
	the def parser has stored them since __type_params__ became observable --
	and the class parser threw them away and set an empty array, so
	``class A[T]'' recorded nothing and A.__type_params__ could not exist."
	classTypeParams := self skipTypeParams.
	bases := Array new.
	keywords := Array new.
	(self matchOp: '(') ifTrue: [
		| result openIdx |
		openIdx := position - 1.
		result := self parseCallArgList.
		"A class's bases are arguments, but not a generator expression:
		``class C(x for x in y)'' is invalid syntax at the ``for''."
		(result first anySatisfy: [:b | b isKindOf: GeneratorExpAst]) ifTrue: [
			| k |
			k := openIdx + 1.
			[k < position and: [((tokens at: k) isKeyword: 'for') not]] whileTrue: [k := k + 1].
			^ self ___invalidSyntaxAt___: (tokens at: k)].
		bases := result first.
		keywords := result last.
		self expect: #OP value: ')'.
	].
	self ___expectColon___: 'class definition' header: tok forced: false.
	self pushScope.
	classNesting := classNesting + 1.
	"PRIVATE-NAME MANGLING is scoped to the class BODY, and only to it: the
	 name, bases, keywords and decorators above were parsed in the ENCLOSING
	 class's scope and mangle with that one (CPython compiles them there), so
	 the push happens here and not before them.  A separate stack rather than
	 classNesting because that count is ZEROED around every def body, while
	 mangling has to reach into method bodies -- CPython's rule is lexical."
	self ___mangleClassStack___ add: nameTok value asSymbol.
	body := [self parseBlock] ensure: [self ___mangleClassStack___ removeLast].
	classNesting := classNesting - 1.
	scope := self popScope.
	variables := scope at: 1.
	writes := scope at: 2.
	blocking := scope at: 3.
	block := BlockAst new
		body: body;
		variables: variables;
		writes: writes;
		hasReturnBlocking: blocking;
		globalNames: (scope at: 4);
		reads: (scope at: 5);
		nonlocalNames: (scope at: 6);
		yourself.
	^ self ___recordDecoratorLines___: decorators on: (ClassDefAst new
		name: nameTok value asSymbol;
		bases: bases;
		keywords: keywords;
		body: block;
		decorator_list: decorators;
		type_params: (classTypeParams ifNil: [Array new]);
		from: tok to: self lastSpanToken ; yourself)

]

{ #category : 'Grail-parsing - expressions' }
PythonParser >> parseComparison [
	"Parse: bitwise_or (comp_op bitwise_or)*"

	| left startTok ops comparators |
	startTok := self peek.
	left := self parseBitwiseOr.
	ops := Array new.
	comparators := Array new.
	[self peekComparisonOp notNil] whileTrue: [
		| op right |
		op := self parseComparisonOp.
		self ___rejectStarredOperand___.
		right := self parseBitwiseOr.
		ops add: op.
		comparators add: right.
	].
	ops isEmpty ifTrue: [^left].
	^CompareAst new
		left: left;
		cmpopList: ops;
		comparatorList: comparators;
		from: startTok to: self lastToken ; yourself

]

{ #category : 'Grail-parsing - expressions' }
PythonParser >> parseComparisonOp [
	"Parse a comparison operator and return its AST node."

	| tok |
	tok := self peek.
	(tok isOp: '==') ifTrue: [self advance. ^EqAst basicNew].
	(tok isOp: '!=') ifTrue: [
		barryAsFlufl == true ifTrue: [
			^ self ___syntaxError___: 'with Barry as BDFL, use ''<>'' instead of ''!=''' at: tok].
		self advance. ^NotEqAst basicNew].
	(tok isOp: '<') ifTrue: [
		| nxt |
		"``<>'' is two tokens to the lexer.  Adjacent, they are CPython's
		invalid_noteq (gh-151464): a suggestion of ``!='' -- or, after ``from
		__future__ import barry_as_FLUFL'', the inequality itself."
		nxt := position + 1 <= tokens size ifTrue: [tokens at: position + 1] ifFalse: [nil].
		(nxt notNil and: [(nxt isOp: '>') and: [nxt position = (tok position + 1)]]) ifTrue: [
			barryAsFlufl == true ifTrue: [self advance; advance. ^ NotEqAst basicNew].
			^ self ___syntaxError___: 'invalid syntax.  Maybe you meant ''!='' instead of ''<>''?'
				from: tok to: nxt].
		self advance. ^LtAst basicNew].
	(tok isOp: '<=') ifTrue: [self advance. ^LtEAst basicNew].
	(tok isOp: '>') ifTrue: [self advance. ^GtAst basicNew].
	(tok isOp: '>=') ifTrue: [self advance. ^GtEAst basicNew].
	(tok isKeyword: 'in') ifTrue: [self advance. ^InAst basicNew].
	(tok isKeyword: 'is') ifTrue: [
		self advance.
		(self matchKeyword: 'not') ifTrue: [^IsNotAst basicNew].
		^IsAst basicNew
	].
	(tok isKeyword: 'not') ifTrue: [
		self advance.
		self expect: #KEYWORD value: 'in'.
		^NotInAst basicNew
	].
	SyntaxError signal: 'Expected comparison operator'.

]

{ #category : 'Grail-parsing - comprehensions' }
PythonParser >> parseComprehensions [
	"Parse one or more 'for target in iter [if cond]*' or
	'async for target in iter [if cond]*' clauses."

	| generators |
	generators := Array new.
	[(self atKeyword: 'for') or: [self atKeyword: 'async']] whileTrue: [
		| forTok target iter ifs isAsync targetPos |
		isAsync := 0.
		(self atKeyword: 'async') ifTrue: [
			self advance.
			isAsync := 1.
		].
		forTok := self advance. "consume 'for'"
		targetPos := position.
		target := self parseStarTargets.
		(self atKeyword: 'in') ifFalse: [
			^ self ___reportForTargetFrom___: targetPos comprehension: true].
		"Comprehension targets are comprehension-local in Python 3 —
		flag the registration so declareWrite: keeps them out of the
		enclosing scope's write set (see declareWrite:).  Save/restore
		rather than set/clear: nothing nests inside a target pattern,
		but restoring the prior value is future-proof and free."
		[ | saved |
			saved := inCompTarget.
			inCompTarget := true.
			[self setStoreCtx: target] ensure: [inCompTarget := saved]
		] value.
		self expect: #KEYWORD value: 'in'.
		iter := self parseDisjunction.
		"An UNPARENTHESISED walrus in the iterable -- ``[i + 1 for i in i := [1,2]]''.
		CPython's grammar cannot reach it and reports plain ``invalid syntax'',
		measured on 3.14.6 for list, set and generator displays alike.  Grail
		reported ``Expected OP ']' but got OP ':=''', which the CPython test
		matching on ``invalid syntax'' cannot see (test_named_expressions
		test_named_expression_invalid_16)."
		(self atOp: ':=') ifTrue: [SyntaxError signal: 'invalid syntax'].
		ifs := Array new.
		[self atKeyword: 'if'] whileTrue: [
			self advance.
			ifs add: self parseDisjunction.
		].
		generators add: (ComprehensionAst new
			target: target;
			iter: iter;
			ifs: ifs;
			is_async: isAsync;
			yourself).
	].
	^generators

]

{ #category : 'Grail-parsing - expressions' }
PythonParser >> parseConjunction [
	"Parse: inversion ('and' inversion)*"

	| left startTok values |
	startTok := self peek.
	left := self parseInversion.
	(self atKeyword: 'and') ifFalse: [^left].
	values := Array new.
	values add: left.
	[self matchKeyword: 'and'] whileTrue: [
		values add: self parseInversion.
	].
	^AndAst new
		values: values;
		from: startTok to: self lastToken ; yourself

]

{ #category : 'Grail-parsing - simple statements' }
PythonParser >> parseContinue [

	| tok |
	tok := self advance. "consume 'continue'"
	^ContinueAst new token: tok ; yourself

]

{ #category : 'Grail-parsing - compound statements' }
PythonParser >> parseDecorated [
	"Parse a decorated function or class definition."

	| decorators |
	decorators := self parseDecorators.
	(self atKeyword: 'def') ifTrue: [
		^self parseFunctionDefWithDecorators: decorators
	].
	(self atKeyword: 'class') ifTrue: [
		^self parseClassDefWithDecorators: decorators
	].
	(self atKeyword: 'async') ifTrue: [
		| funcNode |
		self advance. "consume 'async'"
		funcNode := self parseFunctionDefWithDecorators: decorators.
		self ___markAsyncFunctionDef: funcNode.
		^funcNode
	].
	^ self ___invalidSyntaxAt___: self peek

]

{ #category : 'Grail-parsing - compound statements' }
PythonParser >> parseDecorators [
	"Parse decorator list: @expr NEWLINE ..."

	| decorators |
	decorators := Array new.
	[self atOp: '@'] whileTrue: [
		self advance. "consume '@'"
		"PEP 614 made a decorator an arbitrary expression, and the
		production is namedexpr_test -- so ``@x := y'' is legal, which
		test_decorators asserts."
		decorators add: (self ___withWalrus___: true do: [self parseExpression]).
		self skipNewlines.
	].
	^decorators

]

{ #category : 'Grail-parsing - simple statements' }
PythonParser >> parseDelete [
	"Parse: del target_list"

	| tok targets expr bad |
	tok := self advance. "consume 'del'"
	"Parsed as CPython's invalid_del_stmt reads it -- star_expressions -- so
	that a target that cannot be deleted is named and placed: ``del f()'' is
	``cannot delete function call''.  Primaries alone accepted it, and
	``del (a if b else c)'' compiled."
	expr := self parseStarExpressions.
	bad := self ___invalidTarget___: expr kind: #del.
	bad isNil ifFalse: [
		^ self ___syntaxError___: 'cannot delete ' , (self ___exprName___: bad) node: bad].
	targets := ((expr isKindOf: TupleAst) and: [(self ___isParenthesizedTuple___: expr) not])
		ifTrue: [expr elts asArray]
		ifFalse: [Array with: expr].
	targets := targets collect: [:each | self setDelCtx: each].
	^DeleteAst new
		targets: targets;
		from: tok to: self lastToken ; yourself

]

{ #category : 'Grail-parsing - atoms' }
PythonParser >> parseDictDisplayFromStar: startTok [
	"Parse dict display starting with **unpack.

	What follows ``**'' is a bitwise_or, not an expression
	(Grammar/python.gram:1017-1019), here and in ___parseDictOrSetDisplay___:
	``{**a or b}'' is invalid syntax at the ``or''.  Grail accepted it."

	| keys values starTok |
	keys := Array new.
	values := Array new.
	starTok := self advance. "consume '**'"
	keys add: nil.
	values add: self parseBitwiseOr.
	((self atKeyword: 'for') or: [self atKeyword: 'async']) ifTrue: [
		^ self ___syntaxError___: 'dict unpacking cannot be used in dict comprehension'
			at: starTok].
	[self matchOp: ','] whileTrue: [
		(self atOp: '}') ifFalse: [
			(self atOp: '**') ifTrue: [
				self advance.
				keys add: nil.
				values add: self parseBitwiseOr.
			] ifFalse: [
				keys add: self parseExpression.
				self ___expectDictColonAfter___: keys last.
				values add: self ___parseDictValue___.
			].
		].
	].
	self expect: #OP value: '}'.
	^DictAst new
		keys: keys;
		values: values;
		from: startTok to: self lastToken ; yourself

]

{ #category : 'Grail-parsing - atoms' }
PythonParser >> parseDictOrSetDisplay [
	"Parse dict/set display: {k:v, ...}, {expr, ...}, {k:v for ...}, {expr for ...}"
	"Contents are namedexpr_test: a walrus is legal inside any
	grouping, which is what makes ``(x := 5)'' the legal spelling of
	the statement CPython rejects bare."
	^ self ___withWalrus___: true do: [self ___parseDictOrSetDisplay___]

]

{ #category : 'Grail-parsing - expressions' }
PythonParser >> parseDisjunction [
	"Parse: conjunction ('or' conjunction)*"

	| left startTok values |
	startTok := self peek.
	left := self parseConjunction.
	(self atKeyword: 'or') ifFalse: [^left].
	values := Array new.
	values add: left.
	[self matchKeyword: 'or'] whileTrue: [
		values add: self parseConjunction.
	].
	^OrAst new
		values: values;
		from: startTok to: self lastToken ; yourself

]

{ #category : 'Grail-parsing - compound statements' }
PythonParser >> parseElif [
	"Parse an elif clause as a nested IfAst."

	| tok test body orelse |
	tok := self advance. "consume 'elif'"
	"An elif condition is a namedexpr_test exactly as ``if'' is --
	Django writes ``elif query_string := extra.pop(...)'' and the first cut
	of this gate refused it, which is how four Django tests found the
	omission."
	test := self ___withWalrus___: true do: [self parseExpression].
	self ___checkStrayEquals___: test.
	self ___expectColon___: '''elif'' statement' header: tok forced: false.
	body := self parseBlock.
	orelse := Array new.
	"SkippingNewlines, because a SINGLE-LINE suite leaves its trailing NEWLINE
	unconsumed -- ``if x: a = 1'' followed by ``else:'' looked at that NEWLINE,
	found no continuation, and let the else fall out to statement level as
	``Unexpected token: KEYWORD else''.  Both spellings of the else body were
	rejected, and so was elif, because the header line is what decides it: the
	block form worked all along.  parseTry hit this first and
	atKeywordSkippingNewlines: was added for it; the conditional and loop
	statements needed the same treatment.  It consumes the newlines only when
	the keyword really follows, so an if with no else keeps its position."
	(self atKeywordSkippingNewlines: 'elif') ifTrue: [
		orelse := Array with: self parseElif.
	] ifFalse: [
		((self atKeywordSkippingNewlines: 'else') and: [self matchKeyword: 'else']) ifTrue: [
			self ___expectColon___: '''else'' statement' header: self lastToken forced: true.
			orelse := self parseBlock.
		].
	].
	^IfAst new
		test: test;
		body: (self wrapSuite: body);
		orelse: (self wrapSuite: orelse);
		from: tok to: self lastSpanToken ; yourself

]

{ #category : 'Grail-parsing - expressions' }
PythonParser >> parseExpression [
	"Parse an expression (handles ternary if/else, lambda, and walrus :=)."

	| tok startTok expr |
	tok := self peek.
	startTok := tok.
	"A lambda is parsed here rather than returned from here, so that a
	``:='' AFTER it still reaches the check below.  ``(lambda: x := 1)'' is
	a SyntaxError CPython names precisely -- ``cannot use assignment
	expressions with lambda'' -- and returning early made the whole
	construct invisible to it."
	expr := (tok notNil and: [tok isKeyword: 'lambda'])
		ifTrue: [self parseLambda]
		ifFalse: [self parseTernary].
	tok := self peek.
	(tok notNil and: [tok isOp: ':=']) ifTrue: [
		| value targetName |
		"Only where the grammar says namedexpr_test -- see
		___withWalrus___:do:."
		walrusAllowed ifFalse: [
			^ self ___syntaxError___: self ___walrusRefusalMessage___ at: tok].
		"The TARGET has to be a bare name.  Anything else gets CPython's
		own wording, which names the shape that was written -- see
		___walrusTargetName___:."
		targetName := self ___walrusTargetName___: expr.
		targetName ifNotNil: [
			^ self ___syntaxError___:
				'cannot use assignment expressions with ' , targetName node: expr].
		self advance.
		"The RIGHT-HAND SIDE is ``expression'' in CPython's grammar, not
		``namedexpr'': ``(x := y := 1)'' is invalid syntax, while the
		parenthesised ``(x := (y := 1))'' is fine.  Parsing it permitted
		accepted the chain."
		value := self ___inWalrusValue___: true do: [
			self ___withWalrus___: false do: [self parseExpression]].
		self setStoreCtx: expr.
		^NamedExprAst new
			target: expr;
			value: value;
			from: startTok to: self lastToken ; yourself
	].
	^expr

]

{ #category : 'Grail-parsing - statements' }
PythonParser >> parseExpressionOrAssignment [
	"Parse an expression statement, assignment, augmented assignment, or annotated assignment."

	| startTok expr tok |
	startTok := self peek.
	expr := self parseStarExpressions.

	tok := self peek.

	"Augmented assignment: +=, -=, *=, /=, //=, %=, **=, &=, |=, ^=, <<=, >>=, @="
	(tok notNil and: [tok type == #OP and: [
		#('+=' '-=' '*=' '/=' '//=' '%=' '**=' '&=' '|=' '^=' '<<=' '>>=' '@=') includes: tok value]]) ifTrue: [
		| opTok opStr opClass value |
		opTok := self advance.
		opStr := opTok value copyFrom: 1 to: opTok value size - 1. "Remove the '='"
		opClass := self operatorClassFor: opStr.
		"CPython: augassign ~ (yield_expr | star_expressions), so
		``t += 1, 2'' adds a tuple -- the same right-hand side as the
		annotated form below (#1419)."
		value := self ___parseStarExpressionsOrYield___.
		"CPython: an augmented-assignment target must be a single Name,
		Attribute, or Subscript.  A tuple/list/starred target (``x, b += 3'')
		is a SyntaxError, not an unpacking assignment."
		((expr isKindOf: NameAst)
			or: [(expr isKindOf: AttributeAst)
			or: [expr isKindOf: SubscriptAst]]) ifFalse: [
				^ self ___syntaxError___: '''' , (self ___exprName___: expr)
					, ''' is an illegal expression for augmented assignment'
					node: expr].
		self setStoreCtx: expr.
		^AugAssignAst new
			target: expr;
			op: opClass basicNew;
			value: value;
			from: startTok to: self lastToken ; yourself
	].

	"Annotated assignment: x: int = value"
	(tok notNil and: [tok isOp: ':']) ifTrue: [
		| colonTok annotation value simple aTok |
		colonTok := self advance.
		"Check this isn't a walrus operator :="
		((aTok := self peek) notNil and: [ aTok isOp: '=']) ifFalse: [
			annotation := self parseExpression.
			value := nil.
			"CPython's annotated_rhs is yield_expr | star_expressions: a bare
			tuple, starred items included (``x: tuple = -1, None'', valid
			since 3.8).  A single expression made the comma a SyntaxError,
			which was the first thing keeping pyparsing from importing (#1419)."
			(self matchOp: '=') ifTrue: [
				value := self ___parseStarExpressionsOrYield___.
			].
			self ___checkAnnotationTarget___: expr.
			"``(x): int = 1'' is NOT simple: CPython evaluates the annotation
			and binds x, but records nothing in __annotations__.  The parens
			are gone from the tree, so the statement's first token says it."
			simple := ((expr isKindOf: NameAst) and: [(startTok isOp: '(') not])
				ifTrue: [1] ifFalse: [0].
			"A Name target is BOUND only when the annotation is simple or there
			is a value (Python/symtable.c:2024-2034), so ``(x): int'' alone
			binds nothing and a later read of x is the enclosing scope's -- a
			NameError, not an UnboundLocalError, for a name bound nowhere."
			"So is a bare ``x: int'' in a CLASS body, simple or not: the symtable
			marks x local there, but a class body looks every name up in its
			namespace and then globals, and nothing was stored -- so a later
			read is the enclosing scope's NameError.  Declared, the read
			compiled to a temp the class body does not have, and the class
			failed to compile: ``undefined symbol x''."
			((expr isKindOf: NameAst) and: [value isNil
				and: [simple = 0 or: [classNesting > 0]]])
				ifTrue: [
					self ___retractTargetRead___: expr.
					expr ctx: self storeCtx]
				ifFalse: [self setStoreCtx: expr].
			"Remember the ANNOTATED name: it makes a later ``global x'' or
			``nonlocal x'' an error with its own wording, and an earlier one
			makes this statement one.  Only a SIMPLE annotation counts, as
			only it sets the symtable's DEF_ANNOT."
			simple = 1 ifTrue: [
				self ___checkAnnotatedNameLegal___: expr id asSymbol at: startTok.
				annotatedStack last add: expr id asSymbol].
			^AnnAssignAst new
				target: expr;
				annotation: annotation;
				value: value;
				simple: simple;
				from: startTok to: self lastToken ; yourself
		].
	].

	"Regular assignment: x = value (possibly chained: x = y = value)"
	(tok notNil and: [tok isOp: '=']) ifTrue: [
		| targets value |
		(self ___invalidTarget___: expr kind: #star) isNil
			ifFalse: [self ___checkFirstAssignTarget___: expr].
		targets := Array new.
		self setStoreCtx: expr.
		targets add: expr.
		[self matchOp: '='] whileTrue: [
			| nextExpr aTok |
			nextExpr := self ___parseStarExpressionsOrYield___.
			"Check if followed by another '=' - if so, this is another target"
			((aTok := self peek) notNil and: [ aTok isOp: '=']) ifTrue: [
				(nextExpr isKindOf: YieldAst) | (nextExpr isKindOf: YieldFromAst) ifTrue: [
					^ self ___syntaxError___: 'assignment to yield expression not possible'
						node: nextExpr].
				self setStoreCtx: nextExpr.
				targets add: nextExpr.
			] ifFalse: [
				value := nextExpr.
			].
		].
		value ifNil: [value := targets removeLast].
		^AssignAst new
			targets: targets;
			value: value;
			type_comment: nil;
			from: startTok to: self lastToken ; yourself
	].

	"NO statement-level walrus.  ``x := 0'' as a statement is a
	SyntaxError in CPython -- the parenthesised ``(x := 0)'' is the legal
	spelling, and that one arrives through parseExpression above."
	(tok notNil and: [tok isOp: ':=']) ifTrue: [
		^ self ___invalidSyntaxAt___: tok].

	"Expression statement"
	^ExprAst new
		value: expr;
		from: startTok to: self lastToken ; yourself

]

{ #category : 'Grail-parsing - expressions' }
PythonParser >> parseFactor [
	"Parse: ('+' | '-' | '~') factor | power"

	| tok |
	tok := self peek.
	(tok notNil and: [tok isOp: '+']) ifTrue: [
		| operand |
		self advance.
		self ___rejectStarredOperand___.
		operand := self parseFactor.
		^UAddAst new
			operand: operand;
			from: tok to: self lastToken ; yourself
	].
	(tok notNil and: [tok isOp: '-']) ifTrue: [
		| operand |
		self advance.
		self ___rejectStarredOperand___.
		operand := self parseFactor.
		^USubAst new
			operand: operand;
			from: tok to: self lastToken ; yourself
	].
	(tok notNil and: [tok isOp: '~']) ifTrue: [
		| operand |
		self advance.
		self ___rejectStarredOperand___.
		operand := self parseFactor.
		^InvertAst new
			operand: operand;
			from: tok to: self lastToken ; yourself
	].
	^self parsePower

]

{ #category : 'Grail-parsing - compound statements' }
PythonParser >> parseFor [
	"Parse: for target in iter: body [else: body]"

	| tok target iter body orelse targetPos |
	tok := self advance. "consume 'for'"
	targetPos := position.
	target := self parseStarTargets.
	(self atKeyword: 'in') ifFalse: [
		^ self ___reportForTargetFrom___: targetPos comprehension: false].
	self setStoreCtx: target.
	self expect: #KEYWORD value: 'in'.
	iter := self parseStarExpressions.
	self ___expectColon___: '''for'' statement' header: tok forced: false.
	body := self parseBlock.
	orelse := Array new.
	"SkippingNewlines -- see parseIf.  A single-line suite leaves its trailing
	NEWLINE unconsumed, so ``for i in x: pass'' followed by ``else:'' never
	matched here."
	((self atKeywordSkippingNewlines: 'else') and: [self matchKeyword: 'else']) ifTrue: [
		self ___expectColon___: '''else'' statement' header: self lastToken forced: true.
		orelse := self parseBlock.
	].
	^ForAst new
		target: target;
		iter: iter;
		body: (self wrapSuite: body);
		orelse: (self wrapSuite: orelse);
		type_comment: nil;
		from: tok to: self lastSpanToken ; yourself

]

{ #category : 'Grail-parsing - simple statements' }
PythonParser >> parseFromImportName [
	"Parse: NAME ['as' NAME]"

	| nameTok asName |
	nameTok := self expectType: #NAME.
	asName := nil.
	(self matchKeyword: 'as') ifTrue: [
		self ___checkImportTarget___.
		asName := self advance value asSymbol.
		"``as _'' must track NameAst's parse-time rename of ``_'' —
		reads of the alias emit ___unused___, so the binding has to
		land there too (``from django.utils.translation import
		gettext_lazy as _'')."
		asName == #'_' ifTrue: [asName := #'___unused___'].
		asName := self ___mangle___: asName.
	].
	"Both halves are mangled.  Measured on 3.14.6, ``from modx import __spam''
	 inside class C looks up _C__spam IN THE MODULE and binds _C__spam -- the
	 imported name is an identifier in the class body like any other."
	^AliasAst new
		name: (self ___mangle___: nameTok value asSymbol);
		asName: asName;
		from: nameTok to: self lastToken ; yourself

]

{ #category : 'Grail-parsing - atoms' }
PythonParser >> parseFStringLiteral [
	"Parse a sequence of one or more adjacent string-like tokens
	(STRING / FSTRING) and emit a concatenation chain.  Each
	``{expr}`` inside an FSTRING becomes ``str(expr)`` (or
	``repr(expr)`` / ``ascii(expr)`` for ``!r`` / ``!a``); a
	format spec wraps as ``format(value, 'spec')``.  ``{{`` /
	``}}`` escape to literal ``{`` / ``}``.

	Implicit concatenation (``f'a' 'b' f'c'``) is supported by
	walking forward while the token is STRING or FSTRING."

	| startTok tok value parts pos len ch result converted
	  innerParser exprAst exprText conversion formatSpec exprStart
	  specBuf inSpec aTok innerSource debugEq rawExpr lead leadNewlines
	  wrapped anchor sawT sawF uncommented hadComment |
	startTok := self peek.
	parts := OrderedCollection new.
	sawT := false.
	sawF := false.
	[(aTok := self peek) notNil and: [aTok isString or: [aTok isFString or: [aTok isTString]]]] whileTrue: [
		tok := self advance.
		tok isTString ifTrue: [sawT := true].
		tok isFString ifTrue: [sawF := true].
		value := tok value.
		len := value size.
		(tok isFString or: [tok isTString]) ifFalse: [
			"Plain string token — append as a literal segment."
			parts add: #literal -> value.
		] ifTrue: [
	pos := 1.
	[pos <= len] whileTrue: [
		ch := value at: pos.
		ch == ${ ifTrue: [
			"``{{`` is a literal ``{``."
			((pos < len) and: [(value at: pos + 1) == ${]) ifTrue: [
				parts add: #literal -> '{'.
				pos := pos + 2.
			] ifFalse: [
				"Placeholder: scan to the matching unescaped right-brace
				while tracking nested brackets so slice ``:`` inside
				``value[:n]`` doesn't trigger the format-spec opener,
				and tracking string-literal quotes so a right-brace
				inside an embedded string literal doesn't end the
				placeholder early."
				| bracketDepth strQuote strTriple exprEnd exprStop specStarts |
				pos := pos + 1.
				exprStart := pos.
				"CPython's invalid_fstring_replacement_field: a field whose
				expression is missing, named by what stands in its place."
				[| k c |
				 k := self ___fieldExpressionStartIn___: value from: pos.
				 k <= len ifTrue: [
					c := value at: k.
					('=!:}' includesValue: c) ifTrue: [
						^ self ___fstringError___: 'valid expression required before '''
								, c asString , ''''
							token: tok fieldAt: exprStart index: k]]] value.
				bracketDepth := 0.
				strQuote := nil.
				exprStop := nil.
				conversion := nil.
				formatSpec := nil.
				inSpec := false.
				exprEnd := nil.
				specBuf := WriteStream on: Unicode7 new.
				specStarts := OrderedCollection new.
				[pos <= len and: [exprEnd isNil]] whileTrue: [
					ch := value at: pos.
					strQuote ifNotNil: [
						"Inside a string literal — only the matching quote
						closes it.  Escapes (``\\``) skip one char."
						ch == $\ ifTrue: [
							inSpec ifTrue: [specBuf nextPut: ch].
							pos := pos + 1.
							pos <= len ifTrue: [
								inSpec ifTrue: [specBuf nextPut: (value at: pos)].
								pos := pos + 1.
							].
						] ifFalse: [
							"A literal opened with three quotes closes only on three, so
							its body may hold the quote alone: '''eric's''' (test_fstring)."
							(ch == strQuote
								and: [strTriple not or: [self ___isTripleQuoteIn: value at: pos]])
									ifTrue: [
										strTriple ifTrue: [
											inSpec ifTrue: [specBuf nextPut: ch; nextPut: ch].
											pos := pos + 2].
										strQuote := nil].
							inSpec ifTrue: [specBuf nextPut: ch].
							pos := pos + 1.
						].
					] ifNil: [
						"A comment (PEP 701) runs to the end of its line: a brace,
						quote, ``!'' or ``:'' in it is not structure.  Not inside a
						format spec, where ``#'' is the alternate-form flag."
						(ch == $# and: [inSpec not]) ifTrue: [
							[pos <= len and: [(value at: pos) ~= Character lf]]
								whileTrue: [pos := pos + 1]
						] ifFalse: [
						"In a format spec's own text a quote or a paren is a literal
						character -- a quote may be the fill, as in f'{s:''^7}' -- and only braces
						are structure; inside a field nested in the spec (depth > 0)
						it is expression text again."
						((ch == $' or: [ch == $"]) and: [inSpec not or: [bracketDepth > 0]]) ifTrue: [
							strQuote := ch.
							strTriple := self ___isTripleQuoteIn: value at: pos.
							strTriple ifTrue: [
								inSpec ifTrue: [specBuf nextPut: ch; nextPut: ch].
								pos := pos + 2].
							inSpec ifTrue: [specBuf nextPut: ch].
							pos := pos + 1.
						] ifFalse: [
							"A field nested in the spec: where its text starts in the
							spec, and in the source, for the spec's own parse."
							(ch == ${ and: [inSpec and: [bracketDepth == 0]]) ifTrue: [
								(self ___specFieldStartFor: tok field: exprStart at: pos specSize: specBuf contents size)
									ifNotNil: [:start | specStarts add: start]].
							(ch == ${ or: [(ch == $( or: [ch == $[])
									and: [inSpec not or: [bracketDepth > 0]]])
								ifTrue: [bracketDepth := bracketDepth + 1].
							(ch == $} or: [(ch == $) or: [ch == $]])
									and: [inSpec not or: [bracketDepth > 0]]])
								ifTrue: [
									ch == $} ifTrue: [
										bracketDepth == 0 ifTrue: [
											"End of placeholder."
											exprEnd := pos.
										] ifFalse: [bracketDepth := bracketDepth - 1].
									] ifFalse: [
										bracketDepth := bracketDepth - 1.
									].
								].
							exprEnd isNil ifTrue: [
								inSpec ifTrue: [specBuf nextPut: ch. pos := pos + 1] ifFalse: [
									"Conversion flag: ``!r`` / ``!s`` / ``!a``
									(only at depth 0, after the expression).  A
									``!'' that is not ``!='' opens a conversion,
									checked as CPython checks it
									(___checkedFStringConversionIn___:...)."
									(ch == $! and: [bracketDepth == 0 and: [(pos < len
										and: [(value at: pos + 1) ~~ $=])
											or: [pos = len and: [tok openFieldAt notNil]]]])
										ifTrue: [
											exprStop := pos - 1.
											pos := self ___checkedFStringConversionIn___: value
												at: pos token: tok fieldAt: exprStart.
											conversion := value at: pos - 1.
									] ifFalse: [
										"Format spec opener: ``:`` at depth 0."
										(ch == $: and: [bracketDepth == 0]) ifTrue: [
											exprStop ifNil: [exprStop := pos - 1].
											inSpec := true.
											pos := pos + 1.
										] ifFalse: [
											pos := pos + 1.
										].
									].
								].
							].
						].
						].
					].
				].
				"After loop, pos is at the position past ``}``."
				pos := exprEnd ifNil: [pos] ifNotNil: [exprEnd + 1].
				"The expression stops where its conversion or spec starts, as
				recorded when the scan met the ``!'' or ``:''.  Counting back from
				the brace instead missed whitespace after a conversion, which is
				legal: f'{3!s  }' read ``3!s'' as the expression (test_fstring)."
				exprText := value copyFrom: exprStart to: (exprStop ifNil: [
					exprEnd ifNil: [pos - 1] ifNotNil: [exprEnd - 1]]).
				formatSpec := inSpec ifTrue: [specBuf contents] ifFalse: [nil].
				(formatSpec notNil and: [specStarts notEmpty]) ifTrue: [
					specFieldStarts at: formatSpec put: specStarts asArray].
				"Comments come out of the field's text before anything reads it:
				the debug text and a t-string's expression are CPython's
				comment-free reconstruction, and the child parse below cannot
				take one either -- wrapped as ``(x  # c)'' its closing paren is
				commented out."
				uncommented := self ___ftstringExprWithoutComments___: exprText.
				hadComment := uncommented ~~ exprText.
				exprText := uncommented.
				"``f'{expr=}''' -- the self-documenting form (Python 3.8).  The field's
				SOURCE is emitted verbatim, surrounding whitespace and the ``='' with
				it, and then the value: repr'd when no conversion and no format spec
				were given, formatted when a spec was.  So f'{a=}' is 'a=10' while
				f'{a=:x}' is 'a=a'.
				Grail used to drop the ``='' silently -- the child parse simply
				stopped there and nobody noticed, because the shape mostly appears
				inside assertion messages that a passing test never reads."
				debugEq := self ___fstringDebugEqualsIn___: exprText.
				debugEq == 0 ifFalse: [
					parts add: #literal -> exprText asString.
					(conversion isNil and: [formatSpec isNil])
						ifTrue: [conversion := $r].
					exprText := exprText copyFrom: 1 to: debugEq - 1].
				"Parse the inner expression with a child parser.  Uses
				the same tokenizer pipeline as the top-level parse so
				operators, names, calls, and attribute reads all
				resolve through standard PythonParser productions.
				After parsing, propagate the child's freshly-declared
				variables (e.g. comprehension loop targets like ``x``)
				into the OUTER parser's current scope so isVariable
				IsDeclared finds them via the parent BlockAst walk
				at codegen time — otherwise the spliced-in NameAst
				reads fall back to the module-symbol-lookup path and
				raise NameError at runtime."
				"Parse the field as if PARENTHESIZED, which is what CPython does:
				a replacement field is one expression, not a statement, so neither
				indentation nor a line break inside it is structure.  The child parse
				starts at column 1, so ``f'{ x }''' would otherwise open with an
				INDENT, and PEP 701's multi-line fields would break on the NEWLINE.
				The tokenizer already suppresses both while parenDepth > 0, so the
				wrapping is all that is needed.  An EMPTY field is left unwrapped so
				it still fails, rather than quietly becoming the empty tuple."
				rawExpr := exprText asString.
				innerSource := rawExpr trimSeparators.
				"How much trimSeparators took off the FRONT, and how many lines
				 that spans: both shift the child's coordinates relative to the
				 field's start, and a PEP 701 field may legitimately open with a
				 newline."
				lead := 0.
				[lead < rawExpr size and: [(rawExpr at: lead + 1) isSeparator]]
					whileTrue: [lead := lead + 1].
				leadNewlines := 0.
				1 to: lead do: [:k |
					(rawExpr at: k) == Character lf ifTrue: [
						leadNewlines := leadNewlines + 1]].
				self ___checkFieldExpressionStart___: innerSource token: tok field: exprStart index: exprStart + lead
					opensSpec: formatSpec notNil.
				wrapped := innerSource isEmpty not.
				wrapped ifTrue: [
					innerSource := '(' , innerSource , ')'].
				"An error in the child parse is reported as CPython reports it,
				at the field's own position (___signalFieldError___:...); so is
				a generator that only the wrapping parenthesized.  A field the
				f-string ended inside of is refused once its expression is known
				to be one (___signalOpenFieldOf___:)."
				(exprEnd isNil and: [innerSource isEmpty]) ifTrue: [
					^ self ___signalOpenFieldOf___: tok].
				exprAst := [
					innerParser := PythonParser basicNew source: innerSource.
					innerParser ___mangleClassStack___: self ___mangleClassStack___ copy.
					innerParser parseExpression]
						on: SyntaxError
						do: [:error |
							self ___signalFieldError___: error in: innerSource
								token: tok field: exprStart at: exprStart + lead].
				(wrapped and: [self ___isBareGenerator___: exprAst in: innerSource]) ifTrue: [
					self ___signalFieldStrayIn___: innerSource token: tok field: exprStart at: exprStart + lead].
				exprEnd isNil ifTrue: [^ self ___signalOpenFieldOf___: tok].
				"Its positions are relative to the FIELD, not the module: the
				child parse sees ``(expr)'' as a whole source, so every node in
				it counts from there.  REBASE them onto the module when the
				tokenizer left an anchor for this field (PythonToken >>
				fieldStarts), so the subtree carries real spans and CPython's
				columns come out of a traceback -- ``f'{boom()}''' should
				underline ``boom()'', not the whole literal.

				The arithmetic: a child offset p lands at
				``anchorSourceOffset + lead + (p - 2)'' -- one back for the
				``('' this parse prepends, plus whatever trimSeparators took off
				the front -- and a child line L at
				``anchorLine + leadNewlines + (L - 1)''.  Valid only because the
				tokenizer keeps a field's text VERBATIM, so value indices and
				source offsets differ by a constant across it.

				WITHOUT an anchor, fall back to marking the subtree so the map
				SKIPS it: a bogus span nested inside a true one is worse than no
				span at all, since the map answers the smallest range containing
				the send.  That is the case for an empty field (nothing was
				wrapped, so the offsets do not line up) and for a field nested
				inside a format spec, whose text is a substring of a substring
				and needs two anchors composed -- see the other
				___markFragmentPositions___ call."
				exprAst ifNotNil: [:e |
					anchor := tok fieldStarts ifNil: [nil] ifNotNil: [:fs |
						fs detect: [:a | (a at: 1) = exprStart] ifNone: [nil]].
					"A removed comment shifts every offset after it, so the
					 constant-difference rebase no longer holds."
					(wrapped and: [anchor notNil and: [hadComment not]])
						ifTrue: [
							e ___rebaseFragmentPositionsBy: (anchor at: 2) + lead - 2
								line: (anchor at: 3) + leadNewlines - 1]
						ifFalse: [e ___markFragmentPositions___]].
				innerParser ___variableStack___ do: [:innerScope |
					innerScope do: [:varName | self declareVariable: varName]].
				"Apply conversion / format spec."
				tok isTString
					ifTrue: [
						"PEP 750: the field stays UNCONVERTED -- the value, its source
						 text, the conversion and the spec go into an Interpolation.
						 The text is verbatim up to the delimiter, whitespace at both
						 ends included: t'{ x }' has expression ' x '.  CPython 3.14.7
						 and earlier dropped the trailing whitespace (' x'); 3.14.8
						 keeps it (gh-154719).  For the debug form the ``='' and what
						 follows it are already gone (see above)."
						parts add: #interp -> { exprAst. exprText asString. conversion. formatSpec }]
					ifFalse: [
						converted := self ___parsingForAst___
							ifTrue: [self ___formattedValueOf: exprAst conversion: conversion formatSpec: formatSpec at: tok]
							ifFalse: [self ___wrapFStringExpr: exprAst conversion: conversion formatSpec: formatSpec at: tok].
						parts add: #expr -> converted].
			]
		] ifFalse: [
			ch == $} ifTrue: [
				"``}}`` is a literal ``}``.  A single one outside a field is
				CPython's SyntaxError -- it was forgiven here, so ``f'x}''' and
				``f'{{}''' compiled (test_fstring test_mismatched_braces).  A brace
				an escape decoded to arrives doubled (PythonTokenizer >>
				tokenizeString), so only a brace written as itself gets here alone."
				((pos < len) and: [(value at: pos + 1) == $}]) ifTrue: [
					parts add: #literal -> '}'.
					pos := pos + 2.
				] ifFalse: [
					^ self ___syntaxError___:
						(tok isTString ifTrue: ['t-string: '] ifFalse: ['f-string: '])
							, 'single ''}'' is not allowed'
						at: tok]
			] ifFalse: [
				"Plain literal run."
				| runStart |
				runStart := pos.
				[pos <= len
					and: [(value at: pos) ~= ${ and: [(value at: pos) ~= $}]]]
					whileTrue: [pos := pos + 1].
				parts add: #literal -> (value copyFrom: runStart to: pos - 1).
			]
		]
	].
	].
	].
	sawT ifTrue: [^ self ___templateFromParts___: parts from: startTok].
	(sawF and: [self ___parsingForAst___]) ifTrue: [
		^ self ___joinedStrFromParts___: parts from: startTok].
	"Empty f-string → empty literal."
	parts isEmpty ifTrue: [
		result := ConstantAst new
			value: '';
			kind: nil;
			from: startTok to: self lastToken ; yourself.
		sawF ifTrue: [result ___beAnFString___].
		^ result
	].
	result := self
		___balancedJoinOf: (parts collect: [:part | self ___fstringPartToAst: part from: startTok])
		from: startTok.
	"An f-string with no fields folds to its text, still an f-string to CPython."
	(sawF and: [result isKindOf: ConstantAst]) ifTrue: [result ___beAnFString___].
	^ result

]

{ #category : 'Grail-parsing - compound statements' }
PythonParser >> parseFunctionDef [
	"Parse: def name(params) [-> type]: body"

	^self parseFunctionDefWithDecorators: Array new

]

{ #category : 'Grail-parsing - compound statements' }
PythonParser >> parseFunctionDefWithDecorators: decorators [
	"Parse a function definition with already-parsed decorators."

	| tok nameTok args returns body block funcNode decoratorNames variables writes blocking scope
	  savedNesting typeParamNames |
	tok := self advance. "consume 'def'"
	nameTok := self expectType: #NAME.
	"``def _(...)`` -- apply the same parse-time rename NameAst reads
	get (see the identifier atom): `_` is GemStone's legacy assignment
	token, not an identifier."
	nameTok value = '_' ifTrue: [nameTok value: self underscoreDefName asString].
	self declareWrite: nameTok value asSymbol.
	typeParamNames := self skipTypeParams.
	self ___expectForced___: '('.
	args := self parseFunctionParametersUntil: ')'.
	self expect: #OP value: ')'.
	returns := nil.
	(self matchOp: '->') ifTrue: [
		returns := self parseExpression.
	].
	self ___expectColon___: 'function definition' header: tok forced: true.
	self pushScope.
	"Declare parameter names in the function body's scope so name
	resolution treats parameters as locals (Python LEGB).  Without
	this, a parameter shadowing a builtin (e.g. `def parse(str, ...)`)
	would resolve to the builtin inside the body.  Use declareVariable:
	(scope-only) rather than declareWrite: so the params don't show up
	in body.writes — the writeSet is meant to flag *body* rebinds, not
	parameter declarations."
	args posonlyargs do: [:a | self declareParameter: a name asSymbol].
	args args do: [:a | self declareParameter: a name asSymbol].
	args kwonlyargs do: [:a | self declareParameter: a name asSymbol].
	args vararg ifNotNil: [self declareParameter: args vararg name asSymbol].
	args kwarg ifNotNil: [self declareParameter: args kwarg name asSymbol].
	"Save + zero classNesting around the body parse so nested ``def
	c(x):`` inside a method body doesn't get re-classed as an
	InstanceFunctionDefAst (which would emit instance-style
	dispatch + treat `x` as an instVar fallback).  Restored before
	the InstanceFunctionDefAst conversion check below — that check
	still uses the original (now-restored) nesting to decide
	whether THIS def is at class-body level."
	savedNesting := classNesting.
	classNesting := 0.
	body := [self parseBlock] ensure: [classNesting := savedNesting].
	scope := self popScope.
	variables := scope at: 1.
	writes := scope at: 2.
	blocking := scope at: 3.
	block := BlockAst new
		body: body;
		variables: variables;
		writes: writes;
		hasReturnBlocking: blocking;
		globalNames: (scope at: 4);
		reads: (scope at: 5);
		nonlocalNames: (scope at: 6);
		yourself.
	decoratorNames := decorators collect: [:each |
		(each isKindOf: NameAst)
			ifTrue: ["A bare ``@DynamicClassAttribute (from ``from types import
				DynamicClassAttribute'') is CPython's getset descriptor that enum
				member properties are built on -- same role as ``@property'' /
				``@enum.property'', so re-class the def declaratively as a property
				(test_enum test_subclass_duplicate_name_dynamic).  Other bare names
				pass through unchanged."
				(each id asString = 'DynamicClassAttribute')
					ifTrue: [#'property']
					ifFalse: [each id]]
			ifFalse: [self ___declarativeDecoratorSymbolFor: each]
	].
	funcNode := FunctionDefAst new 
		name: nameTok value asSymbol;
		args: args;
		body: block;
		decorator_list: decoratorNames;
		returns: returns;
		type_comment: nil;
		type_params: typeParamNames;
		from: tok to: self lastSpanToken.
	"Convert to appropriate subclass when inside a class"
	classNesting > 0 ifTrue: [
		(decoratorNames includes: #'staticmethod')
			ifTrue: [funcNode changeClassTo: StaticFunctionDefAst]
			ifFalse: [(decoratorNames includes: #'classmethod')
				ifTrue: [funcNode changeClassTo: ClassFunctionDefAst]
				ifFalse: [funcNode changeClassTo: InstanceFunctionDefAst]].
	].
	"Normalising above makes ``@enum.property'' and ``@DynamicClassAttribute''
	read #property, exactly like the builtin -- right for the accessor pair all
	three compile to, but the class __dict__ holds a real ``property'' for the
	builtin alone.  Record which this was while the nodes still say
	(FunctionDefAst >> ___isBuiltinPropertyDef___)."
	(decorators anySatisfy: [:each |
		((each isKindOf: NameAst) and: [each id asString = 'property'])
			or: [(each isKindOf: AttributeAst)
				and: [each attr asString = 'property'
				and: [(each value isKindOf: NameAst)
				and: [#('builtins' 'bltns') includes: each value id asString]]]]])
		ifTrue: [funcNode dynamicInstVarAt: #builtinProperty put: true].
	self ___recordDecoratorLines___: decorators on: funcNode.
	^funcNode

]

{ #category : 'Grail-parsing - parameters' }
PythonParser >> parseFunctionParametersUntil: endOp [
	"Parse function parameters until endOp (')' for def, ':' for lambda).
	Returns an ArgumentsAst."

	| posonlyargs args vararg kwonlyargs kw_defaults kwarg defaults
	  sawSlash sawStar sawDefault allowAnnotations seenNames aTok starTok |
	posonlyargs := Array new.
	args := Array new.
	vararg := nil.
	kwonlyargs := Array new.
	kw_defaults := Array new.
	kwarg := nil.
	defaults := Array new.
	sawSlash := false.
	sawStar := false.
	sawDefault := false.
	allowAnnotations := endOp ~= ':'.

	((aTok := self peek) notNil and: [(aTok isOp: endOp) not]) ifTrue: [
		[
			| tok |
			tok := self peek.
			(tok isOp: endOp) ifTrue: [false] ifFalse: [
				"Nothing may follow ``**kwargs`` -- a parameter, *, ** or /
				alike, one message for all four (CPython's pegen)."
				kwarg notNil ifTrue: [
					^ self ___syntaxError___: 'arguments cannot follow var-keyword argument' at: tok].
				"``def f((a))'': CPython names the parentheses."
				(tok isOp: '(') ifTrue: [
					| close |
					close := self ___indexOfClose___: position.
					^ self ___syntaxError___: (endOp = ':'
							ifTrue: ['Lambda expression parameters cannot be parenthesized']
							ifFalse: ['Function parameters cannot be parenthesized'])
						from: tok to: (close isNil ifTrue: [tok] ifFalse: [tokens at: close])].
				"Check for / (positional-only separator)"
				(tok isOp: '/') ifTrue: [
					| slashTok |
					slashTok := self advance.
					"CPython's three placement refusals, in its precedence:
					after any * (bare, *args, or inside the keyword-only
					section) the slash is too late; a second slash may not
					appear; and SOMETHING must precede it -- with the bare
					``def f(/)`` shape reporting plain invalid syntax, the
					grammar having nothing to say about an empty prefix."
					sawStar ifTrue: [
						^ self ___syntaxError___: '/ must be ahead of *' at: slashTok].
					sawSlash ifTrue: [
						^ self ___syntaxError___: '/ may appear only once' at: slashTok].
					args isEmpty ifTrue: [
						((self peek notNil) and: [self peek isOp: endOp])
							ifTrue: [^ self ___invalidSyntaxAt___: self peek]
							ifFalse: [^ self ___syntaxError___:
								'at least one argument must precede /' at: slashTok]].
					posonlyargs := args.
					args := Array new.
					"Move defaults to posonlyargs"
					sawSlash := true.
					self matchOp: ','.
				] ifFalse: [
				"Check for * (keyword-only separator or *args)"
				(tok isOp: '*') ifTrue: [
					sawStar ifTrue: [
						^ self ___syntaxError___: '* argument may appear only once' at: tok].
					starTok := self advance.
					sawStar := true.
					"If followed by name, it's *args"
					(self peek notNil and: [self peekType == #NAME]) ifTrue: [
						| argNode |
						argNode := self parseSingleParamWithAnnotations: allowAnnotations.
						vararg := argNode.
						(self atOp: '=') ifTrue: [
							^ self ___syntaxError___: 'var-positional argument cannot have default value'
								at: self peek].
					].
					self matchOp: ','.
				] ifFalse: [
				"Check for **kwargs"
				(tok isOp: '**') ifTrue: [
					self advance.
					kwarg := self parseSingleParamWithAnnotations: allowAnnotations.
					(self atOp: '=') ifTrue: [
						^ self ___syntaxError___: 'var-keyword argument cannot have default value'
							at: self peek].
					self matchOp: ','.
				] ifFalse: [
					"Regular parameter"
					| param default paramTok |
					paramTok := self peek.
					param := self parseSingleParamWithAnnotations: allowAnnotations.
					default := nil.
					(self matchOp: '=') ifTrue: [
						default := self parseExpression.
					].
					sawStar ifTrue: [
						kwonlyargs add: param.
						kw_defaults add: (default ifNil: [nil]).
					] ifFalse: [
						"A positional parameter without a default may not
						follow one with a default.  The slash does NOT reset
						this (``def f(a, b=5, /, c)`` is the corpus's leading
						sample); the star DOES -- keyword-only parameters are
						named at the call, so bare ones after defaults are
						fine and the sawStar branch above never looks."
						default isNil
							ifTrue: [
								sawDefault ifTrue: [
									^ self ___syntaxError___: 'parameter without a default follows parameter with a default'
										at: paramTok]]
							ifFalse: [sawDefault := true].
						args add: param.
						default ifNotNil: [defaults add: default].
					].
					self matchOp: ','.
				]]].
				true
			]
		] whileTrue.
	].

	"A bare ``*'' must be followed by at least one keyword-only parameter.
	``*args'' fills vararg and ``*, k'' fills kwonlyargs, so an empty
	keyword-only section after a star is CPython's ``named arguments must
	follow bare *'' (test_keywordonlyarg testSyntaxErrorForFunctionDefinition:
	``def f(p, *)'', ``def f(p1, *, **k1)'')."
	(sawStar and: [vararg isNil and: [kwonlyargs isEmpty]]) ifTrue: [
		^ self ___syntaxError___: 'named arguments must follow bare *' at: starTok].
	"A parameter name may appear only once across the whole signature -- the
	posonly / regular / *vararg / keyword-only / **kwarg sections share one
	namespace.  CPython: ``duplicate argument 'X' in function definition''
	(same test: ``def f(p1, *, p1=100)'', ``def f(p1, *k1, k1=100)'',
	``def f(p1, *, k1, k1=100)'', ``def f(p1, *, k1, **k1)'')."
	seenNames := IdentitySet new.
	(posonlyargs, args, kwonlyargs,
		(vararg isNil ifTrue: [#()] ifFalse: [{vararg}]),
		(kwarg isNil ifTrue: [#()] ifFalse: [{kwarg}]))
		do: [:p |
			(seenNames includes: p name asSymbol) ifTrue: [
				^ self ___syntaxError___:
					'duplicate argument ''' , p name asString , ''' in function definition'
					node: p].
			seenNames add: p name asSymbol].

	^ArgumentsAst new
		posonlyargs: posonlyargs;
		args: args;
		vararg: vararg;
		kwonlyargs: kwonlyargs;
		kw_defaults: kw_defaults;
		kwarg: kwarg;
		defaults: defaults;
		yourself

]

{ #category : 'Grail-parsing - simple statements' }
PythonParser >> parseGlobal [
	"Parse: global name, ...

	Each declared name is registered in the current scope's
	globalStack (so popScope strips it from the local variable + write
	sets — an inner ``x = expr'' must not declare a fresh Smalltalk
	temp) AND in the module scope (``variableStack first'') so NameAst
	codegen recognises it as a module-scope name and routes reads /
	writes through the module instance's dynamicInstVarAt: storage.
	The latter also makes ``global x; x = 1'' create a brand-new module
	binding even when no module-level assignment to ``x'' exists."

	| tok names |
	tok := self advance. "consume 'global'"
	names := Array new.
	names add: self advance value asSymbol.
	[self matchOp: ','] whileTrue: [
		names add: self advance value asSymbol.
	].
	"``global __x'' inside a class declares _C__x -- the same name every mangled
	 reference to __x in that scope now uses.  This line is the one the whole
	 change exists for: test_named_expressions'
	 test_named_expression_scope_mangled_names, where the global was declared
	 under the raw spelling and a walrus writing the pre-mangled one reached a
	 different variable."
	names := names collect: [:n | self ___mangle___: n].
	names do: [:n | self ___checkDeclarationLegal___: n kind: 'global' at: tok].
	names do: [:n |
		globalStack last add: n.
		variableStack first add: n.
	].
	^GlobalAst new
		names: names;
		from: tok to: self lastToken ; yourself

]

{ #category : 'Grail-parsing - compound statements' }
PythonParser >> parseIf [
	"Parse: if test: body [elif test: body]* [else: body]"

	| tok test body orelse |
	tok := self advance. "consume 'if'"
	"The condition is a namedexpr_test: ``if (n := f()) > 0'' is the
	point of PEP 572, and the unparenthesised ``if n := f()'' is legal
	too."
	test := self ___withWalrus___: true do: [self parseExpression].
	self ___checkStrayEquals___: test.
	self ___expectColon___: '''if'' statement' header: tok forced: false.
	body := self parseBlock.
	orelse := Array new.
	"SkippingNewlines, because a SINGLE-LINE suite leaves its trailing NEWLINE
	unconsumed -- ``if x: a = 1'' followed by ``else:'' looked at that NEWLINE,
	found no continuation, and let the else fall out to statement level as
	``Unexpected token: KEYWORD else''.  Both spellings of the else body were
	rejected, and so was elif, because the header line is what decides it: the
	block form worked all along.  parseTry hit this first and
	atKeywordSkippingNewlines: was added for it; the conditional and loop
	statements needed the same treatment.  It consumes the newlines only when
	the keyword really follows, so an if with no else keeps its position."
	(self atKeywordSkippingNewlines: 'elif') ifTrue: [
		orelse := Array with: self parseElif.
	] ifFalse: [
		((self atKeywordSkippingNewlines: 'else') and: [self matchKeyword: 'else']) ifTrue: [
			self ___expectColon___: '''else'' statement' header: self lastToken forced: true.
			orelse := self parseBlock.
			(self atKeywordSkippingNewlines: 'elif') ifTrue: [
				^ self ___syntaxError___: '''elif'' block follows an ''else'' block' at: self peek].
		].
	].
	^IfAst new
		test: test;
		body: (self wrapSuite: body);
		orelse: (self wrapSuite: orelse);
		from: tok to: self lastSpanToken ; yourself

]

{ #category : 'Grail-parsing - simple statements' }
PythonParser >> parseImport [
	"Parse: import name [as alias], ...

	Python's binding for `import a.b.c` is the *top-level* package `a`,
	not `a.b.c`. The dotted submodule is reachable as an attribute chain
	(`a.b.c`) on the bound name. Only `import a.b.c as alias` binds the
	alias to the leaf submodule. Without this split, Grail tries to declare
	`a.b.c` as an instance variable on the enclosing module class and
	GemStone rejects the dotted identifier."

	| tok names |
	tok := self advance. "consume 'import'"
	names := Array new.
	names add: self parseImportName.
	[self matchOp: ','] whileTrue: [
		names add: self parseImportName.
	].
	(self atKeyword: 'from') ifTrue: [
		^ self ___syntaxError___: 'Did you mean to use ''from ... import ...'' instead?'
			from: tok to: (self ___lastTokenOfLine___)].
	names do: [:alias |
		| bound |
		bound := alias asName ifNil: [
			(alias name includes: $.)
				ifTrue: [($. split: alias name asString) first asSymbol]
				ifFalse: [alias name]
		].
		self declareWrite: bound
	].
	^ImportAst new
		names: names;
		from: tok to: self lastToken ; yourself

]

{ #category : 'Grail-parsing - simple statements' }
PythonParser >> parseImportFrom [
	"Parse: from [dots] [module] import names"

	| tok level moduleStr names statement |
	tok := self advance. "consume 'from'"
	level := 0.
	"Dots in any mix: the tokenizer reads ``...'' as one Ellipsis token, so
	``from ....error import X'' (graphql-core) arrives as ``...'' then ``.''.
	Two loops, dots first, left that trailing dot unread -- a SyntaxError."
	[(self matchOp: '.')
		ifTrue: [level := level + 1. true]
		ifFalse: [(self matchOp: '...')
			ifTrue: [level := level + 3. true]
			ifFalse: [false]]] whileTrue.
	"Module name (optional if we have dots)"
	moduleStr := nil.
	(self peek notNil and: [self peekType == #NAME]) ifTrue: [
		moduleStr := self advance value.
		[self matchOp: '.'] whileTrue: [
			moduleStr := moduleStr , '.' , self advance value.
		].
	].
	self expect: #KEYWORD value: 'import'.
	(self peek notNil and: [self peek type == #NEWLINE]) ifTrue: [
		^ PythonParser ___signal___: SyntaxError
			message: 'Expected one or more names after ''import'''
			in: source from: self peek position to: nil].
	"Parse names"
	(self matchOp: '*') ifTrue: [
		"``from X import *'' is legal ONLY at module level.  A star import
		dumps an unknown name set into the scope, which would make every
		bare name in an enclosing function ambiguous between local and
		imported -- CPython rejects it at compile time for that reason
		(``import * only allowed at module level'').  variableStack holds
		one entry for the module body (seeded by source:), so a size above
		1 means we are inside a function, lambda or class body.
		Grail already ASSUMED this rule rather than enforcing it:
		ImportFromAst >> ___boundTargetNames___ excludes star imports
		because ``it can never reach a class body'', and codegen only
		handles the module-level merge (importlib expandStarImports:).
		Without the check the statement silently bound nothing, so the
		later reference raised NameError at run time instead of
		SyntaxError at compile time (test_scope testUnoptimizedNamespaces)."
		variableStack size > 1 ifTrue: [
			^ self ___syntaxError___: 'import * only allowed at module level' at: self lastToken].
		names := Array with: (AliasAst new
			name: #'*';
			asName: nil;
			token: self lastToken ; yourself).
	] ifFalse: [
		| hasParen aTok |
		hasParen := self matchOp: '('.
		names := Array new.
		names add: self parseFromImportName.
		[self matchOp: ','] whileTrue: [
			(hasParen not and: [self peek notNil and: [self peek type == #NEWLINE]]) ifTrue: [
				^ self ___syntaxError___: 'trailing comma not allowed without surrounding parentheses'
					at: self peek].
			((aTok := self peek) notNil and: [ aTok isOp: ')']) ifFalse: [
				names add: self parseFromImportName.
			].
		].
		hasParen ifTrue: [self expect: #OP value: ')'].
	].
	names do: [:alias |
		alias name ~~ #'*' ifTrue: [
			self declareWrite: (alias asName ifNil: [alias name]).
		].
	].
	statement := ImportFromAst new
		module: moduleStr;
		names: names;
		level: level;
		from: tok to: self lastToken ; yourself.
	statement ___isFutureImport___ ifTrue: [
		(names anySatisfy: [:alias | alias name == #'barry_as_FLUFL'])
			ifTrue: [barryAsFlufl := true].
		futureImports add: statement].
	^ statement

]

{ #category : 'Grail-parsing - simple statements' }
PythonParser >> parseImportName [
	"Parse: dotted_name ['as' NAME]"

	| nameTok nameStr asName |
	nameTok := self expectType: #NAME.
	nameStr := nameTok value.
	[self matchOp: '.'] whileTrue: [
		nameStr := nameStr , '.' , self advance value.
	].
	asName := nil.
	(self matchKeyword: 'as') ifTrue: [
		"The alias must be a NAME -- ``import math as await'' consumed the
		KEYWORD token as if it were one (test_badsyntax_2)."
		self ___checkImportTarget___.
		asName := self advance value asSymbol.
		asName == #'_' ifTrue: [asName := #'___unused___'].
		asName := self ___mangle___: asName.
	].
	"``import __m'' binds _C__m while still importing module __m, so the
	 mangled binding goes in asName and the module path is left alone.  A
	 DOTTED import binds only its first component and must not gain an alias
	 (``import a.b as x'' binds a.b, not a), so it is not touched."
	(asName isNil and: [(nameStr includes: $.) not]) ifTrue: [
		| m |
		m := self ___mangle___: nameStr asSymbol.
		m == nameStr asSymbol ifFalse: [asName := m]].
	^AliasAst new
		name: nameStr asSymbol;
		asName: asName;
		from: nameTok to: self lastToken ; yourself

]

{ #category : 'Grail-parsing - expressions' }
PythonParser >> parseInversion [
	"Parse: 'not' inversion | comparison"

	| tok |
	tok := self peek.
	(tok notNil and: [tok isKeyword: 'not']) ifTrue: [
		| operand |
		self advance.
		operand := self parseInversion.
		^NotAst new
			operand: operand;
			from: tok to: self lastToken ; yourself
	].
	^self parseComparison

]

{ #category : 'Grail-parsing - lambda' }
PythonParser >> parseLambda [
	"Parse: lambda [params]: expr.

	Pushes a fresh scope so the lambda's parameters resolve as
	locals inside the body — without this, ``lambda p: p[0]`` would
	emit a module symbol-lookup for ``p`` (NameAst treats undeclared
	names as free / global), trip the NameError fallback at call
	time, and report ``name 'p' is not defined``."

	| tok args body scope |
	tok := self advance. "consume 'lambda'"
	(self atOp: ':') ifTrue: [
		args := ArgumentsAst new
			posonlyargs: { } ;
			args: { } ;
			vararg: nil;
			kwonlyargs: { } ;
			kw_defaults: { } ;
			kwarg: nil;
			defaults: { } ;
			yourself.
	] ifFalse: [
		args := self parseFunctionParametersUntil: ':'.
	].
	self expect: #OP value: ':'.
	self pushScope.
	args posonlyargs do: [:a | self declareVariable: a name asSymbol].
	args args do: [:a | self declareVariable: a name asSymbol].
	args kwonlyargs do: [:a | self declareVariable: a name asSymbol].
	args vararg ifNotNil: [self declareVariable: args vararg name asSymbol].
	args kwarg ifNotNil: [self declareVariable: args kwarg name asSymbol].
	"The body is ``expression'', NOT ``namedexpr'': ``lambda: x := 1'' is a
	SyntaxError, and one CPython names -- ``cannot use assignment
	expressions with lambda'' -- which parseExpression raises once the
	lambda is parsed and the ``:='' is still there.  Parsed permitted, the
	walrus was ACCEPTED inside the body, and the placement gate that this
	sits behind was silently one site too generous."
	body := self
		___withWalrus___: false
		"``(x := lambda: y := 1)'' is ``invalid syntax'': the outer ``:=''
		has already claimed its right-hand side, and CPython does not go on
		to blame the lambda (test_named_expressions invalid_14, against
		invalid_15 for the plain ``(lambda: x := 1)'')."
		refusal: (inWalrusValue
			ifTrue: ['invalid syntax']
			ifFalse: ['cannot use assignment expressions with lambda'])
		do: [self ___inWalrusValue___: false do: [self parseExpression]].
	scope := self popScope.
	^LambdaAst new
		args: args;
		body: body;
		"{variables. writes. hasReturnBlocking} -- the WRITE set, which for
		a lambda holds exactly its walrus targets, and which used to be
		discarded here.  A lambda is a scope like any other: PEP 572 binds
		``lambda: (n := 1) + n'' in the LAMBDA, so the name needs a temp in
		the emitted block and must not reach out to an enclosing function's
		same-named local.  See LambdaAst >> writes."
		writes: (scope at: 2);
		from: tok to: self lastToken ; yourself

]

{ #category : 'Grail-parsing - atoms' }
PythonParser >> parseListDisplay [
	"Parse list display: [expr, ...] or [expr for ...]"
	"Contents are namedexpr_test: a walrus is legal inside any
	grouping, which is what makes ``(x := 5)'' the legal spelling of
	the statement CPython rejects bare."
	^ self ___withWalrus___: true do: [self ___parseListDisplay___]

]

{ #category : 'Grail-parsing - match' }
PythonParser >> parseMatch [
	"Parse: match SUBJECT ':' NEWLINE INDENT case_block+ DEDENT"

	| tok subject cases |
	tok := self advance.  "consume the soft keyword 'match'"
	subject := self parseMatchSubject.
	self ___expectColon___: '''match'' statement' header: tok forced: false.
	cases := self parseCaseBlocks.
	cases isEmpty ifTrue: [
		SyntaxError signal: 'expected at least one case block at line ',
			tok line printString].
	^MatchAst new
		subject: subject;
		cases: cases;
		from: tok to: self lastSpanToken ; yourself

]

{ #category : 'Grail-parsing - match' }
PythonParser >> parseMatchCaptureTarget [
	"A name a pattern BINDS.  Registered as a write so the enclosing
	scope allocates it -- a captured name is an ordinary local, and
	without this it would compile as an unbound read."

	| tok node |
	tok := self peek.
	(tok notNil and: [tok isName]) ifFalse: [
		SyntaxError signal: 'expected a name to bind at line ',
			(tok isNil ifTrue: ['?'] ifFalse: [tok line printString])].
	self advance.
	node := NameAst new
		id: (self ___mangle___: tok value asSymbol);
		ctx: self loadCtx;
		token: tok ; yourself.
	self setStoreCtx: node.
	^node

]

{ #category : 'Grail-parsing - match' }
PythonParser >> parseMatchClassPattern: clsNode from: tok [
	"``C(p, q, kw=r)'' -- positional sub-patterns first, then keyword
	ones.  A positional after a keyword is a syntax error, as it is in a
	call."

	| pats kwNames kwPats seenKeyword |
	self expect: #OP value: '('.
	pats := Array new.
	kwNames := Array new.
	kwPats := Array new.
	seenKeyword := false.
	[self atOp: ')'] whileFalse: [
		| nxt |
		nxt := position + 1 <= tokens size ifTrue: [tokens at: position + 1] ifFalse: [nil].
		(self peek isName and: [nxt notNil and: [nxt isOp: '=']])
			ifTrue: [
				| nameTok |
				seenKeyword := true.
				nameTok := self advance.
				self advance.  "consume '='"
				kwNames := kwNames copyWith: nameTok value asSymbol.
				kwPats := kwPats copyWith: self parseMatchPattern]
			ifFalse: [
				seenKeyword ifTrue: [
					| posTok |
					posTok := self peek.
					self parseMatchPattern.
					^ self ___syntaxError___: 'positional patterns follow keyword patterns'
						from: posTok to: self lastToken].
				pats := pats copyWith: self parseMatchPattern].
		(self matchOp: ',') ifFalse: [
			self expect: #OP value: ')'.
			^MatchClassAst new cls: clsNode; patterns: pats;
				kwdAttrs: kwNames; kwdPatterns: kwPats;
				from: tok to: self lastToken ; yourself]].
	self expect: #OP value: ')'.
	^MatchClassAst new
		cls: clsNode;
		patterns: pats;
		kwdAttrs: kwNames;
		kwdPatterns: kwPats;
		from: tok to: self lastToken ; yourself

]

{ #category : 'Grail-parsing - match' }
PythonParser >> parseMatchClosedPattern [
	"One pattern with no top-level ``|'' or ``as''.

	The NAME cases are where PEP 634's one genuinely surprising rule
	lives: a BARE name CAPTURES (it is a binding, never a comparison),
	while a DOTTED name is a VALUE pattern (a comparison, never a
	binding).  So ``case RED:'' always matches and rebinds RED, and only
	``case Color.RED:'' tests against the constant -- the single most
	common way to write a wrong match statement, and not something the
	implementation may quietly smooth over."

	| tok |
	tok := self peek.
	tok ifNil: [SyntaxError signal: 'Unexpected end of input in pattern'].

	(tok isKeyword: 'None') ifTrue: [^ self parseMatchSingleton].
	(tok isKeyword: 'True') ifTrue: [^ self parseMatchSingleton].
	(tok isKeyword: 'False') ifTrue: [^ self parseMatchSingleton].

	(tok isOp: '[') ifTrue: [^ self parseMatchSequence: '[' close: ']'].
	(tok isOp: '(') ifTrue: [^ self parseMatchGroupOrSequence].
	(tok isOp: '{') ifTrue: [^ self parseMatchMapping].
	(tok isOp: '*') ifTrue: [^ self parseMatchStar].

	tok isName ifTrue: [^ self parseMatchNamePattern].

	"Everything else is a literal: numbers, strings, and the unary minus
	of a negative number.  Reuse the expression parser's atom handling so
	string concatenation and complex literals behave identically to the
	rest of the language -- but through parseUnary, NOT parseExpression,
	so a top-level ``|'' stays the or-pattern separator instead of being
	swallowed as bitwise-or."
	^MatchValueAst new
		value: (self ___checkComplexLiteral___: self parseBitwiseXor);
		from: tok to: self lastToken ; yourself

]

{ #category : 'Grail-parsing - match' }
PythonParser >> parseMatchDottedName [
	"NAME ('.' NAME)* as a LOAD expression -- the value-pattern and
	class-pattern head."

	| tok node |
	tok := self advance.
	node := NameAst new
		id: (self ___mangle___: tok value asSymbol);
		ctx: self loadCtx;
		token: tok ; yourself.
	[self atOp: '.'] whileTrue: [
		| attrTok |
		self advance.
		attrTok := self expectType: #NAME.
		node := AttributeAst new
			value: node;
			attr: attrTok value asSymbol;
			ctx: self loadCtx;
			from: tok to: self lastToken ; yourself].
	^node

]

{ #category : 'Grail-parsing - match' }
PythonParser >> parseMatchGroupOrSequence [
	"``(P)'' is a GROUP -- just parentheses around one pattern -- but
	``(P,)'' and ``(P, Q)'' are sequence patterns, exactly as they are for
	expressions.  The trailing comma is the whole difference."

	| tok first elts |
	tok := self expect: #OP value: '('.
	(self atOp: ')') ifTrue: [
		self advance.
		^MatchSequenceAst new patterns: Array new;
			from: tok to: self lastToken ; yourself].
	first := self parseMatchPattern.
	(self atOp: ')') ifTrue: [
		"group_pattern is ``'(' pattern ')''': a star pattern stands only in a
		sequence, so ``(*x)'' is invalid where ``(*x,)'' is a sequence."
		(first isKindOf: MatchStarAst) ifTrue: [^ self ___invalidSyntaxAt___: self peek].
		self advance.
		^first].
	elts := Array with: first.
	[self matchOp: ','] whileTrue: [
		(self atOp: ')') ifTrue: [
			self advance.
			^self ___matchSequenceOf___: elts from: tok].
		elts := elts copyWith: self parseMatchPattern].
	self expect: #OP value: ')'.
	^self ___matchSequenceOf___: elts from: tok

]

{ #category : 'Grail-parsing - match' }
PythonParser >> parseMatchMapping [
	"``{KEY: P, ..., **rest}''.

	Keys are literals or dotted names -- never patterns, and never bare
	capture names, because a mapping pattern LOOKS UP its keys."

	| tok keys pats rest |
	tok := self expect: #OP value: '{'.
	keys := Array new.
	pats := Array new.
	rest := nil.
	[self atOp: '}'] whileFalse: [
		(self atOp: '**')
			ifTrue: [
				self advance.
				"double_star_pattern binds a pattern_capture_target, which is
				never ``_'' (Grammar/python.gram)."
				(self peek notNil and: [self peek isName and: [self peek value = '_']])
					ifTrue: [^ self ___invalidSyntaxAt___: self peek].
				rest := self parseMatchCaptureTarget.
				"The double-star capture comes last."
				((self atOp: ',') and: [(position + 1 <= tokens size)
					and: [((tokens at: position + 1) isOp: '}') not]]) ifTrue: [
						^ self ___invalidSyntaxAt___: (tokens at: position + 1)]]
			ifFalse: [
				keys := keys copyWith: self parseMatchMappingKey.
				self expect: #OP value: ':'.
				pats := pats copyWith: self parseMatchPattern].
		(self matchOp: ',') ifFalse: [
			self expect: #OP value: '}'.
			^MatchMappingAst new keys: keys; patterns: pats; rest: rest;
				from: tok to: self lastToken ; yourself]].
	self expect: #OP value: '}'.
	^MatchMappingAst new
		keys: keys;
		patterns: pats;
		rest: rest;
		from: tok to: self lastToken ; yourself

]

{ #category : 'Grail-parsing - match' }
PythonParser >> parseMatchMappingKey [
	"A mapping pattern's key: a literal, or a dotted name."

	| tok |
	tok := self peek.
	(tok notNil and: [tok isName]) ifTrue: [^ self parseMatchDottedName].
	"A key literal is a value pattern's literal: a complex one is a real and an
	imaginary part (key_value_pattern's literal_expr)."
	^ self ___checkComplexLiteral___: self parseBitwiseXor

]

{ #category : 'Grail-parsing - match' }
PythonParser >> parseMatchNamePattern [
	"A NAME at the head of a pattern is one of three different things:

	    _          wildcard  -- matches anything, binds nothing
	    x          capture   -- matches anything, BINDS x
	    a.b        value     -- compares against a.b
	    C(...)     class     -- isinstance plus sub-patterns"

	| tok node |
	tok := self peek.
	(tok value = '_' and: [
		| nxt |
		nxt := position + 1 <= tokens size ifTrue: [tokens at: position + 1] ifFalse: [nil].
		nxt isNil or: [(nxt isOp: '.') not and: [(nxt isOp: '(') not]]])
		ifTrue: [
			self advance.
			^MatchAsAst new pattern: nil; name: nil;
				from: tok to: self lastToken ; yourself].
	node := self parseMatchDottedName.
	(self atOp: '(') ifTrue: [^ self parseMatchClassPattern: node from: tok].
	(node isKindOf: NameAst) ifTrue: [
		"A bare name captures.  Re-declare it as a WRITE: parseMatchDottedName
		registered a read, which is right for the dotted case and wrong here."
		| target |
		target := NameAst new
			id: node id;
			ctx: self loadCtx;
			token: tok ; yourself.
		self setStoreCtx: target.
		^MatchAsAst new pattern: nil; name: target;
			from: tok to: self lastToken ; yourself].
	^MatchValueAst new
		value: node;
		from: tok to: self lastToken ; yourself

]

{ #category : 'Grail-parsing - match' }
PythonParser >> parseMatchOrPattern [
	"closed_pattern ('|' closed_pattern)*"

	| tok alts |
	tok := self peek.
	alts := Array with: self parseMatchClosedPattern.
	[self atOp: '|'] whileTrue: [
		self advance.
		alts := alts copyWith: self parseMatchClosedPattern].
	alts size = 1 ifTrue: [^alts first].
	^MatchOrAst new
		patterns: alts;
		from: tok to: self lastToken ; yourself

]

{ #category : 'Grail-parsing - match' }
PythonParser >> parseMatchPattern [
	"or_pattern ['as' NAME]"

	| tok inner target |
	tok := self peek.
	inner := self parseMatchOrPattern.
	(self atKeyword: 'as') ifFalse: [^inner].
	self advance.
	"CPython's invalid_as_pattern: ``_'' cannot be bound, and an expression
	that is not a name is named."
	(self peek notNil and: [self peek isName and: [self peek value asString = '_']])
		ifTrue: [^ self ___syntaxError___: 'cannot use ''_'' as a target' at: self peek].
	(self peek notNil and: [self peek isName and: [| nxt |
			nxt := position + 1 <= tokens size ifTrue: [tokens at: position + 1].
			nxt notNil and: [(nxt isOp: '.') or: [(nxt isOp: '(') or: [nxt isOp: '[']]]]])
		| (self peek notNil and: [self peek isName not]) ifTrue: [
			| expr |
			expr := [self parseExpression] on: SyntaxError do: [:ex | ex return: nil].
			expr notNil ifTrue: [
				^ self ___syntaxError___: 'cannot use ' , (self ___exprName___: expr)
					, ' as pattern target' node: expr]].
	target := self parseMatchCaptureTarget.
	^MatchAsAst new
		pattern: inner;
		name: target;
		from: tok to: self lastToken ; yourself

]

{ #category : 'Grail-parsing - match' }
PythonParser >> parseMatchPatterns [
	"Top level of a case's pattern.  A bare comma makes an OPEN sequence
	pattern: ``case 1, 2:'' is the same as ``case [1, 2]:''."

	| first elts startTok |
	startTok := self peek.
	first := self parseMatchPattern.
	(self atOp: ',') ifFalse: [^first].
	elts := Array with: first.
	[self matchOp: ','] whileTrue: [
		((self atOp: ':') or: [self atKeyword: 'if']) ifTrue: [
			^MatchSequenceAst new patterns: elts;
				from: startTok to: self lastToken ; yourself].
		elts := elts copyWith: self parseMatchPattern].
	^MatchSequenceAst new
		patterns: elts;
		from: startTok to: self lastToken ; yourself

]

{ #category : 'Grail-parsing - match' }
PythonParser >> parseMatchSequence: openOp close: closeOp [
	"``[p, q]'' or ``(p, q)'' -- an exact-arity sequence pattern unless it
	contains a star."

	| tok elts |
	tok := self expect: #OP value: openOp.
	elts := Array new.
	[self atOp: closeOp] whileFalse: [
		elts := elts copyWith: self parseMatchPattern.
		(self matchOp: ',') ifFalse: [
			self expect: #OP value: closeOp.
			^self ___matchSequenceOf___: elts from: tok]].
	self expect: #OP value: closeOp.
	^self ___matchSequenceOf___: elts from: tok

]

{ #category : 'Grail-parsing - match' }
PythonParser >> parseMatchSingleton [
	"None / True / False -- compared by identity, so they get their own
	node rather than folding into MatchValueAst."

	| tok |
	tok := self peek.
	^MatchSingletonAst new
		value: self parseAtom;
		from: tok to: self lastToken ; yourself

]

{ #category : 'Grail-parsing - match' }
PythonParser >> parseMatchStar [
	"``*name'' or ``*_'' inside a sequence pattern."

	| tok target |
	tok := self advance.  "consume '*'"
	target := nil.
	(self peek notNil and: [self peek isName and: [self peek value = '_']])
		ifTrue: [self advance]
		ifFalse: [target := self parseMatchCaptureTarget].
	^MatchStarAst new
		name: target;
		from: tok to: self lastToken ; yourself

]

{ #category : 'Grail-parsing - match' }
PythonParser >> parseMatchSubject [
	"The subject expression, CPython's ``subject_expr'' (Grammar/python.gram):

	    subject_expr: star_named_expression ',' star_named_expressions?
	                | named_expression

	A bare comma makes it a TUPLE, without parentheses: ``match x, y:''
	matches the pair.  Every element is a NAMED expression -- a walrus is
	allowed, ``match w := x,:'' -- and a tuple's elements may be starred.
	Each element was read as a plain expression, so a walrus anywhere in
	the subject was ``invalid syntax'' and test_patma could not compile at
	all.  A starred subject that is not part of a tuple (``match *x:'') is
	CPython's ``invalid syntax''."

	| first elts startTok |
	startTok := self peek.
	first := self parseMatchSubjectElement.
	(self atOp: ',') ifFalse: [
		(first isKindOf: StarredAst) ifTrue: [
			^ self ___syntaxError___: 'invalid syntax' at: startTok].
		^ first].
	elts := Array with: first.
	[self matchOp: ','] whileTrue: [
		(self atOp: ':') ifTrue: [^TupleAst new
			elts: elts; ctx: self loadCtx;
			from: startTok to: self lastToken ; yourself].
		elts := elts copyWith: self parseMatchSubjectElement].
	^TupleAst new
		elts: elts;
		ctx: self loadCtx;
		from: startTok to: self lastToken ; yourself

]

{ #category : 'Grail-parsing - match' }
PythonParser >> parseMatchSubjectElement [

	"One element of a match subject: CPython's star_named_expression -- a
	walrus, or a starred expression."

	^ self ___withWalrus___: true do: [self parseStarExpression]

]

{ #category : 'Grail-parsing - module' }
PythonParser >> parseModule [
	"Parse a complete module. Returns a ModuleAst."

	| body block module variables writes blocking scope |
	self skipNewlines.
	body := self ___parsingEvalInput___
		ifTrue: [self ___parseEvalInput___]
		ifFalse: [self parseStatements].
	"PEP 572's comprehension restrictions, checked over the finished tree --
	see ___validateComprehensions___: for why this cannot run at construction
	time."
	self ___validateComprehensions___: body.
	scope := self popScope.
	variables := scope at: 1.
	writes := scope at: 2.
	blocking := scope at: 3.
	block := BlockAst new
		body: body;
		variables: variables;
		writes: writes;
		hasReturnBlocking: blocking;
		globalNames: (scope at: 4);
		reads: (scope at: 5);
		nonlocalNames: (scope at: 6);
		yourself.
	module := ModuleAst basicNew.
	module
		name: '__main__';
		path: nil;
		source: source;
		useTempsForBlock: true;
		setBlock: block.
	^module

]

{ #category : 'Grail-parsing - simple statements' }
PythonParser >> parseNonlocal [
	"Parse: nonlocal name, ...

	Each declared name is also registered in the current scope's
	nonlocalStack so popScope strips it from the variable + write
	sets at scope exit.  Without that strip, an inner ``x = expr''
	would declare a fresh Smalltalk temp for ``x'' that shadows the
	outer scope's binding — Python's nonlocal contract is exactly
	the opposite (assignments should reach the enclosing scope's
	location)."

	| tok names |
	tok := self advance. "consume 'nonlocal'"
	names := Array new.
	names add: self advance value asSymbol.
	[self matchOp: ','] whileTrue: [
		names add: self advance value asSymbol.
	].
	names := names collect: [:n | self ___mangle___: n].
	names do: [:n | self ___checkDeclarationLegal___: n kind: 'nonlocal' at: tok].
	names do: [:n | nonlocalStack last add: n].
	^NonlocalAst new
		names: names;
		from: tok to: self lastToken ; yourself

]

{ #category : 'Grail-parsing - atoms' }
PythonParser >> parseNumberValue: aString [
	"Convert a number string to a Smalltalk number."

	| str |
	str := aString.

	"Python permits underscore digit separators in every numeric literal
	(1_000_000, 0xdead_beef, 1_0.5e1_0); GemStone's asNumber stops at the
	first underscore and returns a truncated value, so strip them first."
	(str includes: $_) ifTrue: [str := str copyWithout: $_].

	"Python allows a leading-dot float with no integer part (.5, .3e2,
	.5j); GemStone's asNumber rejects it with rtErrBadFormat, so supply
	the implicit leading zero."
	(str notEmpty and: [str first == $.]) ifTrue: [str := '0' , str].

	"Complex number"
	(str notEmpty and: [(str last == $j) or: [str last == $J]]) ifTrue: [
		| realPart |
		realPart := (str copyFrom: 1 to: str size - 1) asNumber.
		^complex @env1:__new__: 0.0 _: realPart
	].

	"Hex / octal / binary — via integerFrom:radix: rather than the
	('16r' , digits) asInteger idiom, which breaks on host extents
	that override CharacterCollection>>asInteger (see the helper)."
	(str size > 2 and: [(str copyFrom: 1 to: 2) = '0x' or: [(str copyFrom: 1 to: 2) = '0X']]) ifTrue: [
		^PythonParser integerFrom: (str copyFrom: 3 to: str size) radix: 16
	].

	"Octal"
	(str size > 2 and: [(str copyFrom: 1 to: 2) = '0o' or: [(str copyFrom: 1 to: 2) = '0O']]) ifTrue: [
		^PythonParser integerFrom: (str copyFrom: 3 to: str size) radix: 8
	].

	"Binary"
	(str size > 2 and: [(str copyFrom: 1 to: 2) = '0b' or: [(str copyFrom: 1 to: 2) = '0B']]) ifTrue: [
		^PythonParser integerFrom: (str copyFrom: 3 to: str size) radix: 2
	].

	"Float or integer"
	^str asNumber

]

{ #category : 'Grail-parsing - atoms' }
PythonParser >> parseParenExpr [
	"Parse parenthesized expression, tuple, or generator."
	"Contents are namedexpr_test: a walrus is legal inside any
	grouping, which is what makes ``(x := 5)'' the legal spelling of
	the statement CPython rejects bare."
	^ self ___withWalrus___: true do: [self ___parseParenExpr___]

]

{ #category : 'Grail-parsing - simple statements' }
PythonParser >> parsePass [

	| tok |
	tok := self advance. "consume 'pass'"
	^PassAst new token: tok ; yourself

]

{ #category : 'Grail-parsing - expressions' }
PythonParser >> parsePower [
	"Parse: primary ['**' factor]"

	| left startTok |
	startTok := self peek.
	left := self parsePrimary.
	(self atOp: '**') ifTrue: [
		| right |
		self advance.
		self ___rejectStarredOperand___.
		right := self parseFactor.
		^BinOpAst new
			left: left;
			op: PowAst basicNew;
			right: right;
			from: startTok to: self lastToken ; yourself
	].
	^left

]

{ #category : 'Grail-parsing - expressions' }
PythonParser >> parsePrimary [
	"Parse: atom trailer* where trailer is .name, [subscript], or (args)"

	| expr startTok aTok |
	startTok := self peek.
	expr := self parseAtom.
	"Parse trailers"
	[(aTok := self peek) notNil and: [(aTok isOp: '.') or: [(aTok isOp: '[') or: [aTok isOp: '(']]]] whileTrue: [
		(self atOp: '.') ifTrue: [
			| nameTok |
			self advance.
			nameTok := self expectType: #NAME.
			expr := AttributeAst new
				value: expr;
				attr: nameTok value asSymbol;
				ctx: self loadCtx;
				from: startTok to: self lastToken ; yourself.
		] ifFalse: [
		(self atOp: '[') ifTrue: [
			| slice |
			self advance.
			"A subscript is a namedexpr_test too: ``a[b := 0]'' is legal,
			and it is the shape test_named_expressions itself uses -- which is
			how the first cut of this gate stopped that module importing at
			all."
			slice := self ___withWalrus___: true do: [self parseSubscript].
			self expect: #OP value: ']'.
			expr := SubscriptAst new
				value: expr;
				slice: slice;
				ctx: self loadCtx;
				from: startTok to: self lastToken ; yourself.
		] ifFalse: [
		(self atOp: '(') ifTrue: [
			| result callArgs callKwargs |
			self advance.
			result := self parseCallArgList.
			callArgs := result first.
			callKwargs := result last.
			self expect: #OP value: ')'.
			expr := CallAst new
				function: expr;
				arguments: callArgs;
				keywords: callKwargs;
				from: startTok to: self lastToken ; yourself.
		]]].
	].
	^expr

]

{ #category : 'Grail-parsing - simple statements' }
PythonParser >> parseRaise [
	"Parse: raise [expr ['from' expr]]"

	| tok exc cause aTok |
	tok := self advance. "consume 'raise'"
	exc := nil.
	cause := nil.
	((aTok:= self peek) notNil and: [ aTok isNewline not and: [ aTok isEndMarker not]]) ifTrue: [
		exc := self parseExpression.
		(self matchKeyword: 'from') ifTrue: [
			cause := self parseExpression.
		].
	].
	^RaiseAst new
		exc: exc;
		cause: cause;
		from: tok to: self lastToken ; yourself

]

{ #category : 'Grail-parsing - simple statements' }
PythonParser >> parseReturn [
	"Parse: return [expr]"

	| tok value aTok |
	tok := self advance. "consume 'return'"
	value := nil.
	((aTok := self peek) notNil and: [ aTok isNewline not and: [ aTok isEndMarker not and: [(aTok isOp: ';') not]]]) ifTrue: [
		value := self parseStarExpressions.
	].
	^ReturnAst new
		value: value;
		from: tok to: self lastToken ; yourself

]

{ #category : 'Grail-parsing - expressions' }
PythonParser >> parseShift [
	"Parse: sum (('<<' | '>>') sum)*"

	| left startTok aTok |
	startTok := self peek.
	left := self parseSum.
	[(aTok := self peek) notNil and: [(aTok isOp: '<<') or: [ aTok isOp: '>>']]] whileTrue: [
		| opTok opClass right |
		opTok := self advance.
		opClass := opTok value = '<<' ifTrue: [LShiftAst] ifFalse: [RShiftAst].
		self ___rejectStarredOperand___.
		right := self parseSum.
		left := BinOpAst new
			left: left;
			op: opClass basicNew;
			right: right;
			from: startTok to: self lastToken ; yourself.
	].
	^left

]

{ #category : 'Grail-parsing - statements' }
PythonParser >> parseSimpleStatement [
	"Parse a single simple statement."

	| tok |
	tok := self peek.

	(tok isKeyword: 'return') ifTrue: [^self parseReturn].
	(tok isKeyword: 'import') ifTrue: [^self parseImport].
	(tok isKeyword: 'from') ifTrue: [^self parseImportFrom].
	(tok isKeyword: 'raise') ifTrue: [^self parseRaise].
	(tok isKeyword: 'assert') ifTrue: [^self parseAssert].
	(tok isKeyword: 'del') ifTrue: [^self parseDelete].
	(tok isKeyword: 'global') ifTrue: [^self parseGlobal].
	(tok isKeyword: 'nonlocal') ifTrue: [^self parseNonlocal].
	(tok isKeyword: 'pass') ifTrue: [^self parsePass].
	(tok isKeyword: 'break') ifTrue: [^self parseBreak].
	(tok isKeyword: 'continue') ifTrue: [^self parseContinue].
	(tok isKeyword: 'yield') ifTrue: [^self parseYieldStatement].

	"Assignment or expression statement"
	^self parseExpressionOrAssignment

]

{ #category : 'Grail-parsing - statements' }
PythonParser >> parseSimpleStatements [
	"Parse one or more simple statements separated by ';'."

	| stmts stmt |
	stmts := Array new.
	stmt := self parseSimpleStatement.
	stmts add: stmt.
	[self matchOp: ';'] whileTrue: [ | aTok |
		((aTok := self peek) notNil and: [ aTok isNewline or: [ aTok isEndMarker]]) ifTrue: [
			"Trailing semicolon"
		] ifFalse: [
			stmts add: self parseSimpleStatement.
		].
	].
	self checkSimpleStatementTerminator: stmts last.
	^stmts

]

{ #category : 'Grail-parsing - parameters' }
PythonParser >> parseSingleParam [
	"Parse a single parameter: NAME [: annotation]"

	^self parseSingleParamWithAnnotations: true

]

{ #category : 'Grail-parsing - parameters' }
PythonParser >> parseSingleParamWithAnnotations: allowAnnotations [
	"Parse a single parameter: NAME [: annotation].  Rename a bare
	`_` parameter to `___unused___` so it doesn't break the emitted
	Smalltalk (`_` alone isn't a valid Smalltalk identifier).  See
	the same rename in parsePrimary's NameAst construction."

	| nameTok annotation argName |
	nameTok := self expectType: #NAME.
	annotation := nil.
	(allowAnnotations and: [self matchOp: ':']) ifTrue: [
		annotation := self parseExpression.
	].
	argName := nameTok value asSymbol.
	argName = #'_' ifTrue: [argName := #'___unused___'].
	"A private PARAMETER is mangled too: CPython's co_varnames for
	 ``def f(self, __a)'' in class C is ('self', '_C__a'), so a keyword call has
	 to spell it _C__a -- ``c.f(__a=1)'' is a TypeError even from inside C,
	 because call-site keywords are never mangled (see parseCallArgList)."
	argName := self ___mangle___: argName.
	^ArgAst new
		arg: argName;
		annotation: annotation;
		type_comment: nil;
		from: nameTok to: self lastToken ; yourself

]

{ #category : 'Grail-parsing - subscript' }
PythonParser >> parseSliceOrExpr [
	"Parse either a slice (lower:upper[:step]) or a regular expression."

	| lower upper step hasColon startTok |
	startTok := self peek.
	hasColon := false.

	"Check for initial colon (no lower bound)"
	(self atOp: ':') ifTrue: [
		lower := nil.
		hasColon := true.
	] ifFalse: [
		lower := self parseExpression.
		(self atOp: ':') ifTrue: [
			hasColon := true.
		] ifFalse: [
			"Just an expression, not a slice"
			^lower
		].
	].

	"Parse upper bound"
	self advance. "consume ':'"
	upper := nil.
	((self atOp: ':') or: [(self atOp: ']') or: [self atOp: ',']]) ifFalse: [
		upper := self parseExpression.
	].

	"Parse optional step"
	step := nil.
	(self matchOp: ':') ifTrue: [
		((self atOp: ']') or: [self atOp: ',']) ifFalse: [
			step := self parseExpression.
		].
	].

	^SliceAst new
		lower: lower;
		upper: upper;
		step: step;
		from: startTok to: self lastToken ; yourself

]

{ #category : 'Grail-parsing - star expressions' }
PythonParser >> parseStarExpression [
	"Parse: '*' bitwise_or | expression"

	| tok |
	tok := self peek.
	(tok notNil and: [tok isOp: '*']) ifTrue: [
		| value |
		self advance.
		value := self parseBitwiseOr.
		^StarredAst new
			value: value;
			ctx: self loadCtx;
			from: tok to: self lastToken ; yourself
	].
	^self parseExpression

]

{ #category : 'Grail-parsing - star expressions' }
PythonParser >> parseStarExpressions [
	"Parse comma-separated expressions, possibly starred.
	Returns a single expression or a tuple if there's a comma."

	| first exprs startTok aTok |
	startTok := self peek.
	first := self parseStarExpression.
	((aTok := self peek) notNil and: [ aTok isOp: ',']) ifFalse: [^first].

	exprs := Array new.
	exprs add: first.
	[self matchOp: ','] whileTrue: [ 
		((aTok := self peek) notNil and: [ aTok isNewline not and: [ aTok isEndMarker not 
      and:[( aTok isOp: ')') not and: [( aTok isOp: ']') not and: [( aTok isOp: '}') not 
      and: [( aTok isOp: ':') not and: [( aTok isOp: ';') not and: [( aTok isOp: '=') not]]]]]]]]) ifTrue: [
			exprs add: self parseStarExpression.
		].
	].
	"A trailing comma after a single element is a 1-tuple, NOT the bare
	expression: ``x,'' is ``(x,)'' and ``arr, = f()'' unpacks a 1-tuple
	(arr := f()[0]).  We only reach here when a comma was consumed, so
	always build a TupleAst — collapsing size==1 to ``first'' would turn
	``arr, = f()'' into ``arr = f()'' (binding the whole result).  The
	``=''-stop in the guard above keeps ``x, = ...'' from trying to parse
	the ``='' as another tuple element."
	^TupleAst new
		elts: exprs;
		ctx: self loadCtx;
		from: startTok to: self lastToken ; yourself

]

{ #category : 'Grail-parsing - star expressions' }
PythonParser >> parseStarTarget [
	"Parse: '*' primary | primary"

	| tok |
	tok := self peek.
	(tok notNil and: [tok isOp: '*']) ifTrue: [
		| value |
		self advance.
		value := self parsePrimary.
		^StarredAst new
			value: value;
			ctx: self loadCtx;
			from: tok to: self lastToken ; yourself
	].
	^self parsePrimary

]

{ #category : 'Grail-parsing - star expressions' }
PythonParser >> parseStarTargets [
	"Parse assignment targets, possibly starred, possibly as tuple."

	| first targets startTok aTok |
	startTok := self peek.
	first := self parseStarTarget.
	((aTok := self peek) notNil and: [ aTok isOp: ',']) ifFalse: [^first].

	targets := Array new.
	targets add: first.
	[self matchOp: ','] whileTrue: [
		((aTok := self peek) notNil and: [( aTok isKeyword: 'in') not and: [ aTok isNewline not 
     and: [( aTok isOp: ':') not and: [( aTok isOp: ')') not]]]]) ifTrue: [
			targets add: self parseStarTarget.
		].
	].
	^TupleAst new
		elts: targets;
		ctx: self loadCtx;
		from: startTok to: self lastToken ; yourself

]

{ #category : 'Grail-parsing - statements' }
PythonParser >> parseStatement [
	"Parse a single statement. Returns an array of statements
	(simple_stmts can contain multiple ';'-separated statements)."

	| tok |
	tok := self peek.
	tok ifNil: [^Array new].

	"PEP 695: ``class C[T]'' and ``type A[T] = V'' are rewritten, in the token
	stream, into the scope function CPython's compiler builds -- see
	___rewriteTypeParamStatement___.  What follows then parses its ``def''."
	self ___rewriteTypeParamStatement___ ifTrue: [tok := self peek].

	"Compound statements"
	(tok isKeyword: 'if') ifTrue: [^Array with: self parseIf].
	(tok isKeyword: 'while') ifTrue: [^Array with: self parseWhile].
	(tok isKeyword: 'for') ifTrue: [^Array with: self parseFor].
	(tok isKeyword: 'def') ifTrue: [^Array with: self parseFunctionDef].
	(tok isKeyword: 'class') ifTrue: [^Array with: self parseClassDef].
	(tok isKeyword: 'try') ifTrue: [^Array with: self parseTry].
	(tok isKeyword: 'with') ifTrue: [^Array with: self parseWith].
	(tok isKeyword: 'async') ifTrue: [^Array with: self parseAsync].
	(tok isOp: '@') ifTrue: [^Array with: self parseDecorated].

	"``match'' is a SOFT keyword (PEP 634): it is an ordinary identifier
	everywhere except at the head of a match statement, so ``match = 1'',
	``match(x)'' and ``match[i] = 2'' all have to keep working.  The
	tokenizer therefore hands it over as a NAME and the decision is made
	here, by lookahead -- see atMatchStatement."
	self atMatchStatement ifTrue: [^Array with: self parseMatch].

	"``type'' is a soft keyword too (PEP 695), and a far more heavily used
	identifier than ``match'' -- it is a BUILTIN.  See atTypeAliasStatement."
	self atTypeAliasStatement ifTrue: [^Array with: self parseTypeAlias].

	"Simple statements"
	^self parseSimpleStatements

]

{ #category : 'Grail-parsing - statements' }
PythonParser >> parseStatements [
	"Parse a sequence of statements until ENDMARKER or DEDENT."

	| stmts aTok|
	stmts := Array new.
	self skipNewlines.
	[(aTok := self peek) notNil and: [aTok isEndMarker not and: [aTok type ~~ #DEDENT ]]] whileTrue: [
		stmts addAll: self parseStatement.
		self skipNewlines.
	].
	^stmts

]

{ #category : 'Grail-parsing - atoms' }
PythonParser >> parseStringLiteral [
	"Parse one or more adjacent string tokens (implicit concatenation).

	Collect the parts first, because a part may be a PyStrSurrogate -- a
	str the tokenizer could not build as a CharacterCollection because it
	holds a lone surrogate.  Streaming straight into a Unicode7 sent
	``addAll:'' to that object and died on ``do:''.  Adjacent-literal
	concatenation is how these appear in practice: CPython's own tests
	write them split across source lines."

	| startTok parts aTok |
	startTok := self peek.
	parts := OrderedCollection new.
	[(aTok := self peek) notNil and: [ aTok isString]] whileTrue: [
		parts add: self advance value.
	].
	^ConstantAst new
		value: (self ___joinStringParts___: parts);
		kind: nil;
		from: startTok to: self lastToken ; yourself

]

{ #category : 'Grail-parsing - subscript' }
PythonParser >> parseSubscript [
	"Parse a subscript expression which may be a slice or a regular expression.
	Handles: expr, lower:upper, lower:upper:step, and tuples of slices."

	| items first |
	first := self parseSliceOrExpr.

	"Check for tuple of slices: a[1:2, 3]"
	(self matchOp: ',') ifTrue: [
		items := Array new.
		items add: first.
		(self atOp: ']') ifFalse: [
			items add: self parseSliceOrExpr.
			[self matchOp: ','] whileTrue: [
				(self atOp: ']') ifFalse: [
					items add: self parseSliceOrExpr.
				].
			].
		].
		^TupleAst new
			elts: items;
			ctx: self loadCtx;
			from: (tokens at: position - 1) to: self lastToken ; yourself
	].

	"``a[*b]'' is ``a[(*b,)]'' (PEP 646): a lone starred index is a one-element
	 tuple display.  Bare, it reached StarredAst's expression printer, which
	 answers a ``*-unpack in call sites'' TypeError -- so ``tuple[*Ts]'' failed."
	(first isKindOf: StarredAst) ifTrue: [
		^ TupleAst new
			elts: { first };
			ctx: self loadCtx;
			from: (tokens at: position - 1) to: self lastToken ; yourself].

	^first

]

{ #category : 'Grail-parsing - expressions' }
PythonParser >> parseSum [
	"Parse: term (('+' | '-') term)*"

	| left startTok aTok |
	startTok := self peek.
	left := self parseTerm.
	[(aTok := self peek) notNil and: [(aTok isOp: '+') or: [aTok isOp: '-']]] whileTrue: [
		| opTok opClass right |
		opTok := self advance.
		opClass := opTok value = '+' ifTrue: [AddAst] ifFalse: [SubAst].
		self ___rejectStarredOperand___.
		right := self parseTerm.
		left := BinOpAst new
			left: left;
			op: opClass basicNew;
			right: right;
			from: startTok to: self lastToken ; yourself.
	].
	^left

]

{ #category : 'Grail-parsing - expressions' }
PythonParser >> parseTerm [
	"Parse: factor (('*' | '/' | '//' | '%' | '@') factor)*"

	| left startTok aTok |
	startTok := self peek.
	left := self parseFactor.
	[(aTok := self peek) notNil and: [(aTok isOp: '*') or: [(aTok isOp: '/') or: [(aTok isOp: '//') 
     or: [(aTok isOp: '%') or: [aTok isOp: '@']]]]]] whileTrue: [
		| opTok opClass right |
		opTok := self advance.
		opClass := self operatorClassFor: opTok value.
		self ___rejectStarredOperand___.
		right := self parseFactor.
		left := BinOpAst new
			left: left;
			op: opClass basicNew;
			right: right;
			from: startTok to: self lastToken ; yourself.
	].
	^left

]

{ #category : 'Grail-parsing - expressions' }
PythonParser >> parseTernary [
	"Parse: expr ['if' condition 'else' expr]

	Where each expression starts is kept while it is parsed, and its head
	disjunction's tokens once parsed, for CPython's missing-comma error
	(___signalMissingCommaBefore___:)."

	openExpressions addLast: position.
	^ [self ___parseTernary___] ensure: [openExpressions removeLast]

]

{ #category : 'Grail-parsing - compound statements' }
PythonParser >> parseTry [
	"Parse: try: body [except [type [as name]]: body]+ [else: body] [finally: body]"

	| tok body handlers orelse finalbody |
	tok := self advance. "consume 'try'"
	self ___expectColon___: '''try'' statement' header: tok forced: true.
	body := self parseBlock.
	"CPython's invalid_try_stmt: a try with neither handler is refused, at
	the end of its body's last line."
	((self atKeywordSkippingNewlines: 'except') or: [self atKeywordSkippingNewlines: 'finally'])
		ifFalse: [^ self ___signalTryWithoutHandler___].
	handlers := Array new.
	orelse := Array new.
	finalbody := Array new.

	"Parse except clauses"
	[self atKeywordSkippingNewlines: 'except'] whileTrue: [
		| exceptTok excType excName exceptBody aTok isStarClause starTok |
		exceptTok := self advance. "consume 'except'"
		"PEP 654 ``except*''.  Consumed HERE, before the type expression:
		left in place it parsed as a STARRED EXPRESSION -- ``except (*T)''
		-- and surfaced at runtime as ``*-unpack in call sites is not yet
		supported'', an error naming neither except nor exception groups."
		starTok := self peek.
		isStarClause := self matchOp: '*'.
		"CPython refuses mixing the two forms in one try, at the clause that
		mixes them: ``except*'' after ``except'' over both tokens, ``except''
		after ``except*'' at the keyword.  And an ``except*'' must name a type."
		(handlers notEmpty and: [handlers first isStar ~~ isStarClause]) ifTrue: [
			^ isStarClause
				ifTrue: [self ___syntaxError___:
					'cannot have both ''except'' and ''except*'' on the same ''try'''
					from: exceptTok to: starTok]
				ifFalse: [self ___syntaxError___:
					'cannot have both ''except'' and ''except*'' on the same ''try'''
					at: exceptTok]].
		(isStarClause and: [self peek notNil and: [(self atOp: ':') or: [self peek type == #NEWLINE]]])
			ifTrue: [^ self ___syntaxError___: 'expected one or more exception types' at: self peek].
		excType := nil.
		excName := nil.
		((aTok := self peek) notNil and: [(aTok isOp: ':') not]) ifTrue: [
			excType := self parseExpression.
			"PEP 758 (3.14): the types may be listed without parentheses when
			there is no ``as''.  With one, CPython asks for the parentheses,
			from the first type to the name."
			(self atOp: ',') ifTrue: [
				| types |
				types := OrderedCollection with: excType.
				[self matchOp: ','] whileTrue: [types add: self parseExpression].
				(self atKeyword: 'as') ifTrue: [
					self advance.
					^ self ___syntaxError___:
						'multiple exception types must be parenthesized when using ''as'''
						from: excType to: self peek].
				excType := TupleAst new
					elts: types asArray;
					ctx: self loadCtx;
					from: excType to: self lastToken ; yourself].
			(self matchKeyword: 'as') ifTrue: [
				excName := self advance value asSymbol.
				"``except E as _'' must track the parse-time rename of ``_''
				that NameAst and the import-alias sites (parseFromImportName,
				parseDottedAsName) already apply: a BARE ``_'' is not an
				identifier in GemStone Smalltalk at all -- it lexes as the
				legacy assignment operator (``x _ 5'' assigns) -- so emitting
				it as a method temp produced ``| ___curPos___ _ e |'' and the
				whole function failed to compile.  Underscores WITHIN an
				identifier are fine, which is what makes ___unused___ legal."
				excName == #'_' ifTrue: [excName := #'___unused___'].
				excName := self ___mangle___: excName.
				"Bind the except name into the enclosing scope (module body
				or function), so a module-level ``except X as e'' records e
				as a module variable rather than an undeclared name."
				self declareWrite: excName.
			].
		].
		self ___expectColon___: (isStarClause
				ifTrue: ['''except*'' statement'] ifFalse: ['''except'' statement'])
			header: exceptTok forced: false.
		exceptBody := self parseBlock.
		"Checked HERE rather than at codegen: it is a SyntaxError, so it has
		to fire while parsing the source that contains it."
		isStarClause ifTrue: [
			exceptBody do: [:stmt |
				(stmt isKindOf: AbstractNode)
					ifTrue: [stmt ___rejectExceptStarFlowControl___: false]]
		].
		handlers add: (ExceptHandlerAst new
			type: excType;
			name: excName;
			isStar: isStarClause;
			body: (self wrapSuite: exceptBody);
			from: exceptTok to: self lastSpanToken ; yourself).
		"CPython rejects mixing the two forms in one try, and so must we:
		the emitted shapes are different, so a mixed try has no meaning to
		fall back on."

	].

	"Parse else clause"
	((self atKeywordSkippingNewlines: 'else') and: [self matchKeyword: 'else']) ifTrue: [
		self ___expectColon___: '''else'' statement' header: self lastToken forced: true.
		orelse := self parseBlock.
	].

	"Parse finally clause"
	((self atKeywordSkippingNewlines: 'finally') and: [self matchKeyword: 'finally']) ifTrue: [
		self ___expectColon___: '''finally'' statement' header: self lastToken forced: true.
		finalbody := self parseBlock.
		"Flag the enclosing scope as return-blocking — the finally
		cleanup is emitted AFTER the try body, the same pattern that
		makes ``^''-style returns produce dead code."
		self markScopeReturnBlocking.
	].

	^TryAst new
		body: (self wrapSuite: body);
		handlers: handlers;
		orelse: (self wrapSuite: orelse);
		finalbody: (self wrapSuite: finalbody);
		from: tok to: self lastSpanToken ; yourself

]

{ #category : 'Grail-parsing - type alias' }
PythonParser >> parseTypeAlias [
	"Parse: type NAME '=' expression

	The PARAMETERISED form ``type X[T] = list[T]'' is REFUSED here rather
	than accepted and quietly given no type parameters.  Binding T inside
	the (lazily evaluated) value needs a scope Grail does not have yet, so
	accepting the syntax would leave T resolving to whatever the enclosing
	scope happened to hold -- a wrong ANSWER rather than an error, and one
	that surfaces far from its cause.  A SyntaxError naming the
	unsupported form is the honest reading."

	| tok target valueExpr nameNode aliasValue |
	tok := self advance.  "consume the soft keyword 'type'"
	target := self expectType: #NAME.
	(self atOp: '[') ifTrue: [
		SyntaxError signal:
			'Grail does not yet support type parameters on a type alias (type '
				, target value , '[...] = ...) at line ' , tok line printString].
	self expect: #OP value: '='.
	valueExpr := self parseExpression.
	nameNode := self ___typeAliasTarget___: target.
	aliasValue := TypeAliasValueAst new
		aliasName: target value asString;
		value: valueExpr;
		from: tok to: self lastToken ; yourself.
	^TypeAliasAst new
		name: nameNode;
		value: valueExpr;
		assign: (AssignAst new
			targets: (Array with: nameNode);
			value: aliasValue;
			from: tok to: self lastToken ; yourself);
		from: tok to: self lastToken ; yourself

]

{ #category : 'Grail-parsing - compound statements' }
PythonParser >> parseWhile [
	"Parse: while test: body [else: body]"

	| tok test body orelse |
	tok := self advance. "consume 'while'"
	"The condition is a namedexpr_test: ``while (n := f()) > 0'' is the
	point of PEP 572, and the unparenthesised ``while n := f()'' is legal
	too."
	test := self ___withWalrus___: true do: [self parseExpression].
	self ___checkStrayEquals___: test.
	self ___expectColon___: '''while'' statement' header: tok forced: false.
	body := self parseBlock.
	orelse := Array new.
	"SkippingNewlines -- see parseIf.  A single-line suite leaves its trailing
	NEWLINE unconsumed, so ``for i in x: pass'' followed by ``else:'' never
	matched here."
	((self atKeywordSkippingNewlines: 'else') and: [self matchKeyword: 'else']) ifTrue: [
		self ___expectColon___: '''else'' statement' header: self lastToken forced: true.
		orelse := self parseBlock.
	].
	^WhileAst new
		test: test;
		body: (self wrapSuite: body);
		orelse: (self wrapSuite: orelse);
		from: tok to: self lastSpanToken ; yourself

]

{ #category : 'Grail-parsing - compound statements' }
PythonParser >> parseWith [
	"Parse: with expr [as target], ...: body -- also handles the PEP 617
	parenthesized form: with (expr [as target], ...): body."

	| tok items body |
	tok := self advance. "consume 'with'"
	"Flag the enclosing scope as ``return-blocking'' — WithAst's
	codegen emits the context manager's __exit__ call AFTER the
	body, which is the post-body cleanup that ``^''-style returns
	can't coexist with.  FunctionDefAst reads this off the body's
	BlockAst to choose PythonReturn-exception return codegen."
	self markScopeReturnBlocking.
	items := (self atOp: '(') ifTrue: [self tryParseParenthesizedWithItems] ifFalse: [nil].
	items ifNil: [
		items := Array new.
		items add: self parseWithItem.
		[self matchOp: ','] whileTrue: [
			items add: self parseWithItem.
		].
	].
	self ___expectColon___: '''with'' statement' header: tok forced: false.
	body := self parseBlock.
	^WithAst new
		items: items;
		body: (self wrapSuite: body);
		type_comment: nil;
		from: tok to: self lastSpanToken ; yourself

]

{ #category : 'Grail-parsing - compound statements' }
PythonParser >> parseWithItem [
	"Parse: expr ['as' target]"

	| expr optVars startTok |
	startTok := self peek.
	expr := self parseExpression.
	optVars := nil.
	(self matchKeyword: 'as') ifTrue: [
		optVars := self parsePrimary.
		self setStoreCtx: optVars.
	].
	^WithItemAst new
		context_expr: expr;
		optional_vars: optVars;
		from: startTok to: self lastToken ; yourself

]

{ #category : 'Grail-parsing - yield' }
PythonParser >> parseYieldExpression [
	"Parse: yield [from expr] | yield [expr_list]"

	| tok value aTok |
	tok := self advance. "consume 'yield'"
	(self matchKeyword: 'from') ifTrue: [
		value := self parseExpression.
		^YieldFromAst new
			value: value;
			from: tok to: self lastToken ; yourself
	].
	value := nil.
	((aTok := self peek) notNil and: [aTok isNewline not and: [aTok isEndMarker not and: [(aTok isOp:')') not 
        and: [(aTok isOp: ']') not and: [(aTok isOp: '=') not and: [(aTok isOp: ';') not]]]]]]) ifTrue: [
		value := self parseStarExpressions.
	].
	^YieldAst new
		value: value;
		from: tok to: self lastToken ; yourself

]

{ #category : 'Grail-parsing - simple statements' }
PythonParser >> parseYieldStatement [
	"Parse yield as a statement (wraps in ExprAst)."

	| tok expr |
	tok := self peek.
	expr := self parseYieldExpression.
	(self atOp: '=') ifTrue: [
		^ self ___syntaxError___: 'assignment to yield expression not possible' node: expr].
	^ExprAst new
		value: expr;
		from: tok to: self lastToken ; yourself

]

{ #category : 'Grail-token access' }
PythonParser >> peek [
	"Return the current token without consuming it."

	position > tokens size ifTrue: [^nil].
	^tokens at: position

]

{ #category : 'Grail-parsing - expressions' }
PythonParser >> peekComparisonOp [
	"Return a comparison operator class if one is at the current position, else nil."

	| tok |
	tok := self peek.
	tok ifNil: [^nil].
	(tok isOp: '==') ifTrue: [^EqAst].
	(tok isOp: '!=') ifTrue: [^NotEqAst].
	(tok isOp: '<') ifTrue: [^LtAst].
	(tok isOp: '<=') ifTrue: [^LtEAst].
	(tok isOp: '>') ifTrue: [^GtAst].
	(tok isOp: '>=') ifTrue: [^GtEAst].
	(tok isKeyword: 'in') ifTrue: [^InAst].
	(tok isKeyword: 'is') ifTrue: [
		"Check for 'is not'"
		| next |
		next := position + 1 <= tokens size ifTrue: [tokens at: position + 1] ifFalse: [nil].
		(next notNil and: [next isKeyword: 'not']) ifTrue: [^IsNotAst].
		^IsAst
	].
	(tok isKeyword: 'not') ifTrue: [
		"Check for 'not in'"
		| next |
		next := position + 1 <= tokens size ifTrue: [tokens at: position + 1] ifFalse: [nil].
		(next notNil and: [next isKeyword: 'in']) ifTrue: [^NotInAst].
		^nil
	].
	^nil

]

{ #category : 'Grail-token access' }
PythonParser >> peekType [
	"Return the type of the current token."

	| tok |
	tok := self peek.
	tok ifNil: [^nil].
	^tok type

]

{ #category : 'Grail-token access' }
PythonParser >> peekValue [
	"Return the value of the current token."

	| tok |
	tok := self peek.
	tok ifNil: [^nil].
	^tok value

]

{ #category : 'Grail-Scope' }
PythonParser >> popScope [
	"Pop the current variable, write, and return-blocking scopes in
	lockstep and return them as a 3-element Array
	{variables. writes. hasReturnBlocking.}.  Callers that only care
	about the variable set can ``first'' the result; callers that
	build a BlockAst pass all three onto the node so codegen can
	read body writes and the return-blocking flag directly.

	The parallel nonlocal-names scope is popped at the same time;
	its names are removed from the returned variable and write sets
	so the enclosing FunctionDefAst codegen doesn't declare them as
	Smalltalk temps for this block — letting writes propagate to
	the outer scope's closure-captured location instead of binding
	a fresh shadow."

	| vars writes blocking nonlocals globals reads |
	vars := variableStack removeLast.
	writes := writeStack removeLast.
	blocking := blockingStack removeLast.
	nonlocals := nonlocalStack removeLast.
	globals := globalStack removeLast.
	reads := readStack removeLast.
	paramStack removeLast.
	annotatedStack removeLast.
	compTargetStack removeLast.
	"NOT propagated to the enclosing scope -- that is the whole point."
	ownReadStack removeLast.
	nonlocals do: [:n |
		"...with ONE exception: ``__class__''.

		Every other nonlocal has an enclosing binding to propagate to, because
		a nonlocal without one is a SyntaxError in CPython.  ``__class__'' is
		the name the language exempts: a class body provides it to its methods
		as an implicit closure cell.  Nothing on the Smalltalk side declares
		it, so stripping it leaves the assignment with an undeclared target --
		which does not compile, so the whole method is replaced by a raising
		stub (Class.gs's CompileError fallback) and every call reports a
		codegen gap.  test_super's TestSuper.tearDown is exactly that --

		    def tearDown(self):
		        nonlocal __class__
		        __class__ = TestSuper

		-- and because tearDown runs after EVERY test in the class, the stub
		turned one uncompilable method into an error on nine of them.

		Keeping the name local declares the Smalltalk temp, so the method
		compiles and the assignment is readable within it.  Grail resolves
		``__class__'' lexically rather than through a rebindable cell (see
		CallAst's zero-arg ``super()'' codegen), so the write does not
		propagate to the class's other methods as CPython's would -- which
		also means the damage that this tearDown exists to repair cannot
		happen here.

		Testing the NAME rather than ``does any enclosing scope bind it'' is
		deliberate: the scopes are built as the parse walks, so at popScope
		time an enclosing binding that appears LATER in the source has not
		been recorded yet.  ``nonlocal ret'' in a function defined above
		``ret = None'' is legal Python and common --

		    def gen():
		        nonlocal ret
		        ret = yield from MyIter()
		    ret = None

		-- and a binding test would wrongly keep ``ret'' local there, leaving
		the outer name unwritten (test_yield_from) or unbound
		(functools' lru_cache counters, an UnboundLocalError).  The name test
		has no such ordering hazard."
		n == #'__class__' ifFalse: [
			vars remove: n ifAbsent: [].
			writes remove: n ifAbsent: []].
	].
	"``global x'' names are likewise stripped from this scope's local
	sets so an inner ``x = expr'' doesn't declare a fresh Smalltalk
	temp.  parseGlobal additionally registered each name in the module
	scope (variableStack first), so NameAst codegen resolves it through
	the module instance's dynamicInstVarAt: storage instead."
	globals do: [:n |
		vars remove: n ifAbsent: [].
		writes remove: n ifAbsent: [].
	].
	"The globals set itself is returned so scope builders can record it
	on the BlockAst (globalNames) -- codegen needs per-scope global
	declarations to route reads/stores of those names to the module
	even past enclosing-function shadows."

	"FREE-NAME PROPAGATION.  Every name this scope MENTIONS but does not
	BIND is a candidate free variable of the enclosing scope too -- Python's
	rule is that a name referenced by a nested function is free in every
	scope between the reference and the binding, which is why the cell has
	to be threaded through the intermediate function at all.  Propagating
	on the way out gives each scope the transitive read set with one pass
	and no separate symtable walk.
	Consumed by CallAst >> printFunctionLocalsSnapshotOn:, which intersects
	it with the enclosing function scopes' bound names to decide which free
	variables ``locals()'' must report (CPython includes them; Grail listed
	only the scope's own locals)."
	readStack isEmpty ifFalse: [
		reads do: [:n |
			(vars includes: n) ifFalse: [readStack last add: n]]].
	"The nonlocal set is returned too, for the same reason the globals set is:
	stripping the names from this scope's locals is not enough on its own,
	because codegen has to be able to tell a ``nonlocal'' name APART from a
	name that was simply never bound here.  A class body is where the
	difference shows -- ClassDefAst must emit ``nonlocal x; x += 1'' as a write
	to the enclosing binding rather than treating it as a class attribute or,
	as it did before, dropping the statement entirely."
	"Brace array, not ``Array with:...'': the with: family stops at five
	arguments, and this scope tuple now carries six."
	^ { vars. writes. blocking. globals. reads. nonlocals }

]

{ #category : 'Grail-node construction' }
PythonParser >> pushScope [
	"Push a new variable scope (and the parallel write,
	return-blocking, and nonlocal-name scopes)."

	variableStack add: IdentitySet new.
	writeStack add: IdentitySet new.
	blockingStack add: false.
	nonlocalStack add: IdentitySet new.
	globalStack add: IdentitySet new.
	readStack add: IdentitySet new.
	"Two sets kept SEPARATE from variables/writes because ``global'' has
	to tell four situations apart that those two conflate.  A PARAMETER
	registers via declareVariable:, which is also used for unrelated
	scope hints (f-string name propagation), so ``in variables but not in
	writes'' would misidentify them.  An ANNOTATION without a value
	(``x: int'') binds nothing, so it is not a write at all -- yet it
	still makes a later ``global x'' an error, with its own message."
	paramStack add: IdentitySet new.
	annotatedStack add: IdentitySet new.
	compTargetStack add: IdentitySet new.
	"Reads made by THIS scope's own statements.  Deliberately NOT the same
	as readStack, which popScope grows by FREE-NAME PROPAGATION: every
	name an inner scope mentions without binding is added to the enclosing
	scope's readStack so closures and locals() work.  That makes readStack
	the TRANSITIVE read set, and using it to answer ``was this name used
	before the global declaration?'' reports reads that happened inside a
	nested def -- a different scope, and legal.

	A BAG, one occurrence per mention, because a store target is parsed as a
	load and counted here before setStoreCtx: retargets it; the retarget
	takes its occurrence back (___retractTargetRead___:), so what is left is
	CPython's USE -- loads only (Python/symtable.c, Name_kind).  ``x = 2;
	global x'' is therefore ``assigned to before'', not ``used prior''."
	ownReadStack add: IdentityBag new.

]

{ #category : 'Grail-node construction' }
PythonParser >> setDelCtx: anExpr [
	"Change an expression's context to Del.

	A BARE-NAME target (``del x'', as opposed to ``del obj.attr'' or
	``del d[k]'') is registered as a write of the current scope.  ``del''
	is a binding-affecting operation on x -- Python lists a del target as
	bound in the block for exactly this reason -- and two things downstream
	depend on it:

	  * FunctionDefAst >> paramNeedsTemp:assigned:instVars: consults
	    ``writes'' to decide whether a parameter needs a transport temp.
	    Without this, ``def f(a): del a'' emitted ``a := nil'' against the
	    Smalltalk METHOD ARGUMENT, which is not assignable -- CompileError
	    1029, ``expected an assignable variable'', failing the whole module
	    build.  Registering the del gives the parameter a temp, exactly as
	    a rebinding ``a = ...'' already does.
	  * The name needs a Smalltalk temp declaration for the ``x := nil''
	    that DeleteAst emits for a function-local del.

	The unbound-local guard analysis does NOT read this set -- being in
	``writes'' cannot distinguish a del from an ordinary rebind, and a
	rebound parameter stays bound.  It walks for DeleteAst nodes instead;
	see FunctionDefAst >> deletedNamesInSubtree."

	| varNames index |
	(anExpr isKindOf: NameAst) ifTrue: [
		self ___retractTargetRead___: anExpr.
		self declareWrite: anExpr id asSymbol].
	varNames := anExpr class allInstVarNames.
	index := varNames indexOf: #ctx.
	index > 0 ifTrue: [anExpr instVarAt: index put: self delCtx].
	"``del (a, [b, c])'' deletes every element, so each is a Del target in
	its own right -- CPython's tree marks them Del too."
	((anExpr isKindOf: TupleAst) or: [anExpr isKindOf: ListAst]) ifTrue: [
		anExpr elts do: [:each | self setDelCtx: each]].
	^anExpr

]

{ #category : 'Grail-node construction' }
PythonParser >> setStoreCtx: anExpr [
	"Change an expression's context to Store (for assignment targets).
	Also registers variable names with the current scope."

	| varNames index illegal |
	"Reject a target that can never be assigned to (a comprehension /
	generator expression) with CPython's ``cannot assign'' SyntaxError.  Applies
	to every store context -- assignment, for-target, with-as -- since none of
	them permit a comprehension target.  The env-0 parser can set only
	messageText; builtins>>_compile: re-raises with that text through the env-1
	___signal___: so the Python str(e) carries it (test_illegal_assignment's
	assertRaisesRegex)."
	illegal := self ___invalidTarget___: anExpr kind: #star.
	illegal ifNotNil: [
		^ self ___syntaxError___: 'cannot assign to ' , (self ___exprName___: illegal)
			node: illegal].
	varNames := anExpr class allInstVarNames.
	index := varNames indexOf: #ctx.
	index > 0 ifTrue: [anExpr instVarAt: index put: self storeCtx].
	"Register variable name as a write — this NameAst is in store
	context (assignment target, for-loop target, augmented-assign
	target, walrus, except-as, with-as, ...)."
	(anExpr isKindOf: NameAst) ifTrue: [
		self ___retractTargetRead___: anExpr.
		self declareWrite: anExpr id.
	].
	"Recurse into tuples and lists (use instVarAt for elts)"
	((anExpr isKindOf: TupleAst) or: [anExpr isKindOf: ListAst]) ifTrue: [
		| eltsIndex |
		eltsIndex := varNames indexOf: #elts.
		eltsIndex > 0 ifTrue: [
			(anExpr instVarAt: eltsIndex) do: [:each | self setStoreCtx: each].
		].
	].
	(anExpr isKindOf: StarredAst) ifTrue: [
		| valueIndex |
		valueIndex := varNames indexOf: #value.
		valueIndex > 0 ifTrue: [
			self setStoreCtx: (anExpr instVarAt: valueIndex).
		].
	].
	^anExpr

]

{ #category : 'Grail-token access' }
PythonParser >> skipNewlines [
	"Skip any NEWLINE and NL tokens."
  | aTok |
	[(aTok := self peek) notNil and: [ aTok isNewline]] whileTrue: [
		self advance.
	].

]

{ #category : 'Grail-token access' }
PythonParser >> skipTypeParams [
	"PEP 695 type-parameter list after a def/class name --
	``def f[T](...)'' / ``class C[T: bound]:'' / ``def g[*Ts, **P]()''.
	Consumes the balanced bracket group and ANSWERS the parameter names.

	It used to discard them, reasoning that ``the parameter names only appear in
	annotations, which Grail never evaluates''.  Annotations are evaluated now
	(PEP 649), and the names are observable in their own right:
	``f.__type_params__'' is one of functools.WRAPPER_ASSIGNMENTS, and
	test_functools unpacks it (``T, = f.__type_params__'').

	Only the NAME of each parameter is kept, with its KIND as a prefix: ``*Ts''
	for a TypeVarTuple, ``**P'' for a ParamSpec, a bare name for a TypeVar.  The
	kind decides which typing class __type_params__ builds, and it is visible:
	``tuple[*Ts]'' iterates a TypeVarTuple, ``Callable[P, str]'' needs a
	ParamSpec.  A bound or constraint (``[T: int]'', ``[T: (int, str)]'') is
	consumed and dropped -- Grail models a type parameter as an opaque
	placeholder, so its constraints have nothing to act on.  A consumer that
	wants the bare name strips the stars (ExecBlock >> ___pyTypeVarNamed___:)."

	| depth tok names expectName stars boundToks inBound sawAsync sawFor |
	names := OrderedCollection new.
	tok := self peek.
	(tok notNil and: [tok isOp: '[']) ifFalse: [^ names asArray].
	self ___checkTypeParamsAt___: position.
	depth := 0.
	expectName := false.
	stars := ''.
	boundToks := nil.
	inBound := false.
	sawAsync := false.
	sawFor := false.
	[
		tok := self advance.
		"A bound or default is DROPPED here, so it never reaches
		ModuleAst >> ___validateAsyncPlacement___:scope:.  It runs in a type-
		parameter scope, which is never async, so any await / async for in it
		is CPython's SyntaxError (``def f[T=[await x for x in y]](): pass'')."
		((tok isKeyword: 'await') or: [tok isKeyword: 'async']) ifTrue: [sawAsync := true].
		(tok isKeyword: 'for') ifTrue: [sawFor := true].
		"ONE depth for every bracket kind.  It counted only [ and ], so the comma
		inside a constraint tuple -- ``[U: (int, bytes)]'' -- read as the next
		parameter and ``bytes'' became a type parameter of its own."
		((tok isOp: ']') or: [(tok isOp: ')') or: [tok isOp: '}']])
			ifTrue: [depth := depth - 1].
		"A bound or constraint: every token after the colon, up to the comma or
		bracket that ends the parameter (or a PEP 696 ``= default'', which is
		skipped)."
		(inBound and: [depth >= 1 and: [((depth = 1) and: [(tok isOp: ',') or: [tok isOp: '=']]) not]])
			ifTrue: [boundToks add: tok].
		((depth = 1 and: [(tok isOp: ',') or: [tok isOp: '=']]) or: [depth = 0]) ifTrue: [
			inBound ifTrue: [self ___recordTypeParamBound___: boundToks in: names].
			inBound := false].
		((tok isOp: '[') or: [(tok isOp: '(') or: [tok isOp: '{']]) ifTrue: [
			depth := depth + 1.
			(depth = 1 and: [tok isOp: '[']) ifTrue: [expectName := true. stars := '']].
		"At depth 1 a comma starts the next parameter; the first identifier after
		that (or after the opening bracket) is its name."
		(depth = 1 and: [tok isOp: ',']) ifTrue: [expectName := true. stars := ''].
		(depth = 1 and: [expectName and: [tok isOp: '*']]) ifTrue: [stars := '*'].
		(depth = 1 and: [expectName and: [tok isOp: '**']]) ifTrue: [stars := '**'].
		(depth = 1 and: [expectName and: [tok type == #NAME]]) ifTrue: [
			names add: stars , tok value asString.
			expectName := false].
		(depth = 1 and: [expectName not and: [inBound not and: [tok isOp: ':']]]) ifTrue: [
			inBound := true.
			boundToks := OrderedCollection new].
		depth = 0
	] whileFalse.
	sawAsync ifTrue: [
		^ SyntaxError signal: (sawFor
			ifTrue: ['asynchronous comprehension outside of an asynchronous function']
			ifFalse: ['await expression cannot be used within a TypeVar bound'])].
	^ names asArray

]

{ #category : 'Grail-initialization' }
PythonParser >> source: aString [
	"Universal newlines, as the tokenizer reads them: its tokens' positions
	count the translated text, so the errors located with them have to be
	located in it too.  Kept raw, every error after a CRLF was one column early
	per CR before it -- ``x=1\r\ny=1 +'' at column 5 -- and after a lone CR on
	the wrong line."

	| tokenizer |
	source := PythonTokenizer translateNewlines: aString.
	tokenizer := PythonTokenizer on: source.
	"An error the TOKENIZER raises comes after any TabError it noted, which is
	on an earlier line, so CPython's lexer would have stopped at the TabError."
	tokens := [tokenizer tokenize]
		on: SyntaxError
		do: [:ex |
			tabErrorPosition := tokenizer tabErrorPosition.
			((ex isKindOf: TabError) not and: [tabErrorPosition notNil])
				ifTrue: [self ___signalPendingTabError___].
			ex pass].
	tabErrorPosition := tokenizer tabErrorPosition.
	position := 1.
	walrusAllowed := false.
	inWalrusValue := false.
	walrusRefusal := nil.
	variableStack := Array new.
	variableStack add: IdentitySet new.
	writeStack := Array new.
	writeStack add: IdentitySet new.
	blockingStack := Array new.
	blockingStack add: false.
	nonlocalStack := Array new.
	nonlocalStack add: IdentitySet new.
	globalStack := Array new.
	globalStack add: IdentitySet new.
	readStack := Array new.
	readStack add: IdentitySet new.
	paramStack := Array new.
	paramStack add: IdentitySet new.
	compTargetStack := Array new.
	compTargetStack add: IdentitySet new.
	ownReadStack := Array new.
	ownReadStack add: IdentityBag new.
	annotatedStack := Array new.
	annotatedStack add: IdentitySet new.
	classNesting := 0.
	mangleClassStack := OrderedCollection new.
	inCompTarget := false.
	futureImports := OrderedCollection new.
	expressionHead := 1 to: 0.
	openExpressions := OrderedCollection new.
	specFieldStarts := IdentityKeyValueDictionary new.

]

{ #category : 'Grail-node construction' }
PythonParser >> storeCtx [

	^StoreAst basicNew

]

{ #category : 'Grail-parsing - compound statements' }
PythonParser >> tryParseParenthesizedWithItems [
	"Tentatively parse the PEP 617 parenthesized with-items list --
	'(' with_item (',' with_item)* ','? ')' -- called only when the
	next token is '('.  On success returns the parsed Array of
	WithItemAst; on failure restores the token position and returns
	nil so the caller falls back to treating the parenthesized group
	as an ordinary single with-item's context expression (a grouped
	expression, tuple, or generator expression -- e.g. ``with (a + b):''
	or ``with (x for x in y):'').  This mirrors CPython's PEG grammar,
	which tries the parenthesized-items alternative first and backtracks
	to the plain form on failure -- and matches CPython's (surprising)
	behavior that ``with (a, b):'' means two context managers, not one
	tuple (verified against CPython 3.14's own ast.parse)."

	| saved items ok |
	saved := position.
	items := Array new.
	ok := true.
	[
		self advance. "consume '('"
		items add: self parseWithItem.
		[self atOp: ','] whileTrue: [
			self advance.
			(self atOp: ')') ifFalse: [items add: self parseWithItem].
		].
		self expect: #OP value: ')'.
	] on: SyntaxError do: [:e | ok := false].
	(ok and: [self atOp: ':']) ifFalse: [position := saved. ^ nil].
	^ items 

]

{ #category : 'Grail-parsing - names' }
PythonParser >> underscoreDefName [
	"The name to compile a ``def _'' / ``class _'' under.

	``_'' is not a valid Smalltalk identifier (it is GemStone's legacy
	assignment token), so every ``_'' is renamed at parse time.  Renaming them
	all to one name silently DISCARDED every ``def _'' but the last: they
	compile to a single selector, so the second definition overwrote the
	first.  Nothing complained, and the lost method simply never ran.

	That is the shape of the standard singledispatch idiom, where each
	registered implementation is spelled ``_'':

	    @t.register(int)
	    def _(self, arg): ...
	    @t.register(str)
	    def _(self, arg): ...

	-- two distinct functions, and with the class-body decorator now applying,
	collapsing them would register BOTH types against whichever body survived.
	So each definition gets its own name.  The first keeps the historical
	``___unused___'' so the common single-def case compiles exactly as before.

	The counter runs over the whole parse rather than per scope: names only
	need to be unique where they collide, and a single counter cannot produce
	a collision anywhere."

	underscoreDefCount := (underscoreDefCount ifNil: [0]) + 1.
	underscoreCurrentName := underscoreDefCount = 1
		ifTrue: [#'___unused___']
		ifFalse: [('___unused' , underscoreDefCount printString , '___') asSymbol].
	^ underscoreCurrentName

]

{ #category : 'Grail-parsing - names' }
PythonParser >> underscoreReadName [
	"What a READ of ``_'' resolves to: the most recent binding of the name,
	which is a numbered def when the last thing to bind ``_'' was a def and
	the base name otherwise (declareWrite: resets it)."

	^ underscoreCurrentName ifNil: [#'___unused___']

]

{ #category : 'Grail-parsing - helpers' }
PythonParser >> wrapSuite: statementsArray [
	"Wrap an array of statements into a SuiteAst."

	^SuiteAst new
		body: statementsArray;
		yourself .

]
