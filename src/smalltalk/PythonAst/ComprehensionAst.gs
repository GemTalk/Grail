! ------------------- Superclass check
run
AbstractNode ifNil: [self error: 'AbstractNode is not defined. Check file ordering.'].
%

! ------------------- Class definition for ComprehensionAst
expectvalue /Class
doit
AbstractNode subclass: 'ComprehensionAst'
  instVarNames: #( target iter ifs
                    is_async)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonAst
  options: #()

%

expectvalue /Class
doit
ComprehensionAst comment:
'https://docs.python.org/3/library/ast.html#ast.comprehension

A single for clause in a comprehension.

target is the variable(s) the comprehension iterates over.
iter is the iterable.
ifs is a list of test expressions.
is_async is 1 if it is an async comprehension, 0 otherwise.

Example:
>>> print(ast.dump(ast.parse(''[x for x in numbers if x > 0]'', mode=''eval''), indent=4))
Expression(
    body=ListComp(
        elt=Name(id=''x'', ctx=Load()),
        generators=[
            comprehension(
                target=Name(id=''x'', ctx=Store()),
                iter=Name(id=''numbers'', ctx=Load()),
                ifs=[Compare(...)])]))

Hierarchy:
Object
  AbstractNode(parent)
    AbstractLocationNode
      ComprehensionAst(target iter ifs is_async)
'
%

expectvalue /Class
doit
ComprehensionAst category: 'Grail-Parser'
%

! ------------------- Remove existing behavior from ComprehensionAst
removeallmethods ComprehensionAst
removeallclassmethods ComprehensionAst
set compile_env: 0
! ------------------- Class methods for ComprehensionAst
! ------------------- Instance methods for ComprehensionAst

category: 'accessing'
method: ComprehensionAst
target
	^target
%

category: 'accessing'
method: ComprehensionAst
iter
	^iter
%

category: 'accessing'
method: ComprehensionAst
ifs
	^ifs
%

! ------------------- Code generation shared by ListComp / DictComp / SetComp / GeneratorExp

category: 'Grail-code generation'
classmethod: ComprehensionAst
___collectTargetNames___: aTarget into: seenSet on: aStream
	"Emit each leaf NameAst id of a (possibly nested) tuple target as
	a block temp, once."

	(aTarget isKindOf: NameAst) ifTrue: [
		(seenSet includes: aTarget id asSymbol) ifFalse: [
			seenSet add: aTarget id asSymbol.
			aStream nextPutAll: ' '; nextPutAll: aTarget id].
		^ self].
	(aTarget isKindOf: StarredAst) ifTrue: [
		^ self ___collectTargetNames___: aTarget value into: seenSet on: aStream].
	((aTarget isKindOf: TupleAst) or: [aTarget isKindOf: ListAst]) ifTrue: [
		aTarget elts do: [:e |
			self ___collectTargetNames___: e into: seenSet on: aStream]].
%

