! ------------------- Superclass check
run
Object ifNil: [self error: 'Object is not defined. Check file ordering.'].
%

! ------------------- Class definition for PythonParser
expectvalue /Class
doit
Object subclass: 'PythonParser'
  instVarNames: #( source tokens position variableStack classNesting writeStack paramStack annotatedStack compTargetStack ownReadStack
                    blockingStack nonlocalStack globalStack inCompTarget
                    underscoreDefCount underscoreCurrentName readStack)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonAst
  options: #()

%

expectvalue /Class
doit
PythonParser comment:
'A recursive descent parser for Python source code.

Takes a Python source string and produces an AST (Abstract Syntax Tree)
composed of the existing AST node classes (ModuleAst, ExprAst, BinOpAst, etc.).

Usage:
  PythonParser parse: ''x = 1 + 2''
  => returns a ModuleAst

Hierarchy:
Object
  PythonParser(source tokens position)
'
%

expectvalue /Class
doit
PythonParser category: 'Grail-Parser'
%

! ===============================================================================
! PythonParser - Recursive descent parser for Python source code
! ===============================================================================
! Parses Python source code into an AST (Abstract Syntax Tree) composed of
! the existing AST node classes (ModuleAst, ExprAst, BinOpAst, etc.).
!
! Usage:
!   PythonParser parse: 'x = 1 + 2'
!   => returns a ModuleAst
! ===============================================================================

! ------------------- Remove existing behavior from PythonParser
removeallmethods PythonParser
removeallclassmethods PythonParser

set compile_env: 0

category: 'Grail-parsing'
classmethod: PythonParser
___sourceLocationIn___: aSource at: aPosition
	"{ lineno . offset . lineText } for a 1-based character index into aSource,
	or nil if it cannot be computed.

	CPython's shape, measured rather than assumed: lineno and offset are both
	1-BASED, offset counts from the start of the line against the RAW line
	(leading indentation included), and text is the line WITH its trailing
	newline.  For ``    return x!'' CPython reports offset 13 -- the ``!'' at
	column 13 of the indented line, not column 9 of the stripped one.

	The existing ___signalGlobalSyntaxError___ reported the raw source INDEX as
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
%

category: 'Grail-parsing'
classmethod: PythonParser
___fillSyntaxErrorLocation___: anError source: aSource at: aPosition
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
	report a location: ___signalGlobalSyntaxError___ builds its own, and a
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
%

category: 'Grail-parsing'
method: PythonParser
___currentSourcePosition___
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
%

category: 'Grail-parsing'
classmethod: PythonParser
parse: aString
	"Parse Python source into a ModuleAst.

	The handler is what gives a SyntaxError its location.  ``source:'' TOKENIZES,
	so a tokenizer error is raised inside this same protected block and gets the
	same treatment; both are enriched from wherever the failure was looking.
	``pass'' re-signals the very same exception object, so a Python ``except
	SyntaxError as e'' sees the instance the parser raised, now with its fields
	filled in."

	| parser |
	parser := self basicNew.
	^ [parser source: aString; parseModule]
		on: SyntaxError
		do: [:ex |
			self ___fillSyntaxErrorLocation___: ex
				source: aString
				at: parser ___currentSourcePosition___.
			ex pass]
%

category: 'Grail-parsing'
classmethod: PythonParser
integerFrom: digits radix: radix
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
%

category: 'Grail-token access'
method: PythonParser
advance
	"Consume and return the current token."

	| tok |
	tok := tokens at: position.
	position := position + 1.
	^tok
%

category: 'Grail-token access'
method: PythonParser
atKeyword: aString
	"Check if the current token is the given keyword without consuming."

	| tok |
	tok := self peek.
	^tok notNil and: [tok isKeyword: aString]
%

category: 'Grail-token access'
method: PythonParser
atOp: aString
	"Check if the current token is the given operator without consuming."

	| tok |
	tok := self peek.
	^tok notNil and: [tok isOp: aString]
%

category: 'Grail-node construction'
method: PythonParser
declareVariable: aSymbol
	"Register a name as ``in scope'' here — used for name resolution.
	Adds to the current scope's variable set only.  Use this for
	parameter declarations (the name is bound externally, so it
	shouldn't count as a body write) and for scope-resolution hints
	like names propagated from inner parsers (f-string expressions).

	For genuine body bindings — NameAst store ctx, walrus targets,
	def/class/import names — use declareWrite: instead so the binding
	also lands in the block's write set."

	variableStack last add: aSymbol.
%

category: 'Grail-node construction'
method: PythonParser
declareParameter: aSymbol
	"Register a parameter: in scope exactly as declareVariable: does, and
	additionally in the scope's PARAMETER set.

	The extra set exists for one caller -- ``global x'' has to report
	``name 'x' is parameter and global'' rather than one of the other
	three diagnostics, and declareVariable: alone cannot say which names
	were parameters (it is also used for f-string name propagation)."

	self declareVariable: aSymbol.
	paramStack last add: aSymbol
%

category: 'Grail-node construction'
method: PythonParser
declareWrite: aSymbol
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
	resolution depends on its precision.  They still register in
	variableStack so name-resolution (isVariableIsDeclared:) and the
	enclosing scope's Smalltalk temp declarations keep working; the
	comprehension codegen additionally declares each target as a
	block-local temp of its own emitted block."

	"Any NON-def binding of ``_'' (assignment, for-target, ``with ... as _'',
	import alias) reaches here already renamed to the base ``___unused___''.
	It rebinds the name, so a later read of ``_'' must see it rather than a
	numbered def -- see underscoreDefName."
	aSymbol == #'___unused___' ifTrue: [underscoreCurrentName := #'___unused___'].
	variableStack last add: aSymbol.
	inCompTarget == true ifTrue: [
		"Remember it: a comprehension is its own SCOPE in Python 3, so its
		target neither binds nor reads in the enclosing function -- and
		``global c'' after ``[c for c in ...]'' is therefore legal.  The
		reads emitted inside the comprehension do land in this scope's
		readStack, which without this would report ``used prior to global
		declaration'' for code CPython accepts."
		compTargetStack last add: aSymbol.
		^ self
	].
	writeStack last add: aSymbol.
%

category: 'Grail-node construction'
method: PythonParser
delCtx

	^DelAst basicNew
%

