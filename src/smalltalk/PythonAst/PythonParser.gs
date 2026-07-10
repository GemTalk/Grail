! ------------------- Superclass check
run
Object ifNil: [self error: 'Object is not defined. Check file ordering.'].
%

! ------------------- Class definition for PythonParser
expectvalue /Class
doit
Object subclass: 'PythonParser'
  instVarNames: #( source tokens position variableStack classNesting writeStack
                    blockingStack nonlocalStack globalStack inCompTarget)
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
parse: aString

	^self basicNew
		source: aString;
		parseModule
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
buildNode: aClass fields: aDictionary
	"Build an AST node of the given class with the given field values."

	^aClass buildWithFields: aDictionary
%

category: 'Grail-node construction'
method: PythonParser
buildNode: aClass fields: aDictionary from: startToken to: endToken
	"Build an AST node with location info spanning two tokens."

	| dict |
	dict := aDictionary copy.
	dict at: #beginLine put: startToken line.
	dict at: #beginColumn put: startToken column.
	dict at: #endLine put: endToken endLine.
	dict at: #endColumn put: endToken endColumn.
	^aClass buildWithFields: dict
%

category: 'Grail-node construction'
method: PythonParser
buildNode: aClass fields: aDictionary token: aToken
	"Build an AST node with location info from a token."

	| dict |
	dict := aDictionary copy.
	dict at: #beginLine put: aToken line.
	dict at: #beginColumn put: aToken column.
	dict at: #endLine put: aToken endLine.
	dict at: #endColumn put: aToken endColumn.
	^aClass buildWithFields: dict
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

	variableStack last add: aSymbol.
	inCompTarget == true ifTrue: [^ self].
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
	``def f[T](...)`` / ``class C[T: bound]:`` / ``def g[*Ts, **P]()``.
	Parse and DISCARD the balanced bracket group: Grail erases generics
	(as it does Generic[...]), and the parameter names only appear in
	annotations, which Grail never evaluates.  test_functools could not
	even import before this."

	| depth tok |
	tok := self peek.
	(tok notNil and: [tok isOp: '[']) ifFalse: [^ self].
	depth := 0.
	[
		tok := self advance.
		(tok isOp: '[') ifTrue: [depth := depth + 1].
		(tok isOp: ']') ifTrue: [depth := depth - 1].
		depth = 0
	] whileFalse
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
	^self buildNode: AssertAst fields: (IdentityKeyValueDictionary new
		at: #test put: test;
		at: #msg put: msg;
		yourself) from: tok to: self lastToken
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
		"Change class to AsyncFunctionDefAst"
		funcNode changeClassTo: AsyncFunctionDefAst.
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
		^self buildNode: ConstantAst fields: (IdentityKeyValueDictionary new
			at: #value put: nil;
			at: #kind put: nil;
			yourself) token: tok
	].
	(tok isKeyword: 'True') ifTrue: [
		self advance.
		^self buildNode: ConstantAst fields: (IdentityKeyValueDictionary new
			at: #value put: true;
			at: #kind put: nil;
			yourself) token: tok
	].
	(tok isKeyword: 'False') ifTrue: [
		self advance.
		^self buildNode: ConstantAst fields: (IdentityKeyValueDictionary new
			at: #value put: false;
			at: #kind put: nil;
			yourself) token: tok
	].

	"Numeric literals"
	tok isNumber ifTrue: [
		self advance.
		^self buildNode: ConstantAst fields: (IdentityKeyValueDictionary new
			at: #value put: (self parseNumberValue: tok value);
			at: #kind put: nil;
			yourself) token: tok
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
		[scan <= tokens @env0:size
			and: [(tokens @env0:at: scan) isString
				or: [(tokens @env0:at: scan) isFString]]] whileTrue: [
			(tokens @env0:at: scan) isFString ifTrue: [anyF := true].
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
		^self buildNode: ConstantAst fields: (IdentityKeyValueDictionary new
			at: #value put: #'...';
			at: #kind put: nil;
			yourself) token: tok
	].

	"Identifiers.  Python `_` (the conventional 'unused' name) isn't a
	valid Smalltalk identifier (Smalltalk requires letters), so rename
	it consistently at parse time — every NameAst that referred to `_`
	now refers to `___unused___`."
	tok isName ifTrue: [
		| nameSym |
		self advance.
		nameSym := tok value asSymbol.
		nameSym = #'_' ifTrue: [nameSym := #'___unused___'].
		^self buildNode: NameAst fields: (IdentityKeyValueDictionary new
			at: #id put: nameSym;
			at: #ctx put: self loadCtx;
			yourself) token: tok
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
		^self buildNode: StarredAst fields: (IdentityKeyValueDictionary new
			at: #value put: value;
			at: #ctx put: self loadCtx;
			yourself) from: tok to: self lastToken
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
		^self buildNode: AwaitAst fields: (IdentityKeyValueDictionary new
			at: #value put: value;
			yourself) from: tok to: self lastToken
	].

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
		left := self buildNode: BinOpAst fields: (IdentityKeyValueDictionary new
			at: #left put: left;
			at: #op put: BitAndAst basicNew;
			at: #right put: right;
			yourself) from: startTok to: self lastToken.
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
		left := self buildNode: BinOpAst fields: (IdentityKeyValueDictionary new
			at: #left put: left;
			at: #op put: BitOrAst basicNew;
			at: #right put: right;
			yourself) from: startTok to: self lastToken.
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
		left := self buildNode: BinOpAst fields: (IdentityKeyValueDictionary new
			at: #left put: left;
			at: #op put: BitXorAst basicNew;
			at: #right put: right;
			yourself) from: startTok to: self lastToken.
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

	| stmts |
	"Check for single-line body (no NEWLINE/INDENT)"
	(self peek notNil and: [self peekType ~~ #NEWLINE and: [self peekType ~~ #NL and: [self peekType ~~ #INDENT]]]) ifTrue: [
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
	^self buildNode: BreakAst fields: IdentityKeyValueDictionary new token: tok
%

category: 'Grail-parsing - atoms'
method: PythonParser
parseBytesLiteral
	"Parse one or more adjacent bytes tokens (implicit concatenation)."

	| startTok writeStream str ba |
	startTok := self peek.
	writeStream := WriteStream on: Unicode7 new.
	[self peek notNil and: [self peek isBytes]] whileTrue: [
		writeStream nextPutAll: self advance value.
	].
	str := writeStream contents.
	ba := ByteArray new: str size.
	1 to: str size do: [:i | ba at: i put: (str at: i) codePoint].
	^self buildNode: ConstantAst fields: (IdentityKeyValueDictionary new
		at: #value put: ba;
		at: #kind put: nil;
		yourself) from: startTok to: self lastToken
%

category: 'Grail-parsing - arguments'
method: PythonParser
parseCallArgList
	"Parse function call arguments. Returns an Array of {positional. keywords}."

	| args kwargs |
	args := Array new.
	kwargs := Array new.
	(self peek notNil and: [(self peek isOp: ')') not]) ifTrue: [
		[
			(self peek isOp: ')') ifTrue: [false] ifFalse: [
				"**kwargs"
				(self atOp: '**') ifTrue: [
					self advance.
					kwargs add: (self buildNode: KeywordAst fields: (IdentityKeyValueDictionary new
						at: #arg put: nil;
						at: #value put: self parseExpression;
						yourself) from: self lastToken to: self lastToken).
				] ifFalse: [
				"*args"
				(self atOp: '*') ifTrue: [
					self advance.
					args add: (self buildNode: StarredAst fields: (IdentityKeyValueDictionary new
						at: #value put: self parseExpression;
						at: #ctx put: self loadCtx;
						yourself) from: self lastToken to: self lastToken).
				] ifFalse: [
					| expr |
					expr := self parseExpression.
					"Check for keyword argument: name=value"
					(self matchOp: '=') ifTrue: [
						| name value |
						name := (expr isKindOf: NameAst) ifTrue: [expr id asString] ifFalse: [nil].
						value := self parseExpression.
						kwargs add: (self buildNode: KeywordAst fields: (IdentityKeyValueDictionary new
							at: #arg put: name;
							at: #value put: value;
							yourself) from: self lastToken to: self lastToken).
					] ifFalse: [
						"Check for comprehension in generator expression — either ``for`` or ``async for``"
						((self atKeyword: 'for') or: [self atKeyword: 'async']) ifTrue: [
							| generators |
							generators := self parseComprehensions.
							args add: (self buildNode: GeneratorExpAst fields: (IdentityKeyValueDictionary new
								at: #elt put: expr;
								at: #generators put: generators;
								yourself) from: self lastToken to: self lastToken).
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
	block := BlockAst buildWithFields: (IdentityKeyValueDictionary new
		at: #body put: body;
		at: #variables put: variables;
		at: #writes put: writes;
		at: #hasReturnBlocking put: blocking;
		at: #globalNames put: (scope at: 4);
		yourself).
	^self buildNode: ClassDefAst fields: (IdentityKeyValueDictionary new
		at: #name put: nameTok value asSymbol;
		at: #bases put: bases;
		at: #keywords put: keywords;
		at: #body put: block;
		at: #decorator_list put: decorators;
		at: #type_params put: Array new;
		yourself) from: tok to: self lastToken
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
	^self buildNode: CompareAst fields: (IdentityKeyValueDictionary new
		at: #left put: left;
		at: #cmpopList put: ops;
		at: #comparatorList put: comparators;
		yourself) from: startTok to: self lastToken
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
		generators add: (ComprehensionAst buildWithFields: (IdentityKeyValueDictionary new
			at: #target put: target;
			at: #iter put: iter;
			at: #ifs put: ifs;
			at: #is_async put: isAsync;
			yourself)).
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
	^self buildNode: AndAst fields: (IdentityKeyValueDictionary new
		at: #values put: values;
		yourself) from: startTok to: self lastToken
%

category: 'Grail-parsing - simple statements'
method: PythonParser
parseContinue

	| tok |
	tok := self advance. "consume 'continue'"
	^self buildNode: ContinueAst fields: IdentityKeyValueDictionary new token: tok
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
		funcNode changeClassTo: AsyncFunctionDefAst.
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

category: 'Grail-parsing - simple statements'
method: PythonParser
parseDelete
	"Parse: del target_list"

	| tok targets |
	tok := self advance. "consume 'del'"
	targets := Array new.
	targets add: (self setDelCtx: self parsePrimary).
	[self matchOp: ','] whileTrue: [
		(self peek notNil and: [self peek isNewline not]) ifTrue: [
			targets add: (self setDelCtx: self parsePrimary).
		].
	].
	^self buildNode: DeleteAst fields: (IdentityKeyValueDictionary new
		at: #targets put: targets;
		yourself) from: tok to: self lastToken
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
	^self buildNode: DictAst fields: (IdentityKeyValueDictionary new
		at: #keys put: keys;
		at: #values put: values;
		yourself) from: startTok to: self lastToken
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
		^self buildNode: DictAst fields: (IdentityKeyValueDictionary new
			at: #keys put: Array new;
			at: #values put: Array new;
			yourself) from: startTok to: self lastToken
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
			^self buildNode: DictCompAst fields: (IdentityKeyValueDictionary new
				at: #key put: first;
				at: #value put: value;
				at: #generators put: generators;
				yourself) from: startTok to: self lastToken
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
		^self buildNode: DictAst fields: (IdentityKeyValueDictionary new
			at: #keys put: keys;
			at: #values put: values;
			yourself) from: startTok to: self lastToken
	].

	"Set comprehension — ``for`` or ``async for`` opens the clause"
	((self atKeyword: 'for') or: [self atKeyword: 'async']) ifTrue: [
		| generators |
		generators := self parseComprehensions.
		self expect: #OP value: '}'.
		^self buildNode: SetCompAst fields: (IdentityKeyValueDictionary new
			at: #elt put: first;
			at: #generators put: generators;
			yourself) from: startTok to: self lastToken
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
	^self buildNode: SetAst fields: (IdentityKeyValueDictionary new
		at: #elts put: elts;
		yourself) from: startTok to: self lastToken
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
	^self buildNode: OrAst fields: (IdentityKeyValueDictionary new
		at: #values put: values;
		yourself) from: startTok to: self lastToken
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
	^self buildNode: IfAst fields: (IdentityKeyValueDictionary new
		at: #test put: test;
		at: #body put: (self wrapSuite: body);
		at: #orelse put: (self wrapSuite: orelse);
		yourself) from: tok to: self lastToken
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
		^self buildNode: NamedExprAst fields: (IdentityKeyValueDictionary new
			at: #target put: expr;
			at: #value put: value;
			yourself) from: startTok to: self lastToken
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
		self setStoreCtx: expr.
		^self buildNode: AugAssignAst fields: (IdentityKeyValueDictionary new
			at: #target put: expr;
			at: #op put: opClass basicNew;
			at: #value put: value;
			yourself) from: startTok to: self lastToken
	].

	"Annotated assignment: x: int = value"
	(tok notNil and: [tok isOp: ':']) ifTrue: [
		| colonTok annotation value simple |
		colonTok := self advance.
		"Check this isn't a walrus operator :="
		(self peek notNil and: [self peek isOp: '=']) ifFalse: [
			annotation := self parseExpression.
			value := nil.
			(self matchOp: '=') ifTrue: [
				value := self parseExpression.
			].
			self setStoreCtx: expr.
			simple := (expr isKindOf: NameAst) ifTrue: [1] ifFalse: [0].
			^self buildNode: AnnAssignAst fields: (IdentityKeyValueDictionary new
				at: #target put: expr;
				at: #annotation put: annotation;
				at: #value put: value;
				at: #simple put: simple;
				yourself) from: startTok to: self lastToken
		].
	].

	"Regular assignment: x = value (possibly chained: x = y = value)"
	(tok notNil and: [tok isOp: '=']) ifTrue: [
		| targets value |
		targets := Array new.
		self setStoreCtx: expr.
		targets add: expr.
		[self matchOp: '='] whileTrue: [
			| nextExpr |
			nextExpr := self parseStarExpressions.
			"Check if followed by another '=' - if so, this is another target"
			(self peek notNil and: [self peek isOp: '=']) ifTrue: [
				self setStoreCtx: nextExpr.
				targets add: nextExpr.
			] ifFalse: [
				value := nextExpr.
			].
		].
		value ifNil: [value := targets removeLast].
		^self buildNode: AssignAst fields: (IdentityKeyValueDictionary new
			at: #targets put: targets;
			at: #value put: value;
			at: #type_comment put: nil;
			yourself) from: startTok to: self lastToken
	].

	"Walrus operator: name := value"
	(tok notNil and: [tok isOp: ':=']) ifTrue: [
		| value |
		self advance.
		value := self parseExpression.
		self setStoreCtx: expr.
		^self buildNode: NamedExprAst fields: (IdentityKeyValueDictionary new
			at: #target put: expr;
			at: #value put: value;
			yourself) from: startTok to: self lastToken
	].

	"Expression statement"
	^self buildNode: ExprAst fields: (IdentityKeyValueDictionary new
		at: #value put: expr;
		yourself) from: startTok to: self lastToken
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
		^self buildNode: UAddAst fields: (IdentityKeyValueDictionary new
			at: #operand put: operand;
			yourself) from: tok to: self lastToken
	].
	(tok notNil and: [tok isOp: '-']) ifTrue: [
		| operand |
		self advance.
		operand := self parseFactor.
		^self buildNode: USubAst fields: (IdentityKeyValueDictionary new
			at: #operand put: operand;
			yourself) from: tok to: self lastToken
	].
	(tok notNil and: [tok isOp: '~']) ifTrue: [
		| operand |
		self advance.
		operand := self parseFactor.
		^self buildNode: InvertAst fields: (IdentityKeyValueDictionary new
			at: #operand put: operand;
			yourself) from: tok to: self lastToken
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
	^self buildNode: ForAst fields: (IdentityKeyValueDictionary new
		at: #target put: target;
		at: #iter put: iter;
		at: #body put: (self wrapSuite: body);
		at: #orelse put: (self wrapSuite: orelse);
		at: #type_comment put: nil;
		yourself) from: tok to: self lastToken
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
	^self buildNode: AliasAst fields: (IdentityKeyValueDictionary new
		at: #name put: nameTok value asSymbol;
		at: #asName put: asName;
		yourself) from: nameTok to: self lastToken
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
	  savedNesting |
	tok := self advance. "consume 'def'"
	nameTok := self expectType: #NAME.
	self declareWrite: nameTok value asSymbol.
	self skipTypeParams.
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
	args posonlyargs do: [:a | self declareVariable: a name asSymbol].
	args args do: [:a | self declareVariable: a name asSymbol].
	args kwonlyargs do: [:a | self declareVariable: a name asSymbol].
	args vararg ifNotNil: [self declareVariable: args vararg name asSymbol].
	args kwarg ifNotNil: [self declareVariable: args kwarg name asSymbol].
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
	block := BlockAst buildWithFields: (IdentityKeyValueDictionary new
		at: #body put: body;
		at: #variables put: variables;
		at: #writes put: writes;
		at: #hasReturnBlocking put: blocking;
		at: #globalNames put: (scope at: 4);
		yourself).
	decoratorNames := decorators collect: [:each |
		(each isKindOf: NameAst) ifTrue: [each id] ifFalse: [each]
	].
	funcNode := self buildNode: FunctionDefAst fields: (IdentityKeyValueDictionary new
		at: #name put: nameTok value asSymbol;
		at: #args put: args;
		at: #body put: block;
		at: #decorator_list put: decoratorNames;
		at: #returns put: returns;
		at: #type_comment put: nil;
		at: #type_params put: Array new;
		yourself) from: tok to: self lastToken.
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

category: 'Grail-parsing - parameters'
method: PythonParser
parseFunctionParametersUntil: endOp
	"Parse function parameters until endOp (')' for def, ':' for lambda).
	Returns an ArgumentsAst."

	| posonlyargs args vararg kwonlyargs kw_defaults kwarg defaults
	  sawSlash sawStar allowAnnotations |
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

	(self peek notNil and: [(self peek isOp: endOp) not]) ifTrue: [
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

	^ArgumentsAst buildWithFields: (IdentityKeyValueDictionary new
		at: #posonlyargs put: posonlyargs;
		at: #args put: args;
		at: #vararg put: vararg;
		at: #kwonlyargs put: kwonlyargs;
		at: #kw_defaults put: kw_defaults;
		at: #kwarg put: kwarg;
		at: #defaults put: defaults;
		yourself)
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
	names do: [:n |
		globalStack last add: n.
		variableStack first add: n.
	].
	^self buildNode: GlobalAst fields: (IdentityKeyValueDictionary new
		at: #names put: names;
		yourself) from: tok to: self lastToken
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
	^self buildNode: IfAst fields: (IdentityKeyValueDictionary new
		at: #test put: test;
		at: #body put: (self wrapSuite: body);
		at: #orelse put: (self wrapSuite: orelse);
		yourself) from: tok to: self lastToken
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
	^self buildNode: ImportAst fields: (IdentityKeyValueDictionary new
		at: #names put: names;
		yourself) from: tok to: self lastToken
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
		names := Array with: (self buildNode: AliasAst fields: (IdentityKeyValueDictionary new
			at: #name put: #'*';
			at: #asName put: nil;
			yourself) token: self lastToken).
	] ifFalse: [
		| hasParen |
		hasParen := self matchOp: '('.
		names := Array new.
		names add: self parseFromImportName.
		[self matchOp: ','] whileTrue: [
			(self peek notNil and: [self peek isOp: ')']) ifFalse: [
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
	^self buildNode: ImportFromAst fields: (IdentityKeyValueDictionary new
		at: #module put: moduleStr;
		at: #names put: names;
		at: #level put: level;
		yourself) from: tok to: self lastToken
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
	^self buildNode: AliasAst fields: (IdentityKeyValueDictionary new
		at: #name put: nameStr asSymbol;
		at: #asName put: asName;
		yourself) from: nameTok to: self lastToken
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
		^self buildNode: NotAst fields: (IdentityKeyValueDictionary new
			at: #operand put: operand;
			yourself) from: tok to: self lastToken
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
		args := ArgumentsAst buildWithFields: (IdentityKeyValueDictionary new
			at: #posonlyargs put: Array new;
			at: #args put: Array new;
			at: #vararg put: nil;
			at: #kwonlyargs put: Array new;
			at: #kw_defaults put: Array new;
			at: #kwarg put: nil;
			at: #defaults put: Array new;
			yourself).
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
	^self buildNode: LambdaAst fields: (IdentityKeyValueDictionary new
		at: #args put: args;
		at: #body put: body;
		yourself) from: tok to: self lastToken
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
		^self buildNode: ListAst fields: (IdentityKeyValueDictionary new
			at: #elts put: Array new;
			at: #ctx put: self loadCtx;
			yourself) from: startTok to: self lastToken
	].

	expr := self parseStarExpression.

	"List comprehension — either ``for`` or ``async for`` opens the clause"
	((self atKeyword: 'for') or: [self atKeyword: 'async']) ifTrue: [
		| generators |
		generators := self parseComprehensions.
		self expect: #OP value: ']'.
		^self buildNode: ListCompAst fields: (IdentityKeyValueDictionary new
			at: #elt put: expr;
			at: #generators put: generators;
			yourself) from: startTok to: self lastToken
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
	^self buildNode: ListAst fields: (IdentityKeyValueDictionary new
		at: #elts put: elts;
		at: #ctx put: self loadCtx;
		yourself) from: startTok to: self lastToken
%

category: 'Grail-parsing - module'
method: PythonParser
parseModule
	"Parse a complete module. Returns a ModuleAst."

	| body block module variables writes blocking scope |
	self skipNewlines.
	body := self parseStatements.
	scope := self popScope.
	variables := scope at: 1.
	writes := scope at: 2.
	blocking := scope at: 3.
	block := BlockAst buildWithFields: (IdentityKeyValueDictionary new
		at: #body put: body;
		at: #variables put: variables;
		at: #writes put: writes;
		at: #hasReturnBlocking put: blocking;
		at: #globalNames put: (scope at: 4);
		yourself).
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
	^self buildNode: NonlocalAst fields: (IdentityKeyValueDictionary new
		at: #names put: names;
		yourself) from: tok to: self lastToken
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
		^self buildNode: TupleAst fields: (IdentityKeyValueDictionary new
			at: #elts put: Array new;
			at: #ctx put: self loadCtx;
			yourself) from: startTok to: self lastToken
	].

	expr := self parseStarExpression.

	"Check for comprehension (generator expression) — ``for`` or ``async for`` opens the clause"
	((self atKeyword: 'for') or: [self atKeyword: 'async']) ifTrue: [
		| generators |
		generators := self parseComprehensions.
		self expect: #OP value: ')'.
		^self buildNode: GeneratorExpAst fields: (IdentityKeyValueDictionary new
			at: #elt put: expr;
			at: #generators put: generators;
			yourself) from: startTok to: self lastToken
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
		^self buildNode: TupleAst fields: (IdentityKeyValueDictionary new
			at: #elts put: exprs;
			at: #ctx put: self loadCtx;
			yourself) from: startTok to: self lastToken
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
	^self buildNode: PassAst fields: IdentityKeyValueDictionary new token: tok
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
		^self buildNode: BinOpAst fields: (IdentityKeyValueDictionary new
			at: #left put: left;
			at: #op put: PowAst basicNew;
			at: #right put: right;
			yourself) from: startTok to: self lastToken
	].
	^left
%

category: 'Grail-parsing - expressions'
method: PythonParser
parsePrimary
	"Parse: atom trailer* where trailer is .name, [subscript], or (args)"

	| expr startTok |
	startTok := self peek.
	expr := self parseAtom.
	"Parse trailers"
	[self peek notNil and: [(self atOp: '.') or: [(self atOp: '[') or: [self atOp: '(']]]] whileTrue: [
		(self atOp: '.') ifTrue: [
			| nameTok |
			self advance.
			nameTok := self expectType: #NAME.
			expr := self buildNode: AttributeAst fields: (IdentityKeyValueDictionary new
				at: #value put: expr;
				at: #attr put: nameTok value asSymbol;
				at: #ctx put: self loadCtx;
				yourself) from: startTok to: self lastToken.
		] ifFalse: [
		(self atOp: '[') ifTrue: [
			| slice |
			self advance.
			slice := self parseSubscript.
			self expect: #OP value: ']'.
			expr := self buildNode: SubscriptAst fields: (IdentityKeyValueDictionary new
				at: #value put: expr;
				at: #slice put: slice;
				at: #ctx put: self loadCtx;
				yourself) from: startTok to: self lastToken.
		] ifFalse: [
		(self atOp: '(') ifTrue: [
			| result callArgs callKwargs |
			self advance.
			result := self parseCallArgList.
			callArgs := result first.
			callKwargs := result last.
			self expect: #OP value: ')'.
			expr := self buildNode: CallAst fields: (IdentityKeyValueDictionary new
				at: #function put: expr;
				at: #arguments put: callArgs;
				at: #keywords put: callKwargs;
				yourself) from: startTok to: self lastToken.
		]]].
	].
	^expr
%

category: 'Grail-parsing - simple statements'
method: PythonParser
parseRaise
	"Parse: raise [expr ['from' expr]]"

	| tok exc cause |
	tok := self advance. "consume 'raise'"
	exc := nil.
	cause := nil.
	(self peek notNil and: [self peek isNewline not and: [self peek isEndMarker not]]) ifTrue: [
		exc := self parseExpression.
		(self matchKeyword: 'from') ifTrue: [
			cause := self parseExpression.
		].
	].
	^self buildNode: RaiseAst fields: (IdentityKeyValueDictionary new
		at: #exc put: exc;
		at: #cause put: cause;
		yourself) from: tok to: self lastToken
%

category: 'Grail-parsing - simple statements'
method: PythonParser
parseReturn
	"Parse: return [expr]"

	| tok value |
	tok := self advance. "consume 'return'"
	value := nil.
	(self peek notNil and: [self peek isNewline not and: [self peek isEndMarker not and: [(self peek isOp: ';') not]]]) ifTrue: [
		value := self parseStarExpressions.
	].
	^self buildNode: ReturnAst fields: (IdentityKeyValueDictionary new
		at: #value put: value;
		yourself) from: tok to: self lastToken
%

category: 'Grail-parsing - expressions'
method: PythonParser
parseShift
	"Parse: sum (('<<' | '>>') sum)*"

	| left startTok |
	startTok := self peek.
	left := self parseSum.
	[self peek notNil and: [(self atOp: '<<') or: [self atOp: '>>']]] whileTrue: [
		| opTok opClass right |
		opTok := self advance.
		opClass := opTok value = '<<' ifTrue: [LShiftAst] ifFalse: [RShiftAst].
		right := self parseSum.
		left := self buildNode: BinOpAst fields: (IdentityKeyValueDictionary new
			at: #left put: left;
			at: #op put: opClass basicNew;
			at: #right put: right;
			yourself) from: startTok to: self lastToken.
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
	[self matchOp: ';'] whileTrue: [
		(self peek notNil and: [self peek isNewline or: [self peek isEndMarker]]) ifTrue: [
			"Trailing semicolon"
		] ifFalse: [
			stmts add: self parseSimpleStatement.
		].
	].
	^stmts
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
	^self buildNode: ArgAst fields: (IdentityKeyValueDictionary new
		at: #arg put: argName;
		at: #annotation put: annotation;
		at: #type_comment put: nil;
		yourself) from: nameTok to: self lastToken
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

	^self buildNode: SliceAst fields: (IdentityKeyValueDictionary new
		at: #lower put: lower;
		at: #upper put: upper;
		at: #step put: step;
		yourself) from: startTok to: self lastToken
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
		^self buildNode: StarredAst fields: (IdentityKeyValueDictionary new
			at: #value put: value;
			at: #ctx put: self loadCtx;
			yourself) from: tok to: self lastToken
	].
	^self parseExpression
%

category: 'Grail-parsing - star expressions'
method: PythonParser
parseStarExpressions
	"Parse comma-separated expressions, possibly starred.
	Returns a single expression or a tuple if there's a comma."

	| first exprs startTok |
	startTok := self peek.
	first := self parseStarExpression.
	(self peek notNil and: [self peek isOp: ',']) ifFalse: [^first].

	exprs := Array new.
	exprs add: first.
	[self matchOp: ','] whileTrue: [
		(self peek notNil and: [self peek isNewline not and: [self peek isEndMarker not and: [(self peek isOp: ')') not and: [(self peek isOp: ']') not and: [(self peek isOp: '}') not and: [(self peek isOp: ':') not and: [(self peek isOp: ';') not and: [(self peek isOp: '=') not]]]]]]]]) ifTrue: [
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
	^self buildNode: TupleAst fields: (IdentityKeyValueDictionary new
		at: #elts put: exprs;
		at: #ctx put: self loadCtx;
		yourself) from: startTok to: self lastToken
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
		^self buildNode: StarredAst fields: (IdentityKeyValueDictionary new
			at: #value put: value;
			at: #ctx put: self loadCtx;
			yourself) from: tok to: self lastToken
	].
	^self parsePrimary
%

category: 'Grail-parsing - star expressions'
method: PythonParser
parseStarTargets
	"Parse assignment targets, possibly starred, possibly as tuple."

	| first targets startTok |
	startTok := self peek.
	first := self parseStarTarget.
	(self peek notNil and: [self peek isOp: ',']) ifFalse: [^first].

	targets := Array new.
	targets add: first.
	[self matchOp: ','] whileTrue: [
		(self peek notNil and: [(self peek isKeyword: 'in') not and: [self peek isNewline not and: [(self peek isOp: ':') not and: [(self peek isOp: ')') not]]]]) ifTrue: [
			targets add: self parseStarTarget.
		].
	].
	^self buildNode: TupleAst fields: (IdentityKeyValueDictionary new
		at: #elts put: targets;
		at: #ctx put: self loadCtx;
		yourself) from: startTok to: self lastToken
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

	"Simple statements"
	^self parseSimpleStatements
%

category: 'Grail-parsing - statements'
method: PythonParser
parseStatements
	"Parse a sequence of statements until ENDMARKER or DEDENT."

	| stmts |
	stmts := Array new.
	self skipNewlines.
	[self peek notNil and: [self peek isEndMarker not and: [self peekType ~~ #DEDENT]]] whileTrue: [
		stmts addAll: self parseStatement.
		self skipNewlines.
	].
	^stmts
%

category: 'Grail-parsing - atoms'
method: PythonParser
parseStringLiteral
	"Parse one or more adjacent string tokens (implicit concatenation)."

	| startTok writeStream |
	startTok := self peek.
	writeStream := WriteStream on: Unicode7 new.
	[self peek notNil and: [self peek isString]] whileTrue: [
		writeStream nextPutAll: self advance value.
	].
	^self buildNode: ConstantAst fields: (IdentityKeyValueDictionary new
		at: #value put: writeStream contents;
		at: #kind put: nil;
		yourself) from: startTok to: self lastToken
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
	  specBuf inSpec bracketDepth strQuote exprEnd c2 backCount |
	startTok := self peek.
	parts := OrderedCollection new.
	[self peek notNil and: [self peek isString or: [self peek isFString]]] whileTrue: [
		tok := self advance.
		value := tok value.
		len := value @env0:size.
		tok isFString ifFalse: [
			"Plain string token — append as a literal segment."
			parts add: #literal -> value.
		] ifTrue: [
	pos := 1.
	[pos <= len] whileTrue: [
		ch := value @env0:at: pos.
		ch == ${ ifTrue: [
			"``{{`` is a literal ``{``."
			((pos < len) and: [(value @env0:at: pos + 1) == ${]) ifTrue: [
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
					ch := value @env0:at: pos.
					strQuote ifNotNil: [
						"Inside a string literal — only the matching quote
						closes it.  Escapes (``\\``) skip one char."
						ch == $\ ifTrue: [
							inSpec ifTrue: [specBuf nextPut: ch].
							pos := pos + 1.
							pos <= len ifTrue: [
								inSpec ifTrue: [specBuf nextPut: (value @env0:at: pos)].
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
											c2 := value @env0:at: pos + 1.
											c2 == $r or: [c2 == $s or: [c2 == $a]]]]])
										ifTrue: [
											conversion := value @env0:at: pos + 1.
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
				exprText := value @env0:copyFrom: exprStart to: (exprEnd ifNil: [pos - 1] ifNotNil: [
					"Trim trailing conversion+spec text from the expression
					if either was present.  Walk back through specBuf and the
					conversion bytes from exprEnd."
					| backCount |
					backCount := specBuf contents @env0:size.
					inSpec ifTrue: [backCount := backCount + 1].
					conversion ifNotNil: [backCount := backCount + 2].
					exprEnd - 1 - backCount
				]).
				formatSpec := inSpec ifTrue: [specBuf contents] ifFalse: [nil].
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
				innerParser := PythonParser basicNew source: exprText asString.
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
				((pos < len) and: [(value @env0:at: pos + 1) == $}]) ifTrue: [
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
					and: [(value @env0:at: pos) ~= ${ and: [(value @env0:at: pos) ~= $}]]]
					whileTrue: [pos := pos + 1].
				parts add: #literal -> (value @env0:copyFrom: runStart to: pos - 1).
			]
		]
	].
	].
	].
	"Empty f-string → empty literal."
	parts isEmpty ifTrue: [
		^self buildNode: ConstantAst fields: (IdentityKeyValueDictionary new
			at: #value put: '';
			at: #kind put: nil;
			yourself) from: startTok to: self lastToken
	].
	"Build a left-folded chain of BinOp(+) over each piece."
	result := self ___fstringPartToAst: parts first from: startTok.
	2 to: parts size do: [:i |
		piece := self ___fstringPartToAst: (parts at: i) from: startTok.
		result := self buildNode: BinOpAst fields: (IdentityKeyValueDictionary new
			at: #left put: result;
			at: #op put: (self buildNode: AddAst fields: IdentityKeyValueDictionary new from: startTok to: startTok);
			at: #right put: piece;
			yourself) from: startTok to: self lastToken.
	].
	^ result
%

category: 'Grail-parsing - atoms'
method: PythonParser
___fstringPartToAst: assoc from: startTok
	"Turn a (#literal -> string) or (#expr -> exprAst) pair into the
	matching AST node — literals become a ConstantAst, expr-parts are
	already AST nodes ready for the BinOp chain."

	assoc key == #literal ifTrue: [
		^ self buildNode: ConstantAst fields: (IdentityKeyValueDictionary new
			at: #value put: assoc value;
			at: #kind put: nil;
			yourself) from: startTok to: startTok
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
	inner := self buildNode: CallAst fields: (IdentityKeyValueDictionary new
		at: #function put: (self buildNode: NameAst fields: (IdentityKeyValueDictionary new
			at: #id put: builtinName asSymbol;
			at: #ctx put: self loadCtx;
			yourself) from: locTok to: locTok);
		at: #arguments put: { exprAst };
		at: #keywords put: Array new;
		yourself) from: locTok to: locTok.
	formatSpec ifNil: [^ inner].
	"format(value, spec) wrap."
	callNode := self buildNode: CallAst fields: (IdentityKeyValueDictionary new
		at: #function put: (self buildNode: NameAst fields: (IdentityKeyValueDictionary new
			at: #id put: #format;
			at: #ctx put: self loadCtx;
			yourself) from: locTok to: locTok);
		at: #arguments put: { exprAst.
			self buildNode: ConstantAst fields: (IdentityKeyValueDictionary new
				at: #value put: formatSpec;
				at: #kind put: nil;
				yourself) from: locTok to: locTok };
		at: #keywords put: Array new;
		yourself) from: locTok to: locTok.
	^ callNode
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
		^self buildNode: TupleAst fields: (IdentityKeyValueDictionary new
			at: #elts put: items;
			at: #ctx put: self loadCtx;
			yourself) from: (tokens at: position - 1) to: self lastToken
	].

	^first
%

category: 'Grail-parsing - expressions'
method: PythonParser
parseSum
	"Parse: term (('+' | '-') term)*"

	| left startTok |
	startTok := self peek.
	left := self parseTerm.
	[self peek notNil and: [(self atOp: '+') or: [self atOp: '-']]] whileTrue: [
		| opTok opClass right |
		opTok := self advance.
		opClass := opTok value = '+' ifTrue: [AddAst] ifFalse: [SubAst].
		right := self parseTerm.
		left := self buildNode: BinOpAst fields: (IdentityKeyValueDictionary new
			at: #left put: left;
			at: #op put: opClass basicNew;
			at: #right put: right;
			yourself) from: startTok to: self lastToken.
	].
	^left
%

category: 'Grail-parsing - expressions'
method: PythonParser
parseTerm
	"Parse: factor (('*' | '/' | '//' | '%' | '@') factor)*"

	| left startTok |
	startTok := self peek.
	left := self parseFactor.
	[self peek notNil and: [(self atOp: '*') or: [(self atOp: '/') or: [(self atOp: '//') or: [(self atOp: '%') or: [self atOp: '@']]]]]] whileTrue: [
		| opTok opClass right |
		opTok := self advance.
		opClass := self operatorClassFor: opTok value.
		right := self parseFactor.
		left := self buildNode: BinOpAst fields: (IdentityKeyValueDictionary new
			at: #left put: left;
			at: #op put: opClass basicNew;
			at: #right put: right;
			yourself) from: startTok to: self lastToken.
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
		^self buildNode: IfExpAst fields: (IdentityKeyValueDictionary new
			at: #test put: test;
			at: #body put: expr;
			at: #orelse put: orelse;
			yourself) from: startTok to: self lastToken
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
	[self atKeyword: 'except'] whileTrue: [
		| exceptTok excType excName exceptBody |
		exceptTok := self advance. "consume 'except'"
		excType := nil.
		excName := nil.
		(self peek notNil and: [(self peek isOp: ':') not]) ifTrue: [
			excType := self parseExpression.
			(self matchKeyword: 'as') ifTrue: [
				excName := self advance value asSymbol.
				"Bind the except name into the enclosing scope (module body
				or function), so a module-level ``except X as e'' records e
				as a module variable rather than an undeclared name."
				self declareWrite: excName.
			].
		].
		self expect: #OP value: ':'.
		exceptBody := self parseBlock.
		handlers add: (self buildNode: ExceptHandlerAst fields: (IdentityKeyValueDictionary new
			at: #type put: excType;
			at: #name put: excName;
			at: #body put: (self wrapSuite: exceptBody);
			yourself) from: exceptTok to: self lastToken).
	].

	"Parse else clause"
	(self matchKeyword: 'else') ifTrue: [
		self expect: #OP value: ':'.
		orelse := self parseBlock.
	].

	"Parse finally clause"
	(self matchKeyword: 'finally') ifTrue: [
		self expect: #OP value: ':'.
		finalbody := self parseBlock.
		"Flag the enclosing scope as return-blocking — the finally
		cleanup is emitted AFTER the try body, the same pattern that
		makes ``^''-style returns produce dead code."
		self markScopeReturnBlocking.
	].

	^self buildNode: TryAst fields: (IdentityKeyValueDictionary new
		at: #body put: (self wrapSuite: body);
		at: #handlers put: handlers;
		at: #orelse put: (self wrapSuite: orelse);
		at: #finalbody put: (self wrapSuite: finalbody);
		yourself) from: tok to: self lastToken
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
	^self buildNode: WhileAst fields: (IdentityKeyValueDictionary new
		at: #test put: test;
		at: #body put: (self wrapSuite: body);
		at: #orelse put: (self wrapSuite: orelse);
		yourself) from: tok to: self lastToken
%

category: 'Grail-parsing - compound statements'
method: PythonParser
parseWith
	"Parse: with expr [as target], ...: body"

	| tok items body |
	tok := self advance. "consume 'with'"
	"Flag the enclosing scope as ``return-blocking'' — WithAst's
	codegen emits the context manager's __exit__ call AFTER the
	body, which is the post-body cleanup that ``^''-style returns
	can't coexist with.  FunctionDefAst reads this off the body's
	BlockAst to choose PythonReturn-exception return codegen."
	self markScopeReturnBlocking.
	items := Array new.
	items add: self parseWithItem.
	[self matchOp: ','] whileTrue: [
		items add: self parseWithItem.
	].
	self expect: #OP value: ':'.
	body := self parseBlock.
	^self buildNode: WithAst fields: (IdentityKeyValueDictionary new
		at: #items put: items;
		at: #body put: (self wrapSuite: body);
		at: #type_comment put: nil;
		yourself) from: tok to: self lastToken
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
	^self buildNode: WithItemAst fields: (IdentityKeyValueDictionary new
		at: #context_expr put: expr;
		at: #optional_vars put: optVars;
		yourself) from: startTok to: self lastToken
%

category: 'Grail-parsing - yield'
method: PythonParser
parseYieldExpression
	"Parse: yield [from expr] | yield [expr_list]"

	| tok value |
	tok := self advance. "consume 'yield'"
	(self matchKeyword: 'from') ifTrue: [
		value := self parseExpression.
		^self buildNode: YieldFromAst fields: (IdentityKeyValueDictionary new
			at: #value put: value;
			yourself) from: tok to: self lastToken
	].
	value := nil.
	(self peek notNil and: [self peek isNewline not and: [self peek isEndMarker not and: [(self peek isOp: ')') not and: [(self peek isOp: ']') not]]]]) ifTrue: [
		value := self parseStarExpressions.
	].
	^self buildNode: YieldAst fields: (IdentityKeyValueDictionary new
		at: #value put: value;
		yourself) from: tok to: self lastToken
%

category: 'Grail-parsing - simple statements'
method: PythonParser
parseYieldStatement
	"Parse yield as a statement (wraps in ExprAst)."

	| tok expr |
	tok := self peek.
	expr := self parseYieldExpression.
	^self buildNode: ExprAst fields: (IdentityKeyValueDictionary new
		at: #value put: expr;
		yourself) from: tok to: self lastToken
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

category: 'Grail-node construction'
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

	| vars writes blocking nonlocals globals |
	vars := variableStack removeLast.
	writes := writeStack removeLast.
	blocking := blockingStack removeLast.
	nonlocals := nonlocalStack removeLast.
	globals := globalStack removeLast.
	nonlocals do: [:n |
		vars remove: n ifAbsent: [].
		writes remove: n ifAbsent: [].
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
	^ Array with: vars with: writes with: blocking with: globals
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
	"Change an expression's context to Del."

	| varNames index |
	varNames := anExpr class allInstVarNames.
	index := varNames indexOf: #ctx.
	index > 0 ifTrue: [anExpr instVarAt: index put: self delCtx].
	^anExpr
%

category: 'Grail-node construction'
method: PythonParser
setStoreCtx: anExpr
	"Change an expression's context to Store (for assignment targets).
	Also registers variable names with the current scope."

	| varNames index |
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

	[self peek notNil and: [self peek isNewline]] whileTrue: [
		self advance.
	].
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

	^SuiteAst buildWithFields: (IdentityKeyValueDictionary new
		at: #body put: statementsArray;
		yourself)
%