category: 'Grail-code generation'
classmethod: ComprehensionAst
___emitTargetStore___: aTarget from: sourceExpr on: aStream
	"Bind ONE non-tuple target from the Smalltalk expression sourceExpr.

	A comprehension's for-target is a full ASSIGNMENT target, not just a name.
	``for [0, 1][k] in ...'' stores through __setitem__ and ``for obj.a in ...''
	through __setattr__ -- the same shapes AssignAst emits for a statement
	assignment, and legal in exactly the same places.  Grail read ``target id''
	unconditionally, so a subscript target died with an uncatchable
	``SubscriptAst does not understand #id'' (test_listcomps test_nested_2 and
	test_nested_free_var_in_iter), and inside a TUPLE target it was quietly
	dropped instead -- the store simply never happened."

	(aTarget isKindOf: NameAst) ifTrue: [
		aStream nextPutAll: aTarget id; nextPutAll: ' := '; nextPutAll: sourceExpr; nextPut: $.; lf.
		^ self].
	(aTarget isKindOf: SubscriptAst) ifTrue: [
		aTarget value printSmalltalkWithParenthesisOn: aStream.
		aStream nextPutAll: ' __setitem__: '.
		aTarget slice printSmalltalkWithParenthesisOn: aStream.
		aStream nextPutAll: ' _: '; nextPutAll: sourceExpr; nextPut: $.; lf.
		^ self].
	(aTarget isKindOf: AttributeAst) ifTrue: [
		aTarget value printSmalltalkWithParenthesisOn: aStream.
		aStream nextPutAll: ' @env1:__setattr__: ''';
			nextPutAll: aTarget ___mangledAttr___;
			nextPutAll: ''' _: '; nextPutAll: sourceExpr; nextPut: $.; lf.
		^ self].
	^ self
%

category: 'Grail-code generation'
classmethod: ComprehensionAst
___emitUnpack___: aTarget from: sourceExpr on: aStream
	"Bind aTarget from the Smalltalk expression sourceExpr — plain
	name, nested tuple (recursing with a wrapped __getitem__: source),
	or PEP 3132 star slice.

	A leaf that is not a tuple goes to ___emitTargetStore___:, so a subscript
	or attribute leaf inside a tuple target (``for (l[0], l) in ...'') stores
	rather than being skipped."

	| n |
	((aTarget isKindOf: TupleAst) or: [aTarget isKindOf: ListAst]) ifFalse: [
		^ self ___emitTargetStore___: aTarget from: sourceExpr on: aStream].
	n := aTarget elts size.
	aTarget elts doWithIndex: [:elt :i |
		| childExpr starIdx after |
		(elt isKindOf: StarredAst) ifTrue: [
			starIdx := i - 1.
			childExpr := '(list @env1:__new__: ((' , sourceExpr ,
				') __getitem__: (slice @env1:__new__: ' , starIdx printString ,
				' _: (((' , sourceExpr , ') __len__) @env0:- ' ,
				(n - i) printString , '))))'.
			self ___emitUnpack___: elt value from: childExpr on: aStream
		] ifFalse: [
			after := (aTarget elts copyFrom: 1 to: i - 1)
				anySatisfy: [:e | e isKindOf: StarredAst].
			childExpr := after
				ifTrue: ['((' , sourceExpr , ') __getitem__: (((' ,
					sourceExpr , ') __len__) @env0:- ' ,
					(n - i + 1) printString , '))']
				ifFalse: ['((' , sourceExpr , ') __getitem__: ' ,
					(i - 1) printString , ')'].
			self ___emitUnpack___: elt from: childExpr on: aStream
		]
	].
%

category: 'code generation'
classmethod: ComprehensionAst
emitGenerators: aCollection from: anIndex on: aStream innerBody: aBlock
	"The ordinary form: the outermost iterable is evaluated in place (into
	___src1___, still in the ENCLOSING scope -- see the hoist comment
	below)."

	^ self emitGenerators: aCollection from: anIndex on: aStream
		innerBody: aBlock outerSource: nil
%

category: 'code generation'
classmethod: ComprehensionAst
emitGenerators: aCollection from: anIndex on: aStream innerBody: aBlock outerSource: outerSourceOrNil
	"Recursively emit each generator clause from aCollection starting at
	anIndex; aBlock prints the deepest body once all generators are
	consumed.  Each generator emits a fresh `___iterN___` temp, a
	[true] whileTrue: loop, target binding (with tuple unpacking when
	needed), and chained `ifTrue:` blocks for the if-clauses.

	outerSourceOrNil, when given, is the NAME of a temp already holding the
	outermost iterable's VALUE -- the async-genexp emission evaluates it at
	construction time and passes it in, because a lazy generator that
	evaluated it at first drive would read its free variables too late
	(GeneratorExpAst >> printSmalltalkOn: has the measured case)."

	| gen iterTemp itemTemp isTupleTarget hasIfs srcTemp isNameTarget
	  isAsyncClause nextExpr exhaustedName |
	anIndex > aCollection size ifTrue: [
		aBlock value.
		^self
	].
	gen := aCollection at: anIndex.
	iterTemp := '___iter' , anIndex printString , '___'.
	itemTemp := '___item' , anIndex printString , '___'.
	srcTemp := '___src' , anIndex printString , '___'.
	"A LIST target (``for [a, b] in ...'') unpacks exactly as a tuple does; it
	used to fall into the plain-name branch and die on ``target id''."
	isTupleTarget := (gen target isKindOf: TupleAst)
		or: [gen target isKindOf: ListAst].
	isNameTarget := gen target isKindOf: NameAst.
	hasIfs := gen ifs notNil and: [gen ifs size > 0].
	"``[x async for x in ait]'' -- PER CLAUSE, because one comprehension may mix
	them: ``[y async for x in ait for y in x]'' is legal and only the first
	clause is async.  The parser has always recorded this (is_async, 0 or 1) and
	codegen has always ignored it, so an async comprehension iterated its
	operand SYNCHRONOUSLY -- __aiter__/__anext__ never consulted.

	That went unnoticed while an ``async def'' containing ``yield'' answered a
	plain coroutine: PythonCoroutine is a PythonGenerator, so sync iteration
	over one produced the right items by accident.  Real async generators end
	the accident -- their yields are TAGGED (PyAsyncYield) so a yield can be
	told from an await -- and sync iteration then hands the tag to user code:
	``TypeError: unsupported operand type(s) for +: 'PyAsyncYield' and
	'SmallInteger''' from test_coroutines' test_comp_3.

	The three protocol points are the same three AsyncForAst overrides, for the
	same reasons; see AsyncForAst and PythonGenerator >> ___grailAwaitAnext___:."
	isAsyncClause := gen is_async = 1.
	nextExpr := isAsyncClause
		ifTrue: ['(___gen___ @env1:___grailAwaitAnext___: ('
			, iterTemp , ' __anext__))']
		ifFalse: [iterTemp , ' __next__'].
	exhaustedName := isAsyncClause
		ifTrue: ['StopAsyncIteration']
		ifFalse: ['StopIteration'].
	"Drain-guard the STEP, and only the step -- ForAst >>
	___drainGuardedStepFor___: explains the placement rule.  The clause-level
	handler below catches the re-signalled PythonLoopDrained, so an exhaustion
	exception raised by the target store or the comprehension body propagates
	instead of quietly ending the clause."
	nextExpr := '([' , nextExpr , '] @env0:on: ' , exhaustedName
		, ' do: [:___dx___ | PythonLoopDrained @env0:___signal___])'.

	"Outermost generator: open a traceback-frame wrapper block (closed by
	___emitTracebackFrameCloseFor:on:) so an iterator-protocol error surfaces
	with a PEP 657 location.

	Then evaluate its iterable in the ENCLOSING scope, hoisted into a source
	block declared BEFORE the target temp: CPython evaluates a comprehension's
	OUTERMOST iterable in the surrounding scope, and only the target temps live
	in the comprehension's own scope.  Without the hoist, a nested comprehension's
	outer iterable (``range(x)'' in ``[[.. for x in range(x)] for x in l]'') would
	bind against the not-yet-assigned inner target temp that shadows it, instead
	of the enclosing x (test_listcomps test_nested).  Subsequent generators
	(anIndex > 1) are evaluated INSIDE the comprehension scope, as CPython does."
	anIndex = 1 ifTrue: [
		aStream nextPutAll: '['; lf.
		aStream nextPutAll: '[| ', srcTemp, ' |'; lf; increaseIndent.
		aStream nextPutAll: srcTemp, ' := '.
		outerSourceOrNil
			ifNil: [gen iter printSmalltalkWithParenthesisOn: aStream]
			ifNotNil: [aStream nextPutAll: outerSourceOrNil].
		aStream nextPutAll: '.'; lf].

	"Open block + StopIteration handler"
	aStream nextPutAll: '[| ', iterTemp.
	"Every target except a plain name needs the item temp: the value has to be
	held before it can be stored THROUGH the target."
	isNameTarget ifFalse: [aStream nextPutAll: ' ', itemTemp].
	isTupleTarget ifTrue: [
		| seen |
		"Recursive name collection: nested tuple targets (``for (a, b),
		c in ...'') and star targets contribute their leaf names.
		Dedupe: multiple ``_'' wildcards all parse to ___unused___;
		declaring the temp twice is a CompileError (assigning twice is
		fine)."
		seen := IdentitySet new.
		self ___collectTargetNames___: gen target into: seen on: aStream
	] ifFalse: [
		"Only a NAME target declares a temp.  A subscript/attribute target binds
		nothing new -- it writes into an object that already exists -- and the
		names inside it are READS, resolved in the enclosing scope."
		isNameTarget ifTrue: [aStream nextPutAll: ' '; nextPutAll: gen target id]
	].
	aStream nextPutAll: ' |'; lf; increaseIndent.

	"___iterN___ := iter __iter__.  The outermost iterable was already evaluated
	into srcTemp in the enclosing scope above; inner generators evaluate here."
	aStream nextPutAll: iterTemp; nextPutAll: ' := '.
	isAsyncClause ifTrue: [
		aStream nextPutAll: 'PythonCoroutine @env1:___grailAiter___: ('].
	anIndex = 1
		ifTrue: [aStream nextPutAll: srcTemp]
		ifFalse: [gen iter printSmalltalkWithParenthesisOn: aStream].
	isAsyncClause
		ifTrue: [aStream nextPutAll: ').'; lf]
		ifFalse: [aStream nextPutAll: ' __iter__.'; lf].

	"[true] whileTrue: ["
	aStream nextPutAll: '[true] whileTrue: ['; lf; increaseIndent.

	"Bind target: a plain name assigns straight from __next__; everything else
	lands in the item temp first and is then STORED through the target."
	isNameTarget ifTrue: [
		gen target printSmalltalkOn: aStream.
		aStream nextPutAll: ' := '; nextPutAll: nextExpr; nextPutAll: '.'; lf
	] ifFalse: [
		aStream nextPutAll: itemTemp; nextPutAll: ' := '; nextPutAll: nextExpr; nextPutAll: '.'; lf.
		"Same normalisation as ForAst's tuple branch: unpacking is defined by
		iteration, so a non-subscriptable item is materialised first and its
		errors come from ITS iterator protocol."
		isTupleTarget ifTrue: [
			aStream nextPutAll: itemTemp;
				nextPutAll: ' := PythonCoroutine @env0:___unpackNormalize___: ';
				nextPutAll: itemTemp; nextPutAll: '.'; lf].
		isTupleTarget
			ifTrue: [self ___emitUnpack___: gen target from: itemTemp on: aStream]
			ifFalse: [self ___emitTargetStore___: gen target from: itemTemp on: aStream]
	].

	"Chain the if-clauses around the inner body"
	hasIfs ifTrue: [
		gen ifs do: [:cond |
			cond printSmalltalkWithParenthesisOn: aStream.
			aStream nextPutAll: ' ___isTruthy___ ifTrue: ['; lf; increaseIndent
		].
		self emitGenerators: aCollection from: anIndex + 1 on: aStream innerBody: aBlock.
		gen ifs do: [:_unused |
			aStream decreaseIndent; nextPutAll: '].'; lf
		]
	] ifFalse: [
		self emitGenerators: aCollection from: anIndex + 1 on: aStream innerBody: aBlock
	].

	"Close whileTrue:, handler.  The OUTERMOST generator (anIndex = 1) also
	gets wrapped in a traceback-frame handler (opened above) so an iterator-
	protocol error carries a PEP 657 location -- see ___emitTracebackFrameClose."
	aStream decreaseIndent; nextPutAll: '].'; lf.
	anIndex = 1
		ifTrue: [
			"Close the target-temp block + StopIteration handler (a statement inside
			the source block), then close the source block; its value is the
			traceback wrapper's single expression, so no trailing period."
			aStream decreaseIndent;
				nextPutAll: '] @env0:on: PythonLoopDrained do: [:___ex___ | nil].'; lf.
			aStream decreaseIndent; nextPutAll: '] value'; lf.
			self ___emitTracebackFrameCloseFor: gen iter on: aStream]
		ifFalse: [
			aStream decreaseIndent;
				nextPutAll: '] @env0:on: PythonLoopDrained do: [:___ex___ | nil].'; lf]