category: 'Grail-token access'
method: PythonParser
expect: aType value: aValue
	"Consume a token matching the given type and value, or signal an error."

	| tok |
	tok := self advance.
	(tok type == aType and: [tok value = aValue]) ifFalse: [
		SyntaxError signal: 'Expected ' , aType , ' ''' , aValue , ''' but got ' , tok type , ' ''' , tok value , ''' at line ' , tok line printString.
	].
	^tok
%

category: 'Grail-token access'
method: PythonParser
expectType: aType
	"Consume a token of the given type, or signal an error."

	| tok |
	tok := self advance.
	tok type == aType ifFalse: [
		SyntaxError signal: 'Expected ' , aType , ' but got ' , tok type , ' ''' , tok value , ''' at line ' , tok line printString.
	].
	^tok
%

category: 'Grail-node construction'
method: PythonParser
lastToken
	"Return the most recently consumed token."

	^tokens at: position - 1
%

category: 'Grail-node construction'
method: PythonParser
loadCtx

	^LoadAst basicNew
%

category: 'Grail-token access'
method: PythonParser
matchKeyword: aString
	"If the current token is the given keyword, consume it and return true."

	| tok |
	tok := self peek.
	(tok notNil and: [tok isKeyword: aString]) ifTrue: [
		self advance.
		^true
	].
	^false
%

category: 'Grail-token access'
method: PythonParser
skipTypeParams
	"PEP 695 type-parameter list after a def/class name --
	``def f[T](...)'' / ``class C[T: bound]:'' / ``def g[*Ts, **P]()''.
	Consumes the balanced bracket group and ANSWERS the parameter names.

	It used to discard them, reasoning that ``the parameter names only appear in
	annotations, which Grail never evaluates''.  Annotations are evaluated now
	(PEP 649), and the names are observable in their own right:
	``f.__type_params__'' is one of functools.WRAPPER_ASSIGNMENTS, and
	test_functools unpacks it (``T, = f.__type_params__'').

	Only the NAME of each parameter is kept.  A bound or constraint
	(``[T: int]'', ``[T: (int, str)]'') is consumed and dropped, as are the
	``*''/``**'' markers of a TypeVarTuple or ParamSpec -- Grail models a type
	parameter as an opaque placeholder, so its constraints have nothing to act
	on."

	| depth tok names expectName |
	names := OrderedCollection new.
	tok := self peek.
	(tok notNil and: [tok isOp: '[']) ifFalse: [^ names asArray].
	depth := 0.
	expectName := false.
	[
		tok := self advance.
		(tok isOp: '[') ifTrue: [
			depth := depth + 1.
			depth = 1 ifTrue: [expectName := true]].
		(tok isOp: ']') ifTrue: [depth := depth - 1].
		"At depth 1 a comma starts the next parameter; the first identifier after
		that (or after the opening bracket) is its name.  Anything else at that
		depth -- a colon and its bound, a star -- is skipped."
		(depth = 1 and: [tok isOp: ',']) ifTrue: [expectName := true].
		(depth = 1 and: [expectName and: [tok type == #NAME]]) ifTrue: [
			names add: tok value asString.
			expectName := false].
		depth = 0
	] whileFalse.
	^ names asArray
%

category: 'Grail-parsing - helpers'
method: PythonParser
matchOp: aString
	"If the current token is the given operator, consume it and return true."

	| tok |
	tok := self peek.
	(tok notNil and: [tok isOp: aString]) ifTrue: [
		self advance.
		^true
	].
	^false
%

category: 'Grail-parsing - helpers'
method: PythonParser
operatorClassFor: opString
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
%

category: 'Grail-parsing - simple statements'
method: PythonParser
parseAssert
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
%

category: 'Grail-parsing - compound statements'
method: PythonParser
parseAsync
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
	SyntaxError signal: 'Expected def, for, or with after async at line ' , tok line printString.
%

category: 'Grail-parsing - expressions'
method: PythonParser
parseAtom
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

	"String literals (may be multiple concatenated).  When any
	adjacent token is an FSTRING, drop into the f-string parser
	which handles mixed STRING+FSTRING runs and emits a concat
	chain."
	(tok isString or: [tok isFString]) ifTrue: [
		"Look ahead: if any token in the adjacent string run is an
		FSTRING, route through parseFStringLiteral; otherwise the
		fast path produces a plain ConstantAst."
		| scan anyF |
		scan := position.
		anyF := false.
		[scan <= tokens size
			and: [(tokens at: scan) isString
				or: [(tokens at: scan) isFString]]] whileTrue: [
			(tokens at: scan) isFString ifTrue: [anyF := true].
			scan := scan + 1.
		].
		anyF ifTrue: [^ self parseFStringLiteral].
		^ self parseStringLiteral
	].

	"Bytes literals"
	tok isBytes ifTrue: [
		^self parseBytesLiteral
	].

	"Ellipsis"
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
		| nameSym |
		self advance.
		nameSym := tok value asSymbol.
		nameSym = #'_' ifTrue: [nameSym := self underscoreReadName].
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

	"Yield expression"
	(tok isKeyword: 'yield') ifTrue: [
		^self parseYieldExpression
	].

	"Await expression"
	(tok isKeyword: 'await') ifTrue: [
		| value |
		self advance.
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
	(tok notNil and: [tok type == #INDENT]) ifTrue: [
		PythonParser ___signalLocated___: IndentationError
			message: 'unexpected indent'
			in: source
			at: (PythonParser ___lineStartPositionIn___: source at: tok position)
			endOffset: -1].
	SyntaxError signal: 'Unexpected token: ' , tok type , ' ''' , tok value , ''' at line ' , tok line printString.
%

category: 'Grail-parsing - expressions'
method: PythonParser
parseBitwiseAnd
	"Parse: shift_expr ('&' shift_expr)*"

	| left startTok |
	startTok := self peek.
	left := self parseShift.
	[self atOp: '&'] whileTrue: [
		| right |
		self advance.
		right := self parseShift.
		left := BinOpAst new
			left: left;
			op: BitAndAst basicNew;
			right: right;
			from: startTok to: self lastToken ; yourself.
	].
	^left
%

category: 'Grail-parsing - expressions'
method: PythonParser
parseBitwiseOr
	"Parse: bitwise_xor ('|' bitwise_xor)*"

	| left startTok |
	startTok := self peek.
	left := self parseBitwiseXor.
	[self atOp: '|'] whileTrue: [
		| right |
		self advance.
		right := self parseBitwiseXor.
		left := BinOpAst new
			left: left;
			op: BitOrAst basicNew;
			right: right;
			from: startTok to: self lastToken ; yourself.
	].
	^left
%

category: 'Grail-parsing - expressions'
method: PythonParser
parseBitwiseXor
	"Parse: bitwise_and ('^' bitwise_and)*"

	| left startTok |
	startTok := self peek.
	left := self parseBitwiseAnd.
	[self atOp: '^'] whileTrue: [
		| right |
		self advance.
		right := self parseBitwiseAnd.
		left := BinOpAst new
			left: left;
			op: BitXorAst basicNew;
			right: right;
			from: startTok to: self lastToken ; yourself.
	].
	^left
%

category: 'Grail-parsing - compound statements'
method: PythonParser
parseBlock
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
	self expectType: #INDENT.
	stmts := self parseStatements.
	self expectType: #DEDENT.
	^stmts
%

category: 'Grail-parsing - simple statements'
method: PythonParser
parseBreak

	| tok |
	tok := self advance. "consume 'break'"
	^BreakAst new token: tok ; yourself
%

category: 'Grail-parsing - atoms'
method: PythonParser
parseBytesLiteral
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
%

category: 'Grail-parsing'
classmethod: PythonParser
___signalLocated___: aClass message: aMessage in: aSource at: aPosition endOffset: anEndOffset
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
%

category: 'Grail-parsing'
classmethod: PythonParser
___lineStartPositionIn___: aSource at: aPosition
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
%

category: 'Grail-parsing'
classmethod: PythonParser
___endOfLinePositionIn___: aSource at: aPosition
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
%

category: 'Grail-parsing'
classmethod: PythonParser
___signalUnclosedBracket___: aChar in: aSource at: aPosition
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
%

category: 'Grail-parsing'
method: PythonParser
___signalSyntaxError___: aMessage from: startTok to: endTok
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
%

category: 'Grail-parsing - arguments'
method: PythonParser
parseCallArgList
	"Parse function call arguments. Returns an Array of {positional. keywords}."

	| args kwargs sawKeyword sawKwargsUnpack kwNames tok |
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
				"**kwargs"
				(self atOp: '**') ifTrue: [
					self advance.
					kwargs add: (KeywordAst new
						arg: nil;
						value: self parseExpression;
						from: self lastToken to: self lastToken ; yourself).
					sawKwargsUnpack := true.
				] ifFalse: [
				"*args"
				(self atOp: '*') ifTrue: [
					"``*x'' fills positional slots, so it may follow a keyword
					(``f(a=1, *b)'' is legal) but NOT ``**'' unpacking."
					sawKwargsUnpack ifTrue: [
						SyntaxError signal: 'iterable argument unpacking follows keyword argument unpacking'].
					self advance.
					args add: (StarredAst new
						value: self parseExpression;
						ctx: self loadCtx;
						from: self lastToken to: self lastToken ; yourself).
				] ifFalse: [
					| expr exprStartTok |
					"Kept so an unparenthesized generator expression can report its
					 own extent -- parseExpression has consumed it by the time the
					 ``for'' is seen."
					exprStartTok := self peek.
					expr := self parseExpression.
					"Check for keyword argument: name=value"
					(self matchOp: '=') ifTrue: [
						| name value |
						name := (expr isKindOf: NameAst) ifTrue: [expr id asString] ifFalse: [nil].
						name ifNotNil: [
							(kwNames includes: name asSymbol) ifTrue: [
								SyntaxError signal: 'keyword argument repeated: ' , name].
							kwNames add: name asSymbol].
						sawKeyword := true.
						value := self parseExpression.
						kwargs add: (KeywordAst new
							arg: name;
							value: value;
							from: self lastToken to: self lastToken ; yourself).
					] ifFalse: [
						"A bare positional argument may not follow a keyword or
						``**'' unpacking."
						sawKwargsUnpack ifTrue: [
							SyntaxError signal: 'positional argument follows keyword argument unpacking'].
						sawKeyword ifTrue: [
							SyntaxError signal: 'positional argument follows keyword argument'].
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
				self matchOp: ','.
				true
			]
		] whileTrue.
	].
	^Array with: args with: kwargs
%

category: 'Grail-parsing - compound statements'
method: PythonParser
parseClassDef
	"Parse: class name[(bases)]: body"

	^self parseClassDefWithDecorators: Array new
%

category: 'Grail-parsing - compound statements'
method: PythonParser
parseClassDefWithDecorators: decorators
	"Parse a class definition with already-parsed decorators."

	| tok nameTok bases keywords body block variables writes blocking scope |
	tok := self advance. "consume 'class'"
	nameTok := self expectType: #NAME.
	"``class _:`` -- same parse-time rename as def _ / NameAst reads."
	nameTok value = '_' ifTrue: [nameTok value: self underscoreDefName asString].
	self declareWrite: nameTok value asSymbol.
	self skipTypeParams.
	bases := Array new.
	keywords := Array new.
	(self matchOp: '(') ifTrue: [
		| result |
		result := self parseCallArgList.
		bases := result first.
		keywords := result last.
		self expect: #OP value: ')'.
	].
	self expect: #OP value: ':'.
	self pushScope.
	classNesting := classNesting + 1.
	body := self parseBlock.
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
	^ClassDefAst new
		name: nameTok value asSymbol;
		bases: bases;
		keywords: keywords;
		body: block;
		decorator_list: decorators;
		type_params: Array new;
		from: tok to: self lastToken ; yourself
%

category: 'Grail-parsing - expressions'
method: PythonParser
parseComparison
	"Parse: bitwise_or (comp_op bitwise_or)*"

	| left startTok ops comparators |
	startTok := self peek.
	left := self parseBitwiseOr.
	ops := Array new.
	comparators := Array new.
	[self peekComparisonOp notNil] whileTrue: [
		| op right |
		op := self parseComparisonOp.
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
%

category: 'Grail-parsing - expressions'
method: PythonParser
parseComparisonOp
	"Parse a comparison operator and return its AST node."

	| tok |
	tok := self peek.
	(tok isOp: '==') ifTrue: [self advance. ^EqAst basicNew].
	(tok isOp: '!=') ifTrue: [self advance. ^NotEqAst basicNew].
	(tok isOp: '<') ifTrue: [self advance. ^LtAst basicNew].
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
%

category: 'Grail-parsing - comprehensions'
method: PythonParser
parseComprehensions
	"Parse one or more 'for target in iter [if cond]*' or
	'async for target in iter [if cond]*' clauses."

	| generators |
	generators := Array new.
	[(self atKeyword: 'for') or: [self atKeyword: 'async']] whileTrue: [
		| forTok target iter ifs isAsync |
		isAsync := 0.
		(self atKeyword: 'async') ifTrue: [
			self advance.
			isAsync := 1.
		].
		forTok := self advance. "consume 'for'"
		target := self parseStarTargets.
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
%

category: 'Grail-parsing - expressions'
method: PythonParser
parseConjunction
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
%

category: 'Grail-parsing - simple statements'
method: PythonParser
parseContinue

	| tok |
	tok := self advance. "consume 'continue'"
	^ContinueAst new token: tok ; yourself
%

category: 'Grail-parsing - compound statements'
method: PythonParser
parseDecorated
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
	SyntaxError signal: 'Expected function or class definition after decorator'.
%

category: 'Grail-parsing - compound statements'
method: PythonParser
parseDecorators
	"Parse decorator list: @expr NEWLINE ..."

	| decorators |
	decorators := Array new.
	[self atOp: '@'] whileTrue: [
		self advance. "consume '@'"
		decorators add: self parseExpression.
		self skipNewlines.
	].
	^decorators
%

category: 'Grail-parsing - compound statements'
method: PythonParser
___declarativeDecoratorSymbolFor: aDecoratorNode
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
%

category: 'Grail-parsing - simple statements'
method: PythonParser
parseDelete
	"Parse: del target_list"

	| tok targets |
	tok := self advance. "consume 'del'"
	targets := Array new.
	targets add: (self setDelCtx: self parsePrimary).
	[self matchOp: ','] whileTrue: [ | aTok |
		((aTok := self peek) notNil and: [ aTok isNewline not]) ifTrue: [
			targets add: (self setDelCtx: self parsePrimary).
		].
	].
	^DeleteAst new
		targets: targets;
		from: tok to: self lastToken ; yourself
%

category: 'Grail-parsing - atoms'
method: PythonParser
parseDictDisplayFromStar: startTok
	"Parse dict display starting with **unpack."

	| keys values |
	keys := Array new.
	values := Array new.
	self advance. "consume '**'"
	keys add: nil.
	values add: self parseExpression.
	[self matchOp: ','] whileTrue: [
		(self atOp: '}') ifFalse: [
			(self atOp: '**') ifTrue: [
				self advance.
				keys add: nil.
				values add: self parseExpression.
			] ifFalse: [
				keys add: self parseExpression.
				self expect: #OP value: ':'.
				values add: self parseExpression.
			].
		].
	].
	self expect: #OP value: '}'.
	^DictAst new
		keys: keys;
		values: values;
		from: startTok to: self lastToken ; yourself
%

category: 'Grail-parsing - atoms'
method: PythonParser
parseDictOrSetDisplay
	"Parse dict/set display: {k:v, ...}, {expr, ...}, {k:v for ...}, {expr for ...}"

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

	"Dict: key : value"
	(self matchOp: ':') ifTrue: [
		| value keys values |

		value := self parseExpression.

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
					values add: self parseExpression.
				] ifFalse: [
					keys add: self parseExpression.
					self expect: #OP value: ':'.
					values add: self parseExpression.
				].
			].
		].
		self expect: #OP value: '}'.
		^DictAst new
			keys: keys;
			values: values;
			from: startTok to: self lastToken ; yourself
	].

	"Set comprehension — ``for`` or ``async for`` opens the clause"
	((self atKeyword: 'for') or: [self atKeyword: 'async']) ifTrue: [
		| generators |
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
		].
	].
	self expect: #OP value: '}'.
	^SetAst new
		elts: elts;
		from: startTok to: self lastToken ; yourself
%

category: 'Grail-parsing - expressions'
method: PythonParser
parseDisjunction
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
%

category: 'Grail-parsing - compound statements'
method: PythonParser
parseElif
	"Parse an elif clause as a nested IfAst."

	| tok test body orelse |
	tok := self advance. "consume 'elif'"
	test := self parseExpression.
	self expect: #OP value: ':'.
	body := self parseBlock.
	orelse := Array new.
	(self atKeyword: 'elif') ifTrue: [
		orelse := Array with: self parseElif.
	] ifFalse: [
		(self matchKeyword: 'else') ifTrue: [
			self expect: #OP value: ':'.
			orelse := self parseBlock.
		].
	].
	^IfAst new
		test: test;
		body: (self wrapSuite: body);
		orelse: (self wrapSuite: orelse);
		from: tok to: self lastToken ; yourself
%

category: 'Grail-parsing - expressions'
method: PythonParser
parseExpression
	"Parse an expression (handles ternary if/else, lambda, and walrus :=)."

	| tok startTok expr |
	tok := self peek.
	startTok := tok.
	(tok notNil and: [tok isKeyword: 'lambda']) ifTrue: [
		^self parseLambda
	].
	expr := self parseTernary.
	tok := self peek.
	(tok notNil and: [tok isOp: ':=']) ifTrue: [
		| value |
		self advance.
		value := self parseExpression.
		self setStoreCtx: expr.
		^NamedExprAst new
			target: expr;
			value: value;
			from: startTok to: self lastToken ; yourself
	].
	^expr
%

category: 'Grail-parsing - statements'
method: PythonParser
parseExpressionOrAssignment
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
		value := self parseExpression.
		"CPython: an augmented-assignment target must be a single Name,
		Attribute, or Subscript.  A tuple/list/starred target (``x, b += 3'')
		is a SyntaxError, not an unpacking assignment."
		((expr isKindOf: NameAst)
			or: [(expr isKindOf: AttributeAst)
			or: [expr isKindOf: SubscriptAst]]) ifFalse: [
				SyntaxError signal: 'illegal expression for augmented assignment'].
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
			(self matchOp: '=') ifTrue: [
				value := self parseExpression.
			].
			self setStoreCtx: expr.
			simple := (expr isKindOf: NameAst) ifTrue: [1] ifFalse: [0].
			"Remember the ANNOTATED name: ``x: int'' with no value binds
			nothing, so it never reaches the write set, yet it still makes a
			later ``global x'' an error -- with its own wording."
			(expr isKindOf: NameAst)
				ifTrue: [annotatedStack last add: expr id asSymbol].
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
		targets := Array new.
		self setStoreCtx: expr.
		targets add: expr.
		[self matchOp: '='] whileTrue: [
			| nextExpr aTok |
			nextExpr := self parseStarExpressions.
			"Check if followed by another '=' - if so, this is another target"
			((aTok := self peek) notNil and: [ aTok isOp: '=']) ifTrue: [
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

	"Walrus operator: name := value"
	(tok notNil and: [tok isOp: ':=']) ifTrue: [
		| value |
		self advance.
		value := self parseExpression.
		self setStoreCtx: expr.
		^NamedExprAst new
			target: expr;
			value: value;
			from: startTok to: self lastToken ; yourself
	].

	"Expression statement"
	^ExprAst new
		value: expr;
		from: startTok to: self lastToken ; yourself
%

category: 'Grail-parsing - expressions'
method: PythonParser
parseFactor
	"Parse: ('+' | '-' | '~') factor | power"

	| tok |
	tok := self peek.
	(tok notNil and: [tok isOp: '+']) ifTrue: [
		| operand |
		self advance.
		operand := self parseFactor.
		^UAddAst new
			operand: operand;
			from: tok to: self lastToken ; yourself
	].
	(tok notNil and: [tok isOp: '-']) ifTrue: [
		| operand |
		self advance.
		operand := self parseFactor.
		^USubAst new
			operand: operand;
			from: tok to: self lastToken ; yourself
	].
	(tok notNil and: [tok isOp: '~']) ifTrue: [
		| operand |
		self advance.
		operand := self parseFactor.
		^InvertAst new
			operand: operand;
			from: tok to: self lastToken ; yourself
	].
	^self parsePower
%

category: 'Grail-parsing - compound statements'
method: PythonParser
parseFor
	"Parse: for target in iter: body [else: body]"

	| tok target iter body orelse |
	tok := self advance. "consume 'for'"
	target := self parseStarTargets.
	self setStoreCtx: target.
	self expect: #KEYWORD value: 'in'.
	iter := self parseStarExpressions.
	self expect: #OP value: ':'.
	body := self parseBlock.
	orelse := Array new.
	(self matchKeyword: 'else') ifTrue: [
		self expect: #OP value: ':'.
		orelse := self parseBlock.
	].
	^ForAst new
		target: target;
		iter: iter;
		body: (self wrapSuite: body);
		orelse: (self wrapSuite: orelse);
		type_comment: nil;
		from: tok to: self lastToken ; yourself
%

category: 'Grail-parsing - simple statements'
method: PythonParser
parseFromImportName
	"Parse: NAME ['as' NAME]"

	| nameTok asName |
	nameTok := self expectType: #NAME.
	asName := nil.
	(self matchKeyword: 'as') ifTrue: [
		asName := self advance value asSymbol.
		"``as _'' must track NameAst's parse-time rename of ``_'' —
		reads of the alias emit ___unused___, so the binding has to
		land there too (``from django.utils.translation import
		gettext_lazy as _'')."
		asName == #'_' ifTrue: [asName := #'___unused___'].
	].
	^AliasAst new
		name: nameTok value asSymbol;
		asName: asName;
		from: nameTok to: self lastToken ; yourself
%

category: 'Grail-parsing - compound statements'
method: PythonParser
parseFunctionDef
	"Parse: def name(params) [-> type]: body"

	^self parseFunctionDefWithDecorators: Array new
%

category: 'Grail-parsing - compound statements'
method: PythonParser
parseFunctionDefWithDecorators: decorators
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
	self expect: #OP value: '('.
	args := self parseFunctionParametersUntil: ')'.
	self expect: #OP value: ')'.
	returns := nil.
	(self matchOp: '->') ifTrue: [
		returns := self parseExpression.
	].
	self expect: #OP value: ':'.
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
		from: tok to: self lastToken.
	"Convert to appropriate subclass when inside a class"
	classNesting > 0 ifTrue: [
		(decoratorNames includes: #'staticmethod')
			ifTrue: [funcNode changeClassTo: StaticFunctionDefAst]
			ifFalse: [(decoratorNames includes: #'classmethod')
				ifTrue: [funcNode changeClassTo: ClassFunctionDefAst]
				ifFalse: [funcNode changeClassTo: InstanceFunctionDefAst]].
	].
	^funcNode
%

category: 'Grail-parsing - compound statements'
method: PythonParser
___markAsyncFunctionDef: funcNode
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
%

category: 'Grail-parsing - parameters'
method: PythonParser
parseFunctionParametersUntil: endOp
	"Parse function parameters until endOp (')' for def, ':' for lambda).
	Returns an ArgumentsAst."

	| posonlyargs args vararg kwonlyargs kw_defaults kwarg defaults
	  sawSlash sawStar allowAnnotations seenNames aTok |
	posonlyargs := Array new.
	args := Array new.
	vararg := nil.
	kwonlyargs := Array new.
	kw_defaults := Array new.
	kwarg := nil.
	defaults := Array new.
	sawSlash := false.
	sawStar := false.
	allowAnnotations := endOp ~= ':'.

	((aTok := self peek) notNil and: [(aTok isOp: endOp) not]) ifTrue: [
		[
			| tok |
			tok := self peek.
			(tok isOp: endOp) ifTrue: [false] ifFalse: [
				"Check for / (positional-only separator)"
				(tok isOp: '/') ifTrue: [
					self advance.
					posonlyargs := args.
					args := Array new.
					"Move defaults to posonlyargs"
					sawSlash := true.
					self matchOp: ','.
				] ifFalse: [
				"Check for * (keyword-only separator or *args)"
				(tok isOp: '*') ifTrue: [
					self advance.
					sawStar := true.
					"If followed by name, it's *args"
					(self peek notNil and: [self peekType == #NAME]) ifTrue: [
						| argNode |
						argNode := self parseSingleParamWithAnnotations: allowAnnotations.
						vararg := argNode.
					].
					self matchOp: ','.
				] ifFalse: [
				"Check for **kwargs"
				(tok isOp: '**') ifTrue: [
					self advance.
					kwarg := self parseSingleParamWithAnnotations: allowAnnotations.
					self matchOp: ','.
				] ifFalse: [
					"Regular parameter"
					| param default |
					param := self parseSingleParamWithAnnotations: allowAnnotations.
					default := nil.
					(self matchOp: '=') ifTrue: [
						default := self parseExpression.
					].
					sawStar ifTrue: [
						kwonlyargs add: param.
						kw_defaults add: (default ifNil: [nil]).
					] ifFalse: [
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
		SyntaxError signal: 'named arguments must follow bare *'].
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
				SyntaxError signal:
					'duplicate argument ''' , p name asString , ''' in function definition'].
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
%

category: 'Grail-parsing - simple statements'
method: PythonParser
___checkGlobalDeclarationLegal___: aName at: aToken
	"CPython's symtable rejects ``global x'' when x is already a parameter
	of, bound in, or read in THIS scope -- with four distinct messages.
	Grail accepted all four silently, so code CPython refuses to compile
	ran here with the name quietly meaning something else.

	Only inside a FUNCTION scope: at module level ``global x'' is legal
	and a no-op, and a CLASS body permits it too (``class C: global x''
	rebinds the module's x, which Grail already relies on).  The scope
	depth test is what keeps this from rejecting either."

	| depth |
	depth := variableStack size.
	depth @env0:<= 1 ifTrue: [^ self].
	classNesting @env0:> 0 ifTrue: [^ self].
	((paramStack last) includes: aName) ifTrue: [
		^ self ___signalGlobalSyntaxError___: 'name ''' , aName asString
			, ''' is parameter and global' at: aToken
	].
	((annotatedStack last) includes: aName) ifTrue: [
		^ self ___signalGlobalSyntaxError___: 'annotated name ''' , aName asString
			, ''' can''t be global' at: aToken
	].
	((writeStack last) includes: aName) ifTrue: [
		^ self ___signalGlobalSyntaxError___: 'name ''' , aName asString
			, ''' is assigned to before global declaration' at: aToken
	].
	"ownReadStack, NOT readStack: the latter carries free names propagated
	OUT of nested scopes, so a read inside a nested def counted as a read
	here.  That rejected test_builtin's ``global all, any, tuple'', where
	every use of ``all'' is inside a nested def -- CPython compiles it,
	and a whole module failed to import.

	The check also skips comprehension TARGETS, and only here: a genuine
	assignment puts the name in writeStack, which is tested above, so
	skipping cannot hide a real ``assigned to before''."
	(((ownReadStack last) includes: aName)
		and: [((compTargetStack last) includes: aName) @env0:not]) ifTrue: [
		^ self ___signalGlobalSyntaxError___: 'name ''' , aName asString
			, ''' is used prior to global declaration' at: aToken
	]
%

category: 'Grail-parsing - simple statements'
method: PythonParser
___signalGlobalSyntaxError___: aMessage at: aToken
	"Signal with CPython's message.  The location fields are filled in
	the same shape CPython uses (offset is 1-based on the ``global''
	token's column), so a caller reading e.lineno / e.offset sees the
	global STATEMENT rather than nothing."

	| loc |
	"PythonToken carries ``position'' (an index into the source), not a
	column; a precise column would need a line-start table, so the
	position is reported as-is rather than invented."
	loc := Array @env0:with: '<string>'
		with: (aToken line ifNil: [0])
		with: (aToken position ifNil: [0])
		with: nil.
	"@env1: explicitly -- ___signalNew___:kw: is an env-1 method and this
	file compiles at env 0, so a bare send raises MessageNotUnderstood
	instead of the SyntaxError it was meant to build."
	^ SyntaxError @env1:___signalNew___: (Array @env0:with: aMessage with: (tuple @env0:withAll: loc)) kw: nil
%

category: 'Grail-parsing - simple statements'
method: PythonParser
parseGlobal
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
	names do: [:n | self ___checkGlobalDeclarationLegal___: n at: tok].
	names do: [:n |
		globalStack last add: n.
		variableStack first add: n.
	].
	^GlobalAst new
		names: names;
		from: tok to: self lastToken ; yourself
%

category: 'Grail-parsing - compound statements'
method: PythonParser
parseIf
	"Parse: if test: body [elif test: body]* [else: body]"

	| tok test body orelse |
	tok := self advance. "consume 'if'"
	test := self parseExpression.
	self expect: #OP value: ':'.
	body := self parseBlock.
	orelse := Array new.
	(self atKeyword: 'elif') ifTrue: [
		orelse := Array with: self parseElif.
	] ifFalse: [
		(self matchKeyword: 'else') ifTrue: [
			self expect: #OP value: ':'.
			orelse := self parseBlock.
		].
	].
	^IfAst new
		test: test;
		body: (self wrapSuite: body);
		orelse: (self wrapSuite: orelse);
		from: tok to: self lastToken ; yourself
%

category: 'Grail-parsing - simple statements'
method: PythonParser
parseImport
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
%

category: 'Grail-parsing - simple statements'
method: PythonParser
parseImportFrom
	"Parse: from [dots] [module] import names"

	| tok level moduleStr names |
	tok := self advance. "consume 'from'"
	level := 0.
	[self matchOp: '.'] whileTrue: [
		level := level + 1.
	].
	"Ellipsis counts as 3 dots"
	[self matchOp: '...'] whileTrue: [
		level := level + 3.
	].
	"Module name (optional if we have dots)"
	moduleStr := nil.
	(self peek notNil and: [self peekType == #NAME]) ifTrue: [
		moduleStr := self advance value.
		[self matchOp: '.'] whileTrue: [
			moduleStr := moduleStr , '.' , self advance value.
		].
	].
	self expect: #KEYWORD value: 'import'.
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
			SyntaxError signal: 'import * only allowed at module level'].
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
	^ImportFromAst new
		module: moduleStr;
		names: names;
		level: level;
		from: tok to: self lastToken ; yourself
%

category: 'Grail-parsing - simple statements'
method: PythonParser
parseImportName
	"Parse: dotted_name ['as' NAME]"

	| nameTok nameStr asName |
	nameTok := self expectType: #NAME.
	nameStr := nameTok value.
	[self matchOp: '.'] whileTrue: [
		nameStr := nameStr , '.' , self advance value.
	].
	asName := nil.
	(self matchKeyword: 'as') ifTrue: [
		asName := self advance value asSymbol.
		asName == #'_' ifTrue: [asName := #'___unused___'].
	].
	^AliasAst new
		name: nameStr asSymbol;
		asName: asName;
		from: nameTok to: self lastToken ; yourself
%

category: 'Grail-parsing - expressions'
method: PythonParser
parseInversion
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
%

category: 'Grail-parsing - lambda'
method: PythonParser
parseLambda
	"Parse: lambda [params]: expr.

	Pushes a fresh scope so the lambda's parameters resolve as
	locals inside the body — without this, ``lambda p: p[0]`` would
	emit a module symbol-lookup for ``p`` (NameAst treats undeclared
	names as free / global), trip the NameError fallback at call
	time, and report ``name 'p' is not defined``."

	| tok args body |
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
	body := self parseExpression.
	self popScope.
	^LambdaAst new
		args: args;
		body: body;
		from: tok to: self lastToken ; yourself
%

category: 'Grail-parsing - atoms'
method: PythonParser
parseListDisplay
	"Parse list display: [expr, ...] or [expr for ...]"

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

	"List comprehension — either ``for`` or ``async for`` opens the clause"
	((self atKeyword: 'for') or: [self atKeyword: 'async']) ifTrue: [
		| generators |
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
		].
	].
	self expect: #OP value: ']'.
	^ListAst new
		elts: elts;
		ctx: self loadCtx;
		from: startTok to: self lastToken ; yourself
%
category: 'Grail-parsing - module'
method: PythonParser
parseModule
	"Parse a complete module. Returns a ModuleAst."

	| body block module variables writes blocking scope |
	self skipNewlines.
	body := self parseStatements.
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
%

category: 'Grail-parsing - simple statements'
method: PythonParser
parseNonlocal
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
	names do: [:n | nonlocalStack last add: n].
	^NonlocalAst new
		names: names;
		from: tok to: self lastToken ; yourself
%

category: 'Grail-parsing - atoms'
method: PythonParser
parseNumberValue: aString
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
%

category: 'Grail-parsing - atoms'
method: PythonParser
parseParenExpr
	"Parse parenthesized expression, tuple, or generator."

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

	expr := self parseStarExpression.

	"Check for comprehension (generator expression) — ``for`` or ``async for`` opens the clause"
	((self atKeyword: 'for') or: [self atKeyword: 'async']) ifTrue: [
		| generators |
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
			[self matchOp: ','] whileTrue: [
				(self atOp: ')') ifFalse: [
					exprs add: self parseStarExpression.
				].
			].
		].
		self expect: #OP value: ')'.
		^TupleAst new
			elts: exprs;
			ctx: self loadCtx;
			from: startTok to: self lastToken ; yourself
	] ifFalse: [
		"Parenthesized single expression"
		self expect: #OP value: ')'.
		^expr
	].
%

category: 'Grail-parsing - simple statements'
method: PythonParser
parsePass

	| tok |
	tok := self advance. "consume 'pass'"
	^PassAst new token: tok ; yourself
%

category: 'Grail-parsing - expressions'
method: PythonParser
parsePower
	"Parse: primary ['**' factor]"

	| left startTok |
	startTok := self peek.
	left := self parsePrimary.
	(self atOp: '**') ifTrue: [
		| right |
		self advance.
		right := self parseFactor.
		^BinOpAst new
			left: left;
			op: PowAst basicNew;
			right: right;
			from: startTok to: self lastToken ; yourself
	].
	^left
%

category: 'Grail-parsing - expressions'
method: PythonParser
parsePrimary
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
			slice := self parseSubscript.
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
%

category: 'Grail-parsing - simple statements'
method: PythonParser
parseRaise
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
%

category: 'Grail-parsing - simple statements'
method: PythonParser
parseReturn
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
%

category: 'Grail-parsing - expressions'
method: PythonParser
parseShift
	"Parse: sum (('<<' | '>>') sum)*"

	| left startTok aTok |
	startTok := self peek.
	left := self parseSum.
	[(aTok := self peek) notNil and: [(aTok isOp: '<<') or: [ aTok isOp: '>>']]] whileTrue: [
		| opTok opClass right |
		opTok := self advance.
		opClass := opTok value = '<<' ifTrue: [LShiftAst] ifFalse: [RShiftAst].
		right := self parseSum.
		left := BinOpAst new
			left: left;
			op: opClass basicNew;
			right: right;
			from: startTok to: self lastToken ; yourself.
	].
	^left
%

category: 'Grail-parsing - statements'
method: PythonParser
parseSimpleStatement
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
%

category: 'Grail-parsing - statements'
method: PythonParser
parseSimpleStatements
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
%

category: 'Grail-parsing - statements'
method: PythonParser
checkSimpleStatementTerminator: lastStmt
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
		^ SyntaxError signal: 'Missing parentheses in call to ''' , kw
			, '''. Did you mean ' , kw , '(...)?'].
	^ SyntaxError signal: 'invalid syntax'
%

category: 'Grail-parsing - statements'
method: PythonParser
___py2StatementKeywordOf___: aStmt
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
%

category: 'Grail-parsing - parameters'
method: PythonParser
parseSingleParam
	"Parse a single parameter: NAME [: annotation]"

	^self parseSingleParamWithAnnotations: true
%

category: 'Grail-parsing - parameters'
method: PythonParser
parseSingleParamWithAnnotations: allowAnnotations
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
	^ArgAst new
		arg: argName;
		annotation: annotation;
		type_comment: nil;
		from: nameTok to: self lastToken ; yourself
%

category: 'Grail-parsing - subscript'
method: PythonParser
parseSliceOrExpr
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
%

category: 'Grail-parsing - star expressions'
method: PythonParser
parseStarExpression
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
%

category: 'Grail-parsing - star expressions'
method: PythonParser
parseStarExpressions
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
%

category: 'Grail-parsing - star expressions'
method: PythonParser
parseStarTarget
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
%

category: 'Grail-parsing - star expressions'
method: PythonParser
parseStarTargets
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
%

category: 'Grail-parsing - statements'
method: PythonParser
parseStatement
	"Parse a single statement. Returns an array of statements
	(simple_stmts can contain multiple ';'-separated statements)."

	| tok |
	tok := self peek.
	tok ifNil: [^Array new].

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
%

category: 'Grail-parsing - statements'
method: PythonParser
parseStatements
	"Parse a sequence of statements until ENDMARKER or DEDENT."

	| stmts aTok|
	stmts := Array new.
	self skipNewlines.
	[(aTok := self peek) notNil and: [aTok isEndMarker not and: [aTok type ~~ #DEDENT ]]] whileTrue: [
		stmts addAll: self parseStatement.
		self skipNewlines.
	].
	^stmts
%

category: 'Grail-parsing - atoms'
method: PythonParser
parseStringLiteral
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
%

category: 'Grail-node construction'
method: PythonParser
___joinStringParts___: parts
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
%

category: 'Grail-token access'
method: PythonParser
___variableStack___
	"Read access to the parser's variableStack — used by the
	f-string parser to harvest declared variables from a child
	parser back into the outer scope."

	^ variableStack
%

category: 'Grail-parsing - atoms'
method: PythonParser
parseFStringLiteral
	"Parse a sequence of one or more adjacent string-like tokens
	(STRING / FSTRING) and emit a concatenation chain.  Each
	``{expr}`` inside an FSTRING becomes ``str(expr)`` (or
	``repr(expr)`` / ``ascii(expr)`` for ``!r`` / ``!a``); a
	format spec wraps as ``format(value, 'spec')``.  ``{{`` /
	``}}`` escape to literal ``{`` / ``}``.

	Implicit concatenation (``f'a' 'b' f'c'``) is supported by
	walking forward while the token is STRING or FSTRING."

	| startTok tok value parts pos len ch result piece converted
	  innerParser exprAst exprText conversion formatSpec exprStart
	  specBuf inSpec aTok innerSource debugEq |
	startTok := self peek.
	parts := OrderedCollection new.
	[(aTok := self peek) notNil and: [aTok isString or: [aTok isFString]]] whileTrue: [
		tok := self advance.
		value := tok value.
		len := value size.
		tok isFString ifFalse: [
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
				| bracketDepth strQuote exprEnd |
				pos := pos + 1.
				exprStart := pos.
				bracketDepth := 0.
				strQuote := nil.
				conversion := nil.
				formatSpec := nil.
				inSpec := false.
				exprEnd := nil.
				specBuf := WriteStream on: Unicode7 new.
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
							ch == strQuote ifTrue: [strQuote := nil].
							inSpec ifTrue: [specBuf nextPut: ch].
							pos := pos + 1.
						].
					] ifNil: [
						(ch == $' or: [ch == $"]) ifTrue: [
							strQuote := ch.
							inSpec ifTrue: [specBuf nextPut: ch].
							pos := pos + 1.
						] ifFalse: [
							(ch == $( or: [ch == $[ or: [ch == ${]])
								ifTrue: [bracketDepth := bracketDepth + 1].
							(ch == $) or: [ch == $] or: [ch == $}]])
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
									(only at depth 0, after the expression)."
									(ch == $! and: [bracketDepth == 0
										and: [(pos < len) and: [
											| c2 |
											c2 := value at: pos + 1.
											c2 == $r or: [c2 == $s or: [c2 == $a]]]]])
										ifTrue: [
											conversion := value at: pos + 1.
											pos := pos + 2.
									] ifFalse: [
										"Format spec opener: ``:`` at depth 0."
										(ch == $: and: [bracketDepth == 0]) ifTrue: [
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
				"After loop, pos is at the position past ``}``."
				pos := exprEnd ifNil: [pos] ifNotNil: [exprEnd + 1].
				exprText := value copyFrom: exprStart to: (exprEnd ifNil: [pos - 1] ifNotNil: [
					"Trim trailing conversion+spec text from the expression
					if either was present.  Walk back through specBuf and the
					conversion bytes from exprEnd."
					| backCount |
					backCount := specBuf contents size.
					inSpec ifTrue: [backCount := backCount + 1].
					conversion ifNotNil: [backCount := backCount + 2].
					exprEnd - 1 - backCount
				]).
				formatSpec := inSpec ifTrue: [specBuf contents] ifFalse: [nil].
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
				innerSource := exprText asString trimSeparators.
				innerSource isEmpty ifFalse: [
					innerSource := '(' , innerSource , ')'].
				innerParser := PythonParser basicNew source: innerSource.
				exprAst := innerParser parseExpression.
				innerParser ___variableStack___ do: [:innerScope |
					innerScope do: [:varName | self declareVariable: varName]].
				"Apply conversion / format spec."
				converted := self ___wrapFStringExpr: exprAst conversion: conversion formatSpec: formatSpec at: tok.
				parts add: #expr -> converted.
			]
		] ifFalse: [
			ch == $} ifTrue: [
				"``}}`` literal — single ``}`` outside placeholder is a
				syntax error, but we forgive it (Grail not strict)."
				((pos < len) and: [(value at: pos + 1) == $}]) ifTrue: [
					parts add: #literal -> '}'.
					pos := pos + 2.
				] ifFalse: [
					parts add: #literal -> '}' asString.
					pos := pos + 1.
				]
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
	"Empty f-string → empty literal."
	parts isEmpty ifTrue: [
		^ConstantAst new
			value: '';
			kind: nil;
			from: startTok to: self lastToken ; yourself
	].
	"Build a left-folded chain of BinOp(+) over each piece."
	result := self ___fstringPartToAst: parts first from: startTok.
	2 to: parts size do: [:i |
		piece := self ___fstringPartToAst: (parts at: i) from: startTok.
		result := BinOpAst new
			left: result;
			op: (AddAst new from: startTok to: startTok ; yourself);
			right: piece;
			from: startTok to: self lastToken ; yourself.
	].
	^ result
%

category: 'Grail-parsing'
method: PythonParser
___fstringDebugEqualsIn___: text
	"Index of the trailing ``='' that makes a replacement field the
	self-documenting ``f'{expr=}''' form, or 0 when there is none.

	Trailing whitespace may follow it -- ``f'{ a = }''' is legal and keeps
	that spacing in the emitted text.  An ``='' preceded by = ! < > : belongs
	to a comparison or a walrus instead, so f'{a==10}' is an ordinary field."

	| i prev |
	i := text size.
	[i > 0 and: [(text at: i) isSeparator]] whileTrue: [i := i - 1].
	i == 0 ifTrue: [^ 0].
	(text at: i) == $= ifFalse: [^ 0].
	i == 1 ifTrue: [^ i].
	prev := text at: i - 1.
	((prev == $=) or: [(prev == $!) or: [(prev == $<)
		or: [(prev == $>) or: [prev == $:]]]]) ifTrue: [^ 0].
	^ i
%

category: 'Grail-parsing - atoms'
method: PythonParser
___fstringPartToAst: assoc from: startTok
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
%

category: 'Grail-parsing - atoms'
method: PythonParser
___wrapFStringExpr: exprAst conversion: conversionChar formatSpec: formatSpec at: locTok
	"Wrap an f-string placeholder expression in the conversion /
	format pipeline.  ``!r`` → repr(expr), ``!a`` → ascii(expr),
	``!s`` and the default → str(expr).  A non-nil formatSpec wraps
	in format(value, spec_string).  ``locTok`` is a real PythonToken
	(the source f-string token) used for AST location info."

	| inner builtinName callNode |
	builtinName := conversionChar isNil
		ifTrue: ['str']
		ifFalse: [conversionChar == $r
			ifTrue: ['repr']
			ifFalse: [conversionChar == $a
				ifTrue: ['ascii']
				ifFalse: ['str']]].
	"NameAst for the chosen builtin — looked up at runtime via the
	Python dict / module-scope fallback."
	inner := CallAst new
		function: (NameAst new
			id: builtinName asSymbol;
			ctx: self loadCtx;
			from: locTok to: locTok ; yourself);
		arguments: { exprAst };
		keywords: Array new;
		from: locTok to: locTok ; yourself.
	formatSpec ifNil: [^ inner].
	"format(value, spec) wrap.  A spec containing {expr} placeholders
	(``f'{x:0{w}d}''' -- PEP 498 one-level nesting) becomes a runtime
	concatenation instead of a literal (___fstringSpecExprFor:at:);
	vendored fractions.py's __format__ tests build specs this way."
	callNode := CallAst new
		function: (NameAst new
			id: #format;
			ctx: self loadCtx;
			from: locTok to: locTok ; yourself);
		arguments: { exprAst.
			((formatSpec includes: ${)
				ifTrue: [self ___fstringSpecExprFor: formatSpec at: locTok]
				ifFalse: [
					ConstantAst new
						value: formatSpec;
						kind: nil;
						from: locTok to: locTok ; yourself])};
		keywords: Array new;
		from: locTok to: locTok ; yourself.
	^ callNode
%

category: 'Grail-parsing - atoms'
method: PythonParser
___fstringSpecExprFor: spec at: locTok
	"Build an AST expression for a format spec containing {expr}
	placeholders: literal runs stay constants, each placeholder becomes
	str(expr) (parsed by a child parser, its declared names propagated),
	all folded with +."

	| parts pos len ch runStart exprStart depth innerParser exprAst result piece |
	parts := OrderedCollection new.
	pos := 1.
	len := spec size.
	[pos <= len] whileTrue: [
		ch := spec at: pos.
		ch == ${
			ifTrue: [
				exprStart := pos + 1.
				depth := 1.
				pos := pos + 1.
				[pos <= len and: [depth > 0]] whileTrue: [
					ch := spec at: pos.
					ch == ${ ifTrue: [depth := depth + 1].
					ch == $} ifTrue: [depth := depth - 1].
					depth > 0 ifTrue: [pos := pos + 1]].
				innerParser := PythonParser basicNew
					source: (spec copyFrom: exprStart to: pos - 1) asString.
				exprAst := innerParser parseExpression.
				innerParser ___variableStack___ do: [:innerScope |
					innerScope do: [:varName | self declareVariable: varName]].
				parts add: #expr ->
					(self ___wrapFStringExpr: exprAst conversion: nil formatSpec: nil at: locTok).
				pos := pos + 1]
			ifFalse: [
				runStart := pos.
				[pos <= len and: [(spec at: pos) ~= ${]] whileTrue: [pos := pos + 1].
				parts add: #literal -> (spec copyFrom: runStart to: pos - 1)]].
	parts isEmpty ifTrue: [
		^ ConstantAst new
			value: '';
			kind: nil;
			from: locTok to: locTok ; yourself].
	result := self ___fstringPartToAst: parts first from: locTok.
	2 to: parts size do: [:i |
		piece := self ___fstringPartToAst: (parts at: i) from: locTok.
		result := BinOpAst new
			left: result;
			op: (AddAst new from: locTok to: locTok ; yourself);
			right: piece;
			from: locTok to: locTok ; yourself].
	^ result
%

category: 'Grail-parsing - subscript'
method: PythonParser
parseSubscript
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

	^first
%

category: 'Grail-parsing - expressions'
method: PythonParser
parseSum
	"Parse: term (('+' | '-') term)*"

	| left startTok aTok |
	startTok := self peek.
	left := self parseTerm.
	[(aTok := self peek) notNil and: [(aTok isOp: '+') or: [aTok isOp: '-']]] whileTrue: [
		| opTok opClass right |
		opTok := self advance.
		opClass := opTok value = '+' ifTrue: [AddAst] ifFalse: [SubAst].
		right := self parseTerm.
		left := BinOpAst new
			left: left;
			op: opClass basicNew;
			right: right;
			from: startTok to: self lastToken ; yourself.
	].
	^left
%

category: 'Grail-parsing - expressions'
method: PythonParser
parseTerm
	"Parse: factor (('*' | '/' | '//' | '%' | '@') factor)*"

	| left startTok aTok |
	startTok := self peek.
	left := self parseFactor.
	[(aTok := self peek) notNil and: [(aTok isOp: '*') or: [(aTok isOp: '/') or: [(aTok isOp: '//') 
     or: [(aTok isOp: '%') or: [aTok isOp: '@']]]]]] whileTrue: [
		| opTok opClass right |
		opTok := self advance.
		opClass := self operatorClassFor: opTok value.
		right := self parseFactor.
		left := BinOpAst new
			left: left;
			op: opClass basicNew;
			right: right;
			from: startTok to: self lastToken ; yourself.
	].
	^left
%

category: 'Grail-parsing - expressions'
method: PythonParser
parseTernary
	"Parse: expr ['if' condition 'else' expr]"

	| expr startTok |
	startTok := self peek.
	expr := self parseDisjunction.
	(self atKeyword: 'if') ifTrue: [
		| test orelse |
		self advance. "consume 'if'"
		test := self parseDisjunction.
		self expect: #KEYWORD value: 'else'.
		orelse := self parseExpression.
		^IfExpAst new
			test: test;
			body: expr;
			orelse: orelse;
			from: startTok to: self lastToken ; yourself
	].
	^expr
%

category: 'Grail-parsing - compound statements'
method: PythonParser
parseTry
	"Parse: try: body [except [type [as name]]: body]+ [else: body] [finally: body]"

	| tok body handlers orelse finalbody |
	tok := self advance. "consume 'try'"
	self expect: #OP value: ':'.
	body := self parseBlock.
	handlers := Array new.
	orelse := Array new.
	finalbody := Array new.

	"Parse except clauses"
	[self atKeywordSkippingNewlines: 'except'] whileTrue: [
		| exceptTok excType excName exceptBody aTok isStarClause |
		exceptTok := self advance. "consume 'except'"
		"PEP 654 ``except*''.  Consumed HERE, before the type expression:
		left in place it parsed as a STARRED EXPRESSION -- ``except (*T)''
		-- and surfaced at runtime as ``*-unpack in call sites is not yet
		supported'', an error naming neither except nor exception groups."
		isStarClause := self matchOp: '*'.
		excType := nil.
		excName := nil.
		((aTok := self peek) notNil and: [(aTok isOp: ':') not]) ifTrue: [
			excType := self parseExpression.
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
				"Bind the except name into the enclosing scope (module body
				or function), so a module-level ``except X as e'' records e
				as a module variable rather than an undeclared name."
				self declareWrite: excName.
			].
		].
		self expect: #OP value: ':'.
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
			from: exceptTok to: self lastToken ; yourself).
		"CPython rejects mixing the two forms in one try, and so must we:
		the emitted shapes are different, so a mixed try has no meaning to
		fall back on."
		(handlers anySatisfy: [:h | h isStar]) ifTrue: [
			(handlers allSatisfy: [:h | h isStar]) ifFalse: [
				SyntaxError signal: 'cannot have both ''except'' and ''except*'' on the same ''try'''
			].
			"``except*'' must name an exception type -- a bare ``except*:''
			has nothing to split on."
			excType ifNil: [
				SyntaxError signal: 'expected one or more exception types'
			]
		].
	].

	"Parse else clause"
	((self atKeywordSkippingNewlines: 'else') and: [self matchKeyword: 'else']) ifTrue: [
		self expect: #OP value: ':'.
		orelse := self parseBlock.
	].

	"Parse finally clause"
	((self atKeywordSkippingNewlines: 'finally') and: [self matchKeyword: 'finally']) ifTrue: [
		self expect: #OP value: ':'.
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
		from: tok to: self lastToken ; yourself
%

category: 'Grail-parsing - compound statements'
method: PythonParser
parseWhile
	"Parse: while test: body [else: body]"

	| tok test body orelse |
	tok := self advance. "consume 'while'"
	test := self parseExpression.
	self expect: #OP value: ':'.
	body := self parseBlock.
	orelse := Array new.
	(self matchKeyword: 'else') ifTrue: [
		self expect: #OP value: ':'.
		orelse := self parseBlock.
	].
	^WhileAst new
		test: test;
		body: (self wrapSuite: body);
		orelse: (self wrapSuite: orelse);
		from: tok to: self lastToken ; yourself
%

category: 'Grail-parsing - compound statements'
method: PythonParser
parseWith
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
	self expect: #OP value: ':'.
	body := self parseBlock.
	^WithAst new
		items: items;
		body: (self wrapSuite: body);
		type_comment: nil;
		from: tok to: self lastToken ; yourself
%

category: 'Grail-parsing - compound statements'
method: PythonParser
tryParseParenthesizedWithItems
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
%

category: 'Grail-parsing - compound statements'
method: PythonParser
parseWithItem
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
%

category: 'Grail-parsing - yield'
method: PythonParser
parseYieldExpression
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
        and: [(aTok isOp: ']') not]]]]) ifTrue: [
		value := self parseStarExpressions.
	].
	^YieldAst new
		value: value;
		from: tok to: self lastToken ; yourself
