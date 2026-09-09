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
	(anIndex = 1 and: [outerSourceOrNil notNil and: [isAsyncClause]])
		ifTrue: [
			"The async-genexp emission aiter'd the outermost iterable at
			CREATION (GeneratorExpAst explains why); srcTemp already holds
			the async iterator, and a second __aiter__ would be a protocol
			violation for a one-shot iterable."
			aStream nextPutAll: srcTemp; nextPutAll: '.'; lf]
		ifFalse: [
			isAsyncClause ifTrue: [
				aStream nextPutAll: 'PythonCoroutine @env1:___grailAiter___: ('].
			anIndex = 1
				ifTrue: [aStream nextPutAll: srcTemp]
				ifFalse: [gen iter printSmalltalkWithParenthesisOn: aStream].
			isAsyncClause
				ifTrue: [aStream nextPutAll: ').'; lf]
				ifFalse: [aStream nextPutAll: ' __iter__.'; lf]].

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

! ------------------- IR codegen shared by ListComp / DictComp / SetComp / GeneratorExp (cut 57)

category: 'Grail-IR Codegen'
classmethod: ComprehensionAst
___irRefusal___: generators
	"Why the IR path cannot emit these for-clauses (a census Symbol), or nil
	when it can: every clause synchronous, every target a Store-context Name
	or a tuple / list nest of them with no star -- the shapes
	___emitIRGenerators___:... binds.  The text's subscript / attribute /
	star target stores (___emitTargetStore___:, the star slice of
	___emitUnpack___:) are not emitted yet.  The iterables and filters are
	judged by the caller with the right scope set; this is only about the
	clause structure.  Guarded: eligibility never raises."

	^ [(generators isNil or: [generators isEmpty])
		ifTrue: [#'Comprehension:noGenerators']
		ifFalse: [
			(generators anySatisfy: [:g | g is_async = 1])
				ifTrue: [#'Comprehension:async']
				ifFalse: [
					(generators detect: [:g | (self ___irTargetShapeOk___: g target) not] ifNone: [nil])
						ifNil: [nil]
						ifNotNil: [:g | self ___irTargetRefusal___: g target]]]]
		on: Error do: [:ex | #'Comprehension:probeError']
%

category: 'Grail-IR Codegen'
classmethod: ComprehensionAst
___irTargetShapeOk___: aTarget
	"A Store-context Name, or a tuple / list nest of them (no star)."

	(aTarget isKindOf: NameAst) ifTrue: [^ aTarget ctx isKindOf: StoreAst].
	((aTarget isKindOf: TupleAst) or: [aTarget isKindOf: ListAst]) ifTrue: [
		aTarget elts isNil ifTrue: [^ false].
		^ aTarget elts allSatisfy: [:e | self ___irTargetShapeOk___: e]].
	^ false
%

category: 'Grail-IR Codegen'
classmethod: ComprehensionAst
___irTargetRefusal___: aTarget
	"The census label for a target shape ___irTargetShapeOk___: declined."

	(aTarget isKindOf: StarredAst) ifTrue: [^ #'Comprehension:starTarget'].
	((aTarget isKindOf: TupleAst) or: [aTarget isKindOf: ListAst]) ifTrue: [
		(aTarget elts ifNil: [#()]) do: [:e |
			(self ___irTargetShapeOk___: e) ifFalse: [^ self ___irTargetRefusal___: e]].
		^ #'Comprehension:target-other'].
	^ ('Comprehension:target-' , aTarget class name asString) asSymbol
%

category: 'Grail-IR Codegen'
classmethod: ComprehensionAst
___irTargetNames___: generators
	"Every leaf Name the clause targets bind, as Strings, deduplicated in
	first-occurrence order (``_'' wildcards all parse to ___unused___ --
	___collectTargetNames___:'s dedupe, for the same reason: one block temp
	per name)."

	| names |
	names := OrderedCollection new.
	generators do: [:g | self ___irAddTargetNames___: g target into: names].
	^ names
%

category: 'Grail-IR Codegen'
classmethod: ComprehensionAst
___irAddTargetNames___: aTarget into: names
	(aTarget isKindOf: NameAst) ifTrue: [
		(names includes: aTarget id asString) ifFalse: [names add: aTarget id asString].
		^ self].
	(aTarget isKindOf: StarredAst) ifTrue: [
		^ self ___irAddTargetNames___: aTarget value into: names].
	((aTarget isKindOf: TupleAst) or: [aTarget isKindOf: ListAst]) ifTrue: [
		(aTarget elts ifNil: [#()]) do: [:e | self ___irAddTargetNames___: e into: names]].
	^ self
%

category: 'Grail-IR Codegen'
classmethod: ComprehensionAst
___irScopeLocals___: localNames generators: generators
	"localNames plus every clause target: the set a read INSIDE the
	comprehension (element, filters, the later iterables) is judged against.
	The targets are not locals of the def -- the parser keeps them out of the
	body's variables and writes (declareWrite:) -- so without this the
	NameAst predicate would send every target read down the module-load
	branch."

	| set |
	set := localNames copy.
	(self ___irTargetNames___: generators) do: [:n | set add: n].
	^ set
%

category: 'Grail-IR Codegen'
classmethod: ComprehensionAst
___irClausesEligible___: generators locals: localNames
	"The first clause's iterable is judged in the ENCLOSING scope (CPython
	evaluates it there, and the text hoists it into ___src1___ before the
	target block opens); every later iterable and every filter in the
	comprehension's own scope."

	| inner |
	inner := self ___irScopeLocals___: localNames generators: generators.
	generators doWithIndex: [:g :i |
		(g iter ___irEligibleValueLocals___: (i = 1 ifTrue: [localNames] ifFalse: [inner]))
			ifFalse: [^ false].
		(g ifs ifNil: [#()]) do: [:c |
			(c ___irEligibleValueLocals___: inner) ifFalse: [^ false]]].
	^ true
%

category: 'Grail-IR Codegen'
classmethod: ComprehensionAst
___irReadsOf___: generators parts: partNodes into: aSet locals: localSet
	"The flow analysis's read collector shared by the four comprehension kinds.
	The first iterable's reads are the enclosing scope's; everything else --
	the later iterables, the filters, the element parts -- reads inside the
	comprehension, where a clause target shadows an enclosing local of its
	name, so those names are dropped: ForAst's rule for its loop target."

	| sub names |
	generators first iter ___irReadLocalNamesInto___: aSet locals: localSet.
	sub := Set new.
	generators doWithIndex: [:g :i |
		i > 1 ifTrue: [g iter ___irReadLocalNamesInto___: sub locals: localSet].
		(g ifs ifNil: [#()]) do: [:c | c ___irReadLocalNamesInto___: sub locals: localSet]].
	partNodes do: [:p | p ___irReadLocalNamesInto___: sub locals: localSet].
	names := self ___irTargetNames___: generators.
	sub do: [:r | (names includes: r) ifFalse: [aSet add: r]].
	^ self
%

category: 'Grail-IR Codegen'
classmethod: ComprehensionAst
___emitIRGenerators___: generators from: anIndex on: aBuilder innerBody: aBlock outerSource: outerSourceBlockOrNil
	"emitGenerators:from:on:innerBody:outerSource: as IR, node for node.  The
	outermost clause (anIndex = 1) opens the traceback-frame wrapper block and
	the source block that hoists its iterable into ``___src1___'' in the
	ENCLOSING scope (before any target temp exists), then the clause block;
	a later clause is just its clause block, a statement of the enclosing
	clause's loop body.  outerSourceBlockOrNil, when given, answers the node
	for a value already holding the outermost iterable (a generator
	expression binds it at construction, cut 59) in place of the iterable
	expression itself.

	    [                                            ``traceback wrapper''
	    [| ___src1___ |
	      ___src1___ := (iter).
	      [| ___iter1___ x | ... ] @env0:on: PythonLoopDrained do: [:___ex___ | nil].
	    ] value
	    ] @env0:on: Exception do: [:___tex___ | ___tex___ ___pushTracebackFrame___: ... . ___tex___ pass].

	Every temp is a BLOCK temp, as in the text, so nested comprehensions
	shadow rather than collide (each has its own ___r___ / ___src1___ /
	___iter1___), and a target named like a method temp or parameter shadows
	it for the comprehension's extent only (PyMethodIRBuilder>>withLocals:do:)."

	| gen srcSym tbBlk |
	anIndex > generators size ifTrue: [aBlock value. ^ self].
	gen := generators at: anIndex.
	anIndex = 1 ifFalse: [
		^ self ___emitIRClause___: generators at: anIndex source: nil on: aBuilder innerBody: aBlock].
	srcSym := ('___src' , anIndex printString , '___') asSymbol.
	aBuilder atNode: gen iter.
	tbBlk := aBuilder inBlockDo: [
		| srcBlk |
		srcBlk := aBuilder blockWithTemps: { srcSym } do: [:leaves |
			| srcLeaf |
			srcLeaf := leaves first.
			aBuilder atNode: gen iter.
			aBuilder add: (aBuilder assign: srcLeaf from: (outerSourceBlockOrNil isNil
				ifTrue: [gen iter ___emitIRValueOn___: aBuilder]
				ifFalse: [outerSourceBlockOrNil value])).
			self ___emitIRClause___: generators at: anIndex
				source: [aBuilder var: srcLeaf] on: aBuilder innerBody: aBlock].
		aBuilder atNode: gen iter.
		aBuilder add: (aBuilder send: #value to: srcBlk with: { } env: 0)].
	aBuilder atNode: gen iter.
	aBuilder add: (aBuilder
		send: #on:do: to: tbBlk
		with: { aBuilder globalNamed: #Exception.
			self ___emitIRTracebackHandlerFor___: gen iter on: aBuilder }
		env: 0).
	^ self
%

category: 'Grail-IR Codegen'
classmethod: ComprehensionAst
___emitIRClause___: generators at: anIndex source: srcBlockOrNil on: aBuilder innerBody: aBlock
	"One for-clause, the text's target block:

	    [| ___iterN___ [___itemN___] <target names> |
	      ___iterN___ := (src) __iter__.
	      [true] whileTrue: [
	        x := ([___iterN___ __next__] @env0:on: StopIteration do: [:___dx___ | PythonLoopDrained @env0:___signal___]).
	        (cond) ___isTruthy___ ifTrue: [ <next clause | inner body> ]].
	    ] @env0:on: PythonLoopDrained do: [:___ex___ | nil].

	A tuple target lands in ``___itemN___'', is normalised through
	``PythonCoroutine ___unpackNormalize___:'' and stored leaf by leaf off
	re-evaluated ``__getitem__:'' subscripts (___emitIRUnpack___:source:on:).
	srcBlockOrNil answers the hoisted-source node for the first clause; a
	later clause evaluates its iterable here, inside the enclosing targets'
	scope and (as the text's block does) its own."

	| gen isName names temps clauseBlk |
	gen := generators at: anIndex.
	isName := gen target isKindOf: NameAst.
	names := OrderedCollection new.
	self ___irAddTargetNames___: gen target into: names.
	temps := OrderedCollection with: ('___iter' , anIndex printString , '___') asSymbol.
	isName ifFalse: [temps add: ('___item' , anIndex printString , '___') asSymbol].
	names do: [:n | temps add: n asSymbol].
	clauseBlk := aBuilder blockWithTemps: temps asArray do: [:leaves |
		| iterLeaf itemLeaf bindings |
		iterLeaf := leaves first.
		itemLeaf := isName ifTrue: [nil] ifFalse: [leaves at: 2].
		bindings := names collect: [:n |
			n asSymbol -> (leaves at: (temps indexOf: n asSymbol))].
		aBuilder withLocals: bindings do: [
			| condBlk bodyBlk |
			aBuilder atNode: gen iter.
			aBuilder add: (aBuilder assign: iterLeaf from: (aBuilder
				send: #'__iter__'
				to: (srcBlockOrNil isNil
					ifTrue: [gen iter ___emitIRValueOn___: aBuilder]
					ifFalse: [srcBlockOrNil value])
				with: { } env: 1)).
			condBlk := aBuilder inBlockDo: [aBuilder add: aBuilder trueLit].
			bodyBlk := aBuilder inBlockDo: [
				| stepBlk drain guarded |
				stepBlk := aBuilder inBlockDo: [
					aBuilder atNode: gen iter.
					aBuilder add: (aBuilder
						send: #'__next__' to: (aBuilder var: iterLeaf) with: { } env: 1)].
				drain := aBuilder blockWithArg: #'___dx___' do: [:dx |
					aBuilder add: (aBuilder
						send: #'___signal___'
						to: (aBuilder globalNamed: #PythonLoopDrained)
						with: { } env: 0)].
				guarded := aBuilder
					send: #on:do: to: stepBlk
					with: { aBuilder globalNamed: #StopIteration. drain } env: 0.
				aBuilder atNode: gen target.
				isName
					ifTrue: [aBuilder add: (aBuilder
						assign: (aBuilder leafFor: gen target id asSymbol) from: guarded)]
					ifFalse: [
						aBuilder add: (aBuilder assign: itemLeaf from: guarded).
						aBuilder add: (aBuilder assign: itemLeaf from: (aBuilder
							send: #'___unpackNormalize___:'
							to: (aBuilder globalNamed: #PythonCoroutine)
							with: { aBuilder var: itemLeaf } env: 0)).
						self ___emitIRUnpack___: gen target
							source: [aBuilder var: itemLeaf] on: aBuilder].
				self ___emitIRFilters___: (gen ifs ifNil: [#()]) from: 1 on: aBuilder then: [
					self ___emitIRGenerators___: generators from: anIndex + 1
						on: aBuilder innerBody: aBlock outerSource: nil]].
			aBuilder atNode: gen iter.
			aBuilder add: (aBuilder whileTrue: condBlk do: bodyBlk)]].
	aBuilder atNode: gen iter.
	aBuilder add: (aBuilder
		send: #on:do: to: clauseBlk
		with: { aBuilder globalNamed: #PythonLoopDrained.
			aBuilder handlerBlockNamed: #'___ex___' }
		env: 0).
	^ self
%

category: 'Grail-IR Codegen'
classmethod: ComprehensionAst
___emitIRFilters___: conds from: anIndex on: aBuilder then: aBlock
	"The chained ``(cond) ___isTruthy___ ifTrue: [ ... ]'' of the if-clauses,
	innermost holding aBlock's statements."

	| condV |
	anIndex > conds size ifTrue: [aBlock value. ^ self].
	condV := aBuilder
		send: #'___isTruthy___'
		to: ((conds at: anIndex) ___emitIRValueOn___: aBuilder)
		with: { }.
	aBuilder atNode: (conds at: anIndex).
	aBuilder if: condV then: [
		self ___emitIRFilters___: conds from: anIndex + 1 on: aBuilder then: aBlock].
	^ self
%

category: 'Grail-IR Codegen'
classmethod: ComprehensionAst
___emitIRUnpack___: aTarget source: aSourceBlock on: aBuilder
	"___emitUnpack___:from:on:'s no-star shapes: a Name leaf stores the source
	(its leaf is the clause's block temp, bound by withLocals:do:); a nested
	tuple / list reads its elements off ``((src) __getitem__: i)'', the
	subscript re-evaluated per leaf.  aSourceBlock answers a FRESH node each
	time (IR nodes cannot be shared between sends)."

	(aTarget isKindOf: NameAst) ifTrue: [
		^ aBuilder add: (aBuilder
			assign: (aBuilder leafFor: aTarget id asSymbol) from: aSourceBlock value)].
	aTarget elts doWithIndex: [:elt :i |
		self ___emitIRUnpack___: elt
			source: [aBuilder
				send: #'__getitem__:' to: aSourceBlock value
				with: { aBuilder obj: i - 1 }]
			on: aBuilder]
%

category: 'Grail-IR Codegen'
classmethod: ComprehensionAst
___emitIRTracebackHandlerFor___: iterNode on: aBuilder
	"___emitTracebackFrameCloseFor:on:'s handler block as IR:

	    [:___tex___ | ___tex___ @env0:___pushTracebackFrame___:
	        (PyCode @env0:name: 'f' filename: '<path>' firstlineno: n)
	        lineno: l colno: c endLineno: el endColno: ec line: '<source line>'.
	      ___tex___ @env0:pass]

	The frame's code is the enclosing function's (CallAst functionBeingCompiled,
	set around the IR build as around the text emit); its position and source
	line are the first clause's iterable's."

	| func funcName funcLine |
	func := CallAst functionBeingCompiled.
	funcName := func isNil ifTrue: ['<module>'] ifFalse: [func name asString].
	funcLine := func isNil ifTrue: [1] ifFalse: [func beginLine].
	^ aBuilder blockWithArg: #'___tex___' do: [:texLeaf |
		| code |
		code := aBuilder
			send: #'name:filename:firstlineno:'
			to: (aBuilder globalNamed: #PyCode)
			with: { aBuilder obj: funcName.
				aBuilder obj: (CallAst sourcePath ifNil: ['<grail>']) asString.
				aBuilder obj: funcLine }
			env: 0.
		aBuilder add: (aBuilder
			send: #'___pushTracebackFrame___:lineno:colno:endLineno:endColno:line:'
			to: (aBuilder var: texLeaf)
			with: { code.
				aBuilder obj: iterNode beginLine.
				aBuilder obj: iterNode column.
				aBuilder obj: (iterNode endLine ifNil: [iterNode beginLine]).
				aBuilder obj: (iterNode endColumn ifNil: [iterNode column]).
				aBuilder obj: (iterNode sourceLine ifNil: ['']) asString }
			env: 0).
		aBuilder add: (aBuilder send: #pass to: (aBuilder var: texLeaf) with: { } env: 0)]
%