%

category: 'code generation'
classmethod: ComprehensionAst
___stLiteral: aString
	"A Smalltalk single-quoted string literal for aString, doubling embedded
	single quotes.  Emits the comprehension's source line + enclosing function
	name into the traceback-frame handler."

	| ws |
	ws := AppendStream on: Unicode7 new.
	ws nextPut: $'.
	aString do: [:c | c == $' ifTrue: [ws nextPut: $']. ws nextPut: c].
	ws nextPut: $'.
	^ ws contents
%

category: 'code generation'
classmethod: ComprehensionAst
___emitTracebackFrameCloseFor: iterNode on: aStream
	"Close the outermost comprehension generator with a handler that prepends
	ONE traceback frame (PEP 657: located at the iterable expression) for any
	Python exception escaping the iterator protocol, then re-raises.  The
	frame's code is the enclosing function's (CallAst functionBeingCompiled);
	its position + source line come from iterNode -- the first for-clause's
	iterable.  ___pushTracebackFrame___ no-ops for StopIteration / control-flow,
	so normal loop termination and a pending return/break/continue are
	unaffected."

	| func funcName funcLine |
	func := CallAst functionBeingCompiled.
	funcName := func isNil ifTrue: ['<module>'] ifFalse: [func name asString].
	funcLine := func isNil ifTrue: [1] ifFalse: [func beginLine].
	aStream
		nextPutAll: '] @env0:on: Exception do: [:___tex___ | ___tex___ @env0:___pushTracebackFrame___: (PyCode @env0:name: ';
		nextPutAll: (self ___stLiteral: funcName);
		nextPutAll: ' filename: '.
	self emitSourceFilenameLiteralOn: aStream.
	aStream
		nextPutAll: ' firstlineno: '; nextPutAll: funcLine printString;
		nextPutAll: ') lineno: '; nextPutAll: iterNode beginLine printString;
                nextPutAll: ' colno: '; nextPutAll: iterNode column printString;
                nextPutAll: ' endLineno: '; nextPutAll: (iterNode endLine ifNil: [iterNode beginLine]) printString;
                nextPutAll: ' endColno: '; nextPutAll: (iterNode endColumn ifNil: [iterNode column]) printString;
		nextPutAll: ' line: '; nextPutAll: (self ___stLiteral: (iterNode sourceLine ifNil: ['']));
		nextPutAll: '. ___tex___ @env0:pass].'; lf
%
method: ComprehensionAst
target: newValue
	target := newValue
%
method: ComprehensionAst
iter: newValue
	iter := newValue
%
method: ComprehensionAst
ifs: newValue
	ifs := newValue
%
method: ComprehensionAst
is_async
	^is_async
%
method: ComprehensionAst
is_async: newValue
	is_async := newValue
%