%

category: 'Grail-parsing - simple statements'
method: PythonParser
parseYieldStatement
	"Parse yield as a statement (wraps in ExprAst)."

	| tok expr |
	tok := self peek.
	expr := self parseYieldExpression.
	^ExprAst new
		value: expr;
		from: tok to: self lastToken ; yourself
%

category: 'Grail-token access'
method: PythonParser
peek
	"Return the current token without consuming it."

	position > tokens size ifTrue: [^nil].
	^tokens at: position
%

category: 'Grail-parsing - expressions'
method: PythonParser
peekComparisonOp
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
%

category: 'Grail-token access'
method: PythonParser
peekType
	"Return the type of the current token."

	| tok |
	tok := self peek.
	tok ifNil: [^nil].
	^tok type
%

category: 'Grail-token access'
method: PythonParser
peekValue
	"Return the value of the current token."

	| tok |
	tok := self peek.
	tok ifNil: [^nil].
	^tok value
%

category: 'Grail-parsing - names'
method: PythonParser
underscoreDefName
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
%

category: 'Grail-parsing - names'
method: PythonParser
underscoreReadName
	"What a READ of ``_'' resolves to: the most recent binding of the name,
	which is a numbered def when the last thing to bind ``_'' was a def and
	the base name otherwise (declareWrite: resets it)."

	^ underscoreCurrentName ifNil: [#'___unused___']
%


category: 'Grail-Scope'
method: PythonParser
popScope
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
%

category: 'Grail-node construction'
method: PythonParser
pushScope
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
	nested def -- a different scope, and legal."
	ownReadStack add: IdentitySet new.
%

category: 'Grail-node construction'
method: PythonParser
markScopeReturnBlocking
	"Mark the current scope as containing a node whose codegen places
	statements AFTER the inlined body in the same Smalltalk block
	(``with'', ``try-finally'').  When the enclosing function body's
	BlockAst is built, its ``hasReturnBlocking'' is set to true and
	FunctionDefAst falls back to PythonReturn-exception ``return''
	codegen rather than Smalltalk ``^ X.''."

	blockingStack at: blockingStack size put: true.
%

category: 'Grail-node construction'
method: PythonParser
setDelCtx: anExpr
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
	(anExpr isKindOf: NameAst) ifTrue: [self declareWrite: anExpr id asSymbol].
	varNames := anExpr class allInstVarNames.
	index := varNames indexOf: #ctx.
	index > 0 ifTrue: [anExpr instVarAt: index put: self delCtx].
	^anExpr
%

category: 'Grail-node construction'
method: PythonParser
___illegalStoreTargetDesc___: anExpr
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
%

category: 'Grail-node construction'
method: PythonParser
setStoreCtx: anExpr
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
	illegal := self ___illegalStoreTargetDesc___: anExpr.
	illegal ifNotNil: [ SyntaxError signal: 'cannot assign to ' , illegal ].
	varNames := anExpr class allInstVarNames.
	index := varNames indexOf: #ctx.
	index > 0 ifTrue: [anExpr instVarAt: index put: self storeCtx].
	"Register variable name as a write — this NameAst is in store
	context (assignment target, for-loop target, augmented-assign
	target, walrus, except-as, with-as, ...)."
	(anExpr isKindOf: NameAst) ifTrue: [
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
%

category: 'Grail-token access'
method: PythonParser
skipNewlines
	"Skip any NEWLINE and NL tokens."
  | aTok |
	[(aTok := self peek) notNil and: [ aTok isNewline]] whileTrue: [
		self advance.
	].
%

category: 'Grail-parsing - helpers'
method: PythonParser
atKeywordSkippingNewlines: aString
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
%

category: 'Grail-initialization'
method: PythonParser
source: aString

	source := aString.
	tokens := PythonTokenizer tokenize: aString.
	position := 1.
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
	ownReadStack add: IdentitySet new.
	annotatedStack := Array new.
	annotatedStack add: IdentitySet new.
	classNesting := 0.
	inCompTarget := false.
%

category: 'Grail-node construction'
method: PythonParser
storeCtx

	^StoreAst basicNew
%

category: 'Grail-parsing - helpers'
method: PythonParser
wrapSuite: statementsArray
	"Wrap an array of statements into a SuiteAst."

	^SuiteAst new
		body: statementsArray;
		yourself .
%

! ------------------- PEP 572: assignment expressions in comprehensions
!
! Three restrictions CPython enforces at compile time, each with its own
! message.  Grail accepted all of them silently -- 15 of the corpus's 22
! ``SyntaxError not raised'' assertions are here, and accepting invalid Python
! is a wrong answer rather than a missing feature: the code compiles and does
! something.
!
! Run as a TOP-DOWN pass from parseModule rather than at comprehension
! construction, and that ordering is load-bearing.  The parser builds
! bottom-up, so in ``[i for i in [j for j in range(5) if (j := True)]]'' the
! INNER comprehension is finished first and would report its own
! rebind-iteration-variable error.  CPython reports the OUTER one -- the whole
! inner comprehension sits in the outer's iterable expression -- so the check
! has to see the outer node first.  Verified against CPython 3.14 for each
! nested case in test_named_expressions.

category: 'Grail-validation'
method: PythonParser
___validateComprehensions___: node
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
%

category: 'Grail-validation'
method: PythonParser
___comprehensionGeneratorsOf___: node
	"The generators of a comprehension node, or nil if node is not one.  All
	four comprehension forms carry them under the same instVar name."

	((node isKindOf: ListCompAst) or: [(node isKindOf: SetCompAst)
		or: [(node isKindOf: DictCompAst) or: [node isKindOf: GeneratorExpAst]]])
		ifFalse: [^ nil].
	^ node generators
%

category: 'Grail-validation'
method: PythonParser
___comprehensionElementsOf___: node
	"The element expression(s) of a comprehension: a dict comprehension has
	two, the others one."

	(node isKindOf: DictCompAst) ifTrue: [^ { node key. node value }].
	^ { node elt }
%

category: 'Grail-validation'
method: PythonParser
___checkComprehension___: node generators: gens
	"The three PEP 572 restrictions, in the order CPython reports them."

	| boundUpTo boundAfter |
	"Rule 1 -- no assignment expression anywhere in an ITERABLE expression.
	Checked first, and over the whole subtree, so a walrus nested inside a
	lambda or a further comprehension in that position is caught here rather
	than by the inner node's own rules."
	gens do: [:gen |
		(self ___firstNamedExprIn___: gen iter) ifNotNil: [:ne |
			SyntaxError signal:
				'assignment expression cannot be used in a comprehension iterable expression']].

	"Rules 2 and 3 differ only by WHICH for-clause binds the name, so build
	the two name sets once per position.  boundUpTo/boundAfter are computed
	per generator index i: names bound at or before i, and names bound after."
	1 to: gens size do: [:i |
		boundUpTo := Set new.
		boundAfter := Set new.
		1 to: gens size do: [:j |
			self ___collectStoreNamesIn___: (gens at: j) target
				into: (j <= i ifTrue: [boundUpTo] ifFalse: [boundAfter])].
		(gens at: i) ifs do: [:cond |
			self ___checkNamedExprsIn___: cond
				boundUpTo: boundUpTo boundAfter: boundAfter]].

	"The element expression comes last, so EVERY for-clause is 'earlier' for
	it -- ``{(j := 0) for i in range(5) for j in range(5)}'' is a rebound
	iteration variable, not an inner-loop rebind."
	boundUpTo := Set new.
	gens do: [:gen | self ___collectStoreNamesIn___: gen target into: boundUpTo].
	(self ___comprehensionElementsOf___: node) do: [:elt |
		self ___checkNamedExprsIn___: elt
			boundUpTo: boundUpTo boundAfter: Set new]
%

category: 'Grail-validation'
method: PythonParser
___checkNamedExprsIn___: node boundUpTo: earlier boundAfter: later
	"Raise for any assignment expression under node whose target collides with
	a comprehension for-clause target.  A name bound by an EARLIER (or the
	same) clause is a rebound iteration variable; one bound by a LATER clause
	is the inner-loop case, which CPython words the other way round -- the
	inner loop rebinds the walrus target, not the reverse."

	| found |
	found := OrderedCollection new.
	self ___collectNamedExprsIn___: node into: found.
	found do: [:ne |
		| target name |
		target := ne target.
		(target isKindOf: NameAst) ifTrue: [
			name := target id asString.
			(earlier includes: name) ifTrue: [
				SyntaxError signal:
					'assignment expression cannot rebind comprehension iteration variable ''' ,
					name , ''''].
			(later includes: name) ifTrue: [
				SyntaxError signal:
					'comprehension inner loop cannot rebind assignment expression target ''' ,
					name , '''']]]
%

category: 'Grail-validation'
method: PythonParser
___firstNamedExprIn___: node
	"The first NamedExprAst under node, or nil."

	| found |
	found := OrderedCollection new.
	self ___collectNamedExprsIn___: node into: found.
	^ found isEmpty ifTrue: [nil] ifFalse: [found first]
%

category: 'Grail-validation'
method: PythonParser
___collectNamedExprsIn___: node into: aColl
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
%

category: 'Grail-validation'
method: PythonParser
___collectStoreNamesIn___: node into: aSet
	"Names BOUND by a for-clause target, as Strings.

	Only NameAsts in STORE context count, which is what distinguishes the
	names a target binds from the ones it merely reads: in
	``for a, (*b, c[d+e::f(g)], h.i) in j'' the target binds a and b, while c,
	d, e, f, g and h are loads inside a subscript or attribute and bind
	nothing.  setStoreCtx: marks exactly the bound ones, recursing through
	tuples, lists and starred targets and no further."

	node isNil ifTrue: [^ self].
	node isString ifTrue: [^ self].
	(node isKindOf: SequenceableCollection) ifTrue: [
		node do: [:each | self ___collectStoreNamesIn___: each into: aSet].
		^ self].
	(node isKindOf: AbstractNode) ifFalse: [^ self].
	((node isKindOf: NameAst) and: [node ctx isKindOf: StoreAst]) ifTrue: [
		aSet add: node id asString].
	node class allInstVarNames doWithIndex: [:nameSym :i |
		nameSym == #parent ifFalse: [
			self ___collectStoreNamesIn___: (node instVarAt: i) into: aSet]]
%

category: 'Grail-parsing - match'
method: PythonParser
atMatchStatement
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
	used as a plain name.  '-', '~', '*', '(' and '[' CAN begin one."
	(next type == #OP and: [
		(#('-' '~' '*' '(' '[' '{') includes: next value) not]) ifTrue: [^false].
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
%

category: 'Grail-parsing - match'
method: PythonParser
parseMatch
	"Parse: match SUBJECT ':' NEWLINE INDENT case_block+ DEDENT"

	| tok subject cases |
	tok := self advance.  "consume the soft keyword 'match'"
	subject := self parseMatchSubject.
	self expect: #OP value: ':'.
	cases := self parseCaseBlocks.
	cases isEmpty ifTrue: [
		SyntaxError signal: 'expected at least one case block at line ',
			tok line printString].
	^MatchAst new
		subject: subject;
		cases: cases;
		from: tok to: self lastToken ; yourself
%

category: 'Grail-parsing - match'
method: PythonParser
parseMatchSubject
	"The subject expression.  A bare comma makes it a TUPLE, without
	parentheses: ``match x, y:'' matches the pair."

	| first elts startTok |
	startTok := self peek.
	first := self parseExpression.
	(self atOp: ',') ifFalse: [^first].
	elts := Array with: first.
	[self matchOp: ','] whileTrue: [
		(self atOp: ':') ifTrue: [^TupleAst new
			elts: elts; ctx: self loadCtx;
			from: startTok to: self lastToken ; yourself].
		elts := elts copyWith: self parseExpression].
	^TupleAst new
		elts: elts;
		ctx: self loadCtx;
		from: startTok to: self lastToken ; yourself
%

category: 'Grail-parsing - match'
method: PythonParser
parseCaseBlocks
	"The indented run of ``case'' clauses that forms a match body."

	| cases |
	self expectType: #NEWLINE.
	self skipNewlines.
	self expectType: #INDENT.
	cases := Array new.
	self skipNewlines.
	[(self peek notNil)
		and: [self peek isEndMarker not
		and: [self peekType ~~ #DEDENT]]] whileTrue: [
			cases := cases copyWith: self parseCaseBlock.
			self skipNewlines].
	self peekType == #DEDENT ifTrue: [self advance].
	^cases
%

category: 'Grail-parsing - match'
method: PythonParser
parseCaseBlock
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
	self expect: #OP value: ':'.
	body := self parseBlock.
	^MatchCaseAst new
		pattern: pattern;
		guard: guard;
		body: (self wrapSuite: body);
		from: tok to: self lastToken ; yourself
%

category: 'Grail-parsing - match'
method: PythonParser
parseMatchPatterns
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
%

category: 'Grail-parsing - match'
method: PythonParser
parseMatchPattern
	"or_pattern ['as' NAME]"

	| tok inner target |
	tok := self peek.
	inner := self parseMatchOrPattern.
	(self atKeyword: 'as') ifFalse: [^inner].
	self advance.
	target := self parseMatchCaptureTarget.
	^MatchAsAst new
		pattern: inner;
		name: target;
		from: tok to: self lastToken ; yourself
%

category: 'Grail-parsing - match'
method: PythonParser
parseMatchOrPattern
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
%

category: 'Grail-parsing - match'
method: PythonParser
parseMatchCaptureTarget
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
		id: tok value asSymbol;
		ctx: self loadCtx;
		token: tok ; yourself.
	self setStoreCtx: node.
	^node
%

category: 'Grail-parsing - match'
method: PythonParser
parseMatchClosedPattern
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
		value: self parseBitwiseXor;
		from: tok to: self lastToken ; yourself
%

category: 'Grail-parsing - match'
method: PythonParser
parseMatchSingleton
	"None / True / False -- compared by identity, so they get their own
	node rather than folding into MatchValueAst."

	| tok |
	tok := self peek.
	^MatchSingletonAst new
		value: self parseAtom;
		from: tok to: self lastToken ; yourself
%

category: 'Grail-parsing - match'
method: PythonParser
parseMatchStar
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
%

category: 'Grail-parsing - match'
method: PythonParser
parseMatchSequence: openOp close: closeOp
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
%

category: 'Grail-parsing - match'
method: PythonParser
___matchSequenceOf___: elts from: tok
	"Build a sequence pattern, rejecting the one arity error PEP 634
	names: more than one star.  Two stars have no unambiguous split, so
	this is a syntax error rather than a runtime surprise."

	| stars |
	stars := 0.
	elts do: [:each | (each isKindOf: MatchStarAst) ifTrue: [stars := stars + 1]].
	stars > 1 ifTrue: [
		SyntaxError signal: 'multiple starred names in sequence pattern at line ',
			tok line printString].
	^MatchSequenceAst new
		patterns: elts;
		from: tok to: self lastToken ; yourself
%

category: 'Grail-parsing - match'
method: PythonParser
parseMatchGroupOrSequence
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
%

category: 'Grail-parsing - match'
method: PythonParser
parseMatchMapping
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
				rest := self parseMatchCaptureTarget]
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
%

category: 'Grail-parsing - match'
method: PythonParser
parseMatchMappingKey
	"A mapping pattern's key: a literal, or a dotted name."

	| tok |
	tok := self peek.
	(tok notNil and: [tok isName]) ifTrue: [^ self parseMatchDottedName].
	^self parseBitwiseXor
%

category: 'Grail-parsing - match'
method: PythonParser
parseMatchDottedName
	"NAME ('.' NAME)* as a LOAD expression -- the value-pattern and
	class-pattern head."

	| tok node |
	tok := self advance.
	node := NameAst new
		id: tok value asSymbol;
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
%

category: 'Grail-parsing - match'
method: PythonParser
parseMatchNamePattern
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
%

category: 'Grail-parsing - match'
method: PythonParser
parseMatchClassPattern: clsNode from: tok
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
					SyntaxError signal: 'positional patterns follow keyword patterns at line ',
						tok line printString].
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
%

category: 'Grail-parsing - type alias'
method: PythonParser
atTypeAliasStatement
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
%

category: 'Grail-parsing - type alias'
method: PythonParser
parseTypeAlias
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
%

category: 'Grail-parsing - type alias'
method: PythonParser
___typeAliasTarget___: aToken
	"The alias name as a STORE target -- ``type X = int'' binds X in the
	enclosing scope exactly as an assignment would."

	| node |
	node := NameAst new
		id: aToken value asSymbol;
		ctx: self loadCtx;
		token: aToken ; yourself.
	self setStoreCtx: node.
	^node
%
