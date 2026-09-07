! ------------------- Superclass check
run
StatementAst ifNil: [self error: 'StatementAst is not defined. Check file ordering.'].
%

! ------------------- Class definition for ForAst
expectvalue /Class
doit
StatementAst subclass: 'ForAst'
  instVarNames: #( target iter body
                    orelse type_comment)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonAst
  options: #()

%

expectvalue /Class
doit
ForAst comment: 
'For(expr target, expr iter, stmt* body, stmt* orelse) 									// 3.7
For(expr target, expr iter, stmt* body, stmt* orelse, string? type_comment)	// 3.8'
%

expectvalue /Class
doit
ForAst category: 'Grail-Parser'
%

! ------------------- Remove existing behavior from ForAst
removeallmethods ForAst
removeallclassmethods ForAst

set compile_env: 0

category: 'Grail-code generation'
method: ForAst
printSmalltalkOn: aStream
	"Generate: for target in iter: body [else: else_body]

	Translates to:
	  [
	   [| ___iter___ |
	    ___iter___ := iter __iter__.
	    [true] whileTrue: [
	      [target := ___iter___ __next__. body]
	          @env0:on: PythonContinue do: [...].
	    ].
	   ] @env0:on: StopIteration do: [:___ex___ | nil].
	   else_body.   ""only runs when the loop drained naturally""
	  ] @env0:on: PythonBreak do: [:___ex___ | nil].

	Python ``for-else`` requires the else clause to execute ONLY
	when the loop drains naturally — ``break`` must skip it.  Catch
	StopIteration (natural end) on the INNER handler, let
	PythonBreak propagate through it to an OUTER handler that wraps
	BOTH the loop and the else clause; the outer handler catches
	the break and the else clause never runs.

	For tuple unpacking (for a, b in items), uses a temp ___item___
	and unpacks with __getitem__:."

	| isTupleTarget depth iterTemp itemTemp p hasElse |
	isTupleTarget := target isKindOf: TupleAst.
	hasElse := orelse notNil and: [orelse size > 0].

	"Walk the AST parent chain to count enclosing ForAst nodes — depth
	is used to disambiguate `___iter___` / `___item___` temp names from
	any outer for-loop, since Smalltalk block temps in nested scopes
	cannot shadow the outer block's temps."
	depth := 0.
	p := parent.
	[p notNil] whileTrue: [
		(p isKindOf: ForAst) ifTrue: [depth := depth + 1].
		p := p parent.
	].
	iterTemp := '___iter' , depth printString , '___'.
	itemTemp := '___item' , depth printString , '___'.

	"Outer PythonBreak handler — wraps the iteration AND the else
	clause so a ``break`` from the body skips both."
	aStream nextPutAll: '['; lf; increaseIndent.

	"Inner StopIteration handler block"
	aStream nextPutAll: '[| '; nextPutAll: iterTemp.
	isTupleTarget ifTrue: [aStream space; nextPutAll: itemTemp].
	aStream nextPutAll: ' |'; lf; increaseIndent.

	"iter := iterable __iter__.  Preceded by a PEP 657 position store so an
	exception from EVALUATING the iterable (``for x in BrokenIter(init_raises=
	True)'') or from its __iter__ is reported at the iterable expression."
	self ___emitIterPosOn: aStream.
	aStream nextPutAll: iterTemp; nextPutAll: ' := '.
	self ___emitIteratorFrom___: iter on: aStream.
	aStream nextPutAll: '.'; lf.

	"[true] whileTrue: ["
	aStream nextPutAll: '[true] whileTrue: ['; lf; increaseIndent.

	"Per-iteration block: wrap in a PythonContinue handler so `continue`
	cleanly skips to the next iteration."
	aStream nextPutAll: '['; lf; increaseIndent.

	"Re-point ___curPos___ at the iterable before EVERY __next__: the body's own
	statements overwrite it as they run, so without this an exception from
	__next__ on the second or later iteration would be reported at whatever body
	statement ran last.  Costs one pointer store per iteration (literal array)."
	self ___emitIterPosOn: aStream.

	"Assign next item to target"
	isTupleTarget ifTrue: [
		"Tuple unpacking: item := iter __next__ (drain-guarded), then
		NORMALISED -- the per-element reads below go through __getitem__:,
		and CPython's UNPACK_SEQUENCE is defined by ITERATION, so an item
		that is not genuinely subscriptable is materialised through the
		iterator protocol first.  That is where its errors must come from:
		``async for i, j in badpairs()'' with an item whose __iter__ raises
		StopAsyncIteration(42) has to surface exactly that (test_coroutines'
		test_for_assign_raising_stop_async_iteration_2) -- and a DICT item
		now unpacks to its KEYS, as upstream, instead of two lookups."
		aStream nextPutAll: itemTemp; nextPutAll: ' := ';
			nextPutAll: (self ___drainGuardedStepFor___: iterTemp); nextPutAll: '.'; lf.
		aStream nextPutAll: itemTemp;
			nextPutAll: ' := PythonCoroutine @env0:___unpackNormalize___: ';
			nextPutAll: itemTemp; nextPutAll: '.'; lf.
		"Unpack each element, recursing into nested tuples like
		``for target, (action, param) in items``."
		self
			emitUnpackOn: aStream
			target: target
			source: itemTemp
			depth: depth.
	] ifFalse: [
		"Simple: target := iter __next__.  Phase A: when the target is
		a module-scope name (declared in body variables, not shadowed
		by an enclosing function), route the per-iteration binding
		through the module instance's dynamic-instVar storage.

		The step is drain-guarded but the STORE is not: a subscript or
		attribute target whose store raises the exhaustion exception must
		propagate it, not end the loop (test_for_assign_raising_stop_...)."
		self
			emitForTargetStore: target
			source: (self ___drainGuardedStepFor___: iterTemp)
			on: aStream.
	].

	"Body"
	body printSmalltalkOn: aStream.

	"Close per-iteration block + continue handler"
	aStream decreaseIndent; nextPutAll: '] @env0:on: PythonContinue do: [:___ex___ | nil].'; lf.

	"Close whileTrue:"
	aStream decreaseIndent; nextPutAll: '].'; lf.

	"Close inner block with the DRAIN handler only — PythonBreak propagates
	past this handler so the else clause is skipped.  PythonLoopDrained
	rather than StopIteration: only the STEP's exhaustion (re-signalled by
	___drainGuardedStepFor___:) ends the loop; a StopIteration raised by the
	iterable's __iter__, the target store, or the body propagates to the
	caller, as CPython's does."
	aStream decreaseIndent;
		nextPutAll: '] @env0:on: PythonLoopDrained do: [:___ex___ | nil].'; lf.

	"Else clause — runs only after a natural loop drain."
	hasElse ifTrue: [
		orelse printSmalltalkOn: aStream.
		aStream lf.
	].

	"Close outer block with PythonBreak handler."
	aStream decreaseIndent; nextPutAll: '] @env0:on: PythonBreak do: [:___ex___ | nil].'.
%

category: 'Grail-code generation'
method: ForAst
___emitIteratorFrom___: iterNode on: aStream
	"Emit the expression that turns the iterable into an ITERATOR.  Synchronous
	iteration sends __iter__ directly; AsyncForAst routes through a runtime
	helper that also raises CPython's TypeErrors.

	One of three hooks that are the ENTIRE difference between ``for'' and
	``async for'' -- the protocol differs, while break / continue / for-else /
	tuple unpacking / the PEP 657 position stores are identical and are shared
	rather than copied.  Duplicating printSmalltalkOn: for the async case would
	have forked a hundred lines of loop machinery over three strings, and every
	later fix to for-else or unpacking would have had to be made twice."

	iterNode printSmalltalkWithParenthesisOn: aStream.
	aStream nextPutAll: ' __iter__'
%

category: 'Grail-code generation'
method: ForAst
___drainGuardedStepFor___: iterTemp
	"The per-iteration step with CPython's exhaustion PLACEMENT: only a
	StopIteration (StopAsyncIteration for the async subclass, via the
	___exhaustedExceptionName___ hook) raised BY THE STEP ITSELF means the
	loop is drained.  It is rescued here, at the narrowest possible extent,
	and re-signalled as the internal PythonLoopDrained that the loop-level
	handler catches -- so the same exception raised by the target store or
	the body sails past that handler to the caller."

	^ '([' , (self ___nextExpressionFor___: iterTemp) , '] @env0:on: '
		, self ___exhaustedExceptionName___
		, ' do: [:___dx___ | PythonLoopDrained @env0:___signal___])'
%

category: 'Grail-code generation'
method: ForAst
___nextExpressionFor___: iterTemp
	"The Smalltalk expression that advances the iterator by one.  Synchronous
	iteration sends __next__; AsyncForAst AWAITS __anext__.  See
	___iterSelector___."

	^ iterTemp , ' __next__'
%

category: 'Grail-code generation'
method: ForAst
___exhaustedExceptionName___
	"The exception that means ``the iterator is drained'', caught on the inner
	handler so a natural drain runs the else clause while a break skips it.
	StopAsyncIteration for ``async for''.  See ___iterSelector___."

	^ 'StopIteration'
%

category: 'Grail-traceback'
method: ForAst
___emitIterPosOn: aStream
	"Store this loop's ITERABLE position into ___curPos___, so a traceback frame
	built while the iterator protocol runs carries PEP 657 columns and the source
	line rather than just the statement's line.

	CPython attributes an exception raised from a for loop's __init__ / __iter__ /
	__next__ to the ITERATOR EXPRESSION, not to the whole statement -- which is
	what test_iter's test_exception_locations checks:

	    f.line[f.colno - indent : f.end_colno - indent] == 'BrokenIter(...)'

	This is the for-statement twin of the wrapper ComprehensionAst already emits
	for a comprehension's iterable clause, but it needs no handler and no
	re-raise: TryAst's ___pushCatchingFrame___ already builds the frame from
	___curPos___, and ___pushFrameFromPos___ already understands the 5-element
	position array.  So the whole fix is pointing that existing read at a richer
	value -- no ``on: Exception'' around every loop, which would both cost a
	per-iteration handler and catch AlmostOutOfStack.

	No-op outside a function (module-level code has no ___curPos___ temp) or when
	the iterable carries no position -- the same guard ___emitCurPosBefore:on:
	uses."

	(CallAst functionBeingCompiled isNil or: [iter beginLine isNil])
		ifTrue: [^ self].
	self ___emitCurPosStore___: iter ___pyPositionLiteralArray on: aStream
%

category: 'Grail-code generation'
method: ForAst
emitForTargetStore: aNameAst source: sourceExpr on: aStream
	"Phase A: emit ``target := sourceExpr.'' OR
	``self @env0:dynamicInstVarAt: #'target' put: sourceExpr.''
	depending on whether the for-loop target is a module-scope name.
	sourceExpr is a raw Smalltalk fragment (already evaluated to the
	next iteration value), not parenthesized — wrap it here when the
	store needs the value as a keyword-message arg."

	"The target need not be a NAME: ``for h.slot in xs:'',
	``for d['k'] in xs:'' and ``for [a, b] in xs:'' are all legal Python,
	and printSmalltalkOn: routes every non-TupleAst target here.  Those
	shapes used to reach isModuleScopeForTarget:, which sends
	isModuleVariableName: -- a NameAst-only selector -- and died with a
	doesNotUnderstand at COMPILE time, taking the enclosing module with
	it.  Hand them to the shared store emitter."
	(aNameAst isKindOf: NameAst) ifFalse: [
		^ self ___emitTargetStore___: aNameAst from: sourceExpr on: aStream].

	(self isModuleScopeForTarget: aNameAst) ifTrue: [
		aStream
			nextPutAll: self ___moduleStoreReceiverExpr___;
			nextPutAll: ' @env0:dynamicInstVarAt: #''';
			nextPutAll: aNameAst id;
			nextPutAll: ''' put: (';
			nextPutAll: sourceExpr;
			nextPutAll: ').'; lf.
		^ self
	].
	"A ``for'' at CLASS-BODY level: CPython leaves the loop variable bound on
	the class when the loop finishes, and there is no block temp to bind here
	anyway -- ClassDefAst emits the statement straight into the class-build
	code, where ``i := ...'' is an undefined symbol.  Route it to the same
	per-class definitional store the body's assignments use."
	(self isClassBodyRuntimeForTarget: aNameAst) ifTrue: [
		aStream
			nextPutAll: CallAst classBodyRuntimeClass;
			nextPutAll: ' @env1:___classBodyDefinitionalStore___: #''';
			nextPutAll: aNameAst id;
			nextPutAll: ''' put: (';
			nextPutAll: sourceExpr;
			nextPutAll: ').'; lf.
		^ self
	].
	aStream
		nextPutAll: aNameAst id;
		nextPutAll: ' := ';
		nextPutAll: sourceExpr;
		nextPut: $.; lf.
%

category: 'Grail-code generation'
method: ForAst
isClassBodyRuntimeForTarget: aNameAst
	"True when this for-loop target is bound directly by a class body that
	ClassDefAst is emitting verbatim -- see CallAst >> classBodyRuntimeClass."

	(aNameAst isKindOf: NameAst) ifFalse: [^ false].
	^ self ___inClassBodyRuntimeScope___
%

category: 'Grail-code generation'
method: ForAst
isModuleScopeForTarget: aNameAst
	"True if this for-loop target is a module-scope name: we're
	compiling inside a module body (no enclosing user class method),
	the name is declared in the module body's scope, and no
	enclosing function shadows it."

	CallAst moduleClassBeingCompiled ifNil: [^ false].
	"``global x'' in the nearest enclosing function forces the module
	route -- even inside a class method (the emitters pick the module-
	instance receiver via ___moduleStoreReceiverExpr___) and past any
	enclosing-function shadow (Python: the declaration binds the name
	to the module for the whole declaring scope)."
	(aNameAst ___nearestEnclosingFunctionDeclaresGlobal___: aNameAst id)
		ifTrue: [^ true].
	CallAst classBeingCompiled ifNotNil: [^ false].
	(aNameAst isModuleVariableName: aNameAst id) ifFalse: [^ false].
	"PRECISE local-shadow check (writes + params; comprehension targets
	and global-declared names excluded) -- not the over-approximating
	___declaredInEnclosingFunction___: variables walk."
	(aNameAst ___pythonLocalInEnclosingFunctions___: aNameAst id) ifTrue: [^ false].
	^ true
%

category: 'Grail-code generation'
method: ForAst
emitUnpackOn: aStream target: aTarget source: sourceExpr depth: aDepth
	"Recursively unpack ``aTarget`` (a NameAst or a nested
	TupleAst / ListAst) by reading from the parenthesized
	Smalltalk expression ``sourceExpr``.  For a plain NameAst emit
	a single assignment; for a tuple-shaped target generate
	per-element ``__getitem__:`` reads, and recurse for nested
	tuples by reusing the wrapped subscript expression as the
	source.  Re-evaluates the subscript per name on each level —
	acceptable because the source is typically a fast indexable
	(tuple / list) and the alternative would require declaring
	fresh outer-block temps after the temp pane has been emitted."

	(aTarget isKindOf: NameAst) ifTrue: [
		self emitForTargetStore: aTarget source: sourceExpr on: aStream.
		^ self
	].
	((aTarget isKindOf: TupleAst) or: [aTarget isKindOf: ListAst]) ifTrue: [
		| n |
		n := aTarget elts size.
		aTarget elts doWithIndex: [:elt :i |
			| childExpr starIdx |
			(elt isKindOf: StarredAst) ifTrue: [
				"PEP 3132 star target — ``for head, *tail in ...''.
				The starred name takes the middle slice: everything
				from its position up to len - (elements after it).
				Emitted as a Python-level slice through __getitem__:
				with a slice object, so any sequence works."
				starIdx := i - 1.
				childExpr := '(list @env1:__new__: (' , sourceExpr ,
					' __getitem__: (slice @env1:__new__: ' , starIdx printString ,
					' _: ((' , sourceExpr , ' __len__) @env0:- ' ,
					(n - i) printString , '))))'.
				self
					emitUnpackOn: aStream
					target: elt value
					source: childExpr
					depth: aDepth
			] ifFalse: [
				| after |
				"Elements AFTER a star index from the sequence end."
				after := (aTarget elts copyFrom: 1 to: i - 1)
					anySatisfy: [:e | e isKindOf: StarredAst].
				childExpr := after
					ifTrue: ['(' , sourceExpr , ' __getitem__: ((' ,
						sourceExpr , ' __len__) @env0:- ' ,
						(n - i + 1) printString , '))']
					ifFalse: ['(' , sourceExpr , ' __getitem__: ' ,
						(i - 1) printString , ')'].
				self
					emitUnpackOn: aStream
					target: elt
					source: childExpr
					depth: aDepth
			]
		].
		^ self
	].
	"Attribute / subscript target -- ``for h.slot in xs:'' and
	``for d['k'] in xs:'' are legal Python.  This used to emit the target
	via its own printSmalltalkOn:, which asserts a LOAD context and so
	raised ``Expression Context should be <Load> but is <Store>'' at
	compile time, taking the whole enclosing module down.  Route it to the
	shared store emitter instead, the same one AssignAst and WithAst use."
	self ___emitTargetStore___: aTarget from: sourceExpr on: aStream.
	aStream lf
%
method: ForAst
target
	^target
%
method: ForAst
target: newValue
	target := newValue
%
method: ForAst
iter
	^iter
%
method: ForAst
iter: newValue
	iter := newValue
%
method: ForAst
body
	^body
%
method: ForAst
body: newValue
	body := newValue
%
method: ForAst
orelse
	^orelse
%
method: ForAst
orelse: newValue
	orelse := newValue
%
method: ForAst
type_comment
	^type_comment
%
method: ForAst
type_comment: newValue
	type_comment := newValue
%

category: 'Grail-IR Codegen'
method: ForAst
___irIterTempSymbol___
	"The per-depth iterator temp name, exactly as printSmalltalkOn: derives it
	(___iter0___, ___iter1___ inside a nested loop, ...)."

	| depth p |
	depth := 0.
	p := parent.
	[p notNil] whileTrue: [
		(p isKindOf: ForAst) ifTrue: [depth := depth + 1].
		p := p parent].
	^ ('___iter' , depth printString , '___') asSymbol
%

category: 'Grail-IR Codegen'
method: ForAst
___irEligibleStatementLocals___: localNames
	"A SYNC for with no else clause over a simple local Name target or a
	tuple / list of them (nested, no star -- see ___irForTargetEligible___:).
	AsyncForAst (a subclass -- its protocol differs in all three hooks) never
	qualifies.  for-else and module-scope targets stay on text.  A user local
	named like the iterator or item temp would collide with the method temp
	this emit registers (text uses a shadowing BLOCK temp), so such a def
	stays on text too."

	self class == ForAst ifFalse: [^ false].
	(orelse isNil or: [orelse size = 0]) ifFalse: [^ false].
	(self ___irForTargetEligible___: localNames) ifFalse: [^ false].
	(localNames includes: self ___irIterTempSymbol___ asString) ifTrue: [^ false].
	(iter ___irEligibleValueLocals___: localNames) ifFalse: [^ false].
	((body isKindOf: BlockAst) or: [body isKindOf: SuiteAst]) ifFalse: [^ false].
	^ body ___irEligibleStatementsWithLocals___: localNames
%

category: 'Grail-IR Codegen'
method: ForAst
___emitIRStatementOn___: aBuilder
	"printSmalltalkOn:'s exception-based loop for the simple-target, no-else
	case, shape for shape:

	  [[ ___iterN___ := (iter) __iter__.
	     [true] whileTrue: [
	       [ target := ([___iterN___ __next__]
	             @env0:on: StopIteration
	             do: [:___dx___ | PythonLoopDrained @env0:___signal___]).
	         body...
	       ] @env0:on: PythonContinue do: [:___ex___ | nil].
	     ].
	  ] @env0:on: PythonLoopDrained do: [:___ex___ | nil].
	  ] @env0:on: PythonBreak do: [:___ex___ | nil].

	Only the STEP's own StopIteration means drained (re-signalled as the
	internal PythonLoopDrained) -- one raised by the body sails past to the
	caller, exactly as in the text.  The iterator temp is a METHOD temp here
	(text uses a block temp): the name is depth-unique against nesting, reuse
	by a sibling loop is safe (assigned before use), and a user local of the
	same name was excluded by eligibility.  The text path's ___curPos___
	position stores are omitted -- an IR method derives positions natively
	from its step points, so the __iter__ / __next__ sends are stamped at the
	iterable's offset instead."

	| iterTempSym leaf outerBlk |
	iterTempSym := self ___irIterTempSymbol___.
	leaf := (aBuilder leafFor: iterTempSym)
		ifNil: [aBuilder tempNamed: iterTempSym].
	aBuilder at: self beginPosition.
	outerBlk := aBuilder inBlockDo: [
		| innerBlk |
		innerBlk := aBuilder inBlockDo: [
			| condBlk iterationBlk |
			aBuilder at: iter beginPosition.
			aBuilder add: (aBuilder assign: leaf from: (aBuilder
				send: #'__iter__'
				to: (iter ___emitIRValueOn___: aBuilder)
				with: { })).
			condBlk := aBuilder inBlockDo: [aBuilder add: aBuilder trueLit].
			iterationBlk := aBuilder inBlockDo: [
				| bodyBlk |
				bodyBlk := aBuilder inBlockDo: [
					| stepBlk drainHandler guarded |
					stepBlk := aBuilder inBlockDo: [
						aBuilder at: iter beginPosition.
						aBuilder add: (aBuilder
							send: #'__next__' to: (aBuilder var: leaf) with: { })].
					drainHandler := aBuilder blockWithArg: #'___dx___' do: [:dxLeaf |
						aBuilder add: (aBuilder
							send: #'___signal___'
							to: (aBuilder globalNamed: #PythonLoopDrained)
							with: { } env: 0)].
					guarded := aBuilder
						send: #on:do:
						to: stepBlk
						with: { aBuilder globalNamed: #StopIteration. drainHandler }
						env: 0.
					aBuilder at: target beginPosition.
					self ___emitIRTargetBindFrom___: guarded on: aBuilder.
					body ___emitIRStatementsOn___: aBuilder].
				aBuilder add: (aBuilder
					send: #on:do:
					to: bodyBlk
					with: { aBuilder globalNamed: #PythonContinue.
						aBuilder handlerBlockNamed: #'___ex___' }
					env: 0)].
			aBuilder add: (aBuilder whileTrue: condBlk do: iterationBlk)].
		aBuilder add: (aBuilder
			send: #on:do:
			to: innerBlk
			with: { aBuilder globalNamed: #PythonLoopDrained.
				aBuilder handlerBlockNamed: #'___ex___' }
			env: 0)].
	aBuilder add: (aBuilder
		send: #on:do:
		to: outerBlk
		with: { aBuilder globalNamed: #PythonBreak.
			aBuilder handlerBlockNamed: #'___ex___' }
		env: 0).
	^ self
%

category: 'Grail-IR Codegen'
method: ForAst
___irReadLocalNamesInto___: aSet locals: localSet
	"The body's reads of the loop TARGET names are satisfied by the per-
	iteration step store, so they impose no bound-before obligation; every
	other read does.  The target itself contributes no binding visible after
	the loop (a zero-trip loop leaves it unbound)."

	| sub names |
	iter ___irReadLocalNamesInto___: aSet locals: localSet.
	sub := Set new.
	body ___irReadLocalNamesInto___: sub locals: localSet.
	names := self ___irTargetNames___: localSet.
	sub do: [:r | (names includes: r) ifFalse: [aSet add: r]].
	^ self
%

category: 'Grail-IR Codegen'
method: ForAst
___irWriteLocalNamesInto___: aSet locals: localSet
	"Body writes must be pre-bound like any nested write -- except the loop
	target names, whose write/read pair is self-contained within an iteration."

	| sub names |
	sub := Set new.
	body ___irWriteLocalNamesInto___: sub locals: localSet.
	names := self ___irTargetNames___: localSet.
	sub do: [:w | (names includes: w) ifFalse: [aSet add: w]].
	^ self
%

category: 'Grail-IR Codegen'
method: ForAst
___irFlowBound___: boundIn locals: localSet
	"The iterable's reads must be bound; the body walks from boundIn plus the
	loop target names, which the step store binds before every iteration.  A
	zero-trip loop binds nothing, so the set after the loop is the set before
	it."

	| entry |
	(self ___irFlowReadsBound___: iter in: boundIn locals: localSet)
		ifFalse: [^ nil].
	entry := boundIn copy.
	(self ___irTargetNames___: localSet) do: [:n | entry add: n].
	(body ___irFlowBound___: entry locals: localSet) isNil ifTrue: [^ nil].
	^ boundIn
%

category: 'Grail-IR Codegen'
method: ForAst
___irItemTempSymbol___
	"The per-depth item temp a tuple target unpacks from, exactly as
	printSmalltalkOn: derives it (___item0___, ___item1___ nested, ...)."

	| depth p |
	depth := 0.
	p := parent.
	[p notNil] whileTrue: [
		(p isKindOf: ForAst) ifTrue: [depth := depth + 1].
		p := p parent].
	^ ('___item' , depth printString , '___') asSymbol
%

category: 'Grail-IR Codegen'
method: ForAst
___irForTargetEligible___: localNames
	"A Store-context local Name, or a tuple / list nest of them -- nested
	tuples allowed, a STAR not (the text's star shape needs a Smalltalk
	arithmetic send the IR emit does not yet make) -- with the item temp free."

	((target isKindOf: TupleAst) or: [target isKindOf: ListAst]) ifTrue: [
		(self ___irForTupleTargetEligible___: target locals: localNames) ifFalse: [^ false].
		^ (localNames includes: self ___irItemTempSymbol___ asString) not].
	(target isKindOf: NameAst) ifFalse: [^ false].
	((target ctx) isKindOf: StoreAst) ifFalse: [^ false].
	^ localNames includes: target id asString
%

category: 'Grail-IR Codegen'
method: ForAst
___irForTupleTargetEligible___: aTarget locals: localNames
	aTarget elts isNil ifTrue: [^ false].
	^ aTarget elts allSatisfy: [:e |
		((e isKindOf: TupleAst) or: [e isKindOf: ListAst])
			ifTrue: [self ___irForTupleTargetEligible___: e locals: localNames]
			ifFalse: [(e isKindOf: NameAst)
				and: [((e ctx) isKindOf: StoreAst)
				and: [localNames includes: e id asString]]]]
%

category: 'Grail-IR Codegen'
method: ForAst
___irTargetNames___: localSet
	"The local names the loop target binds each iteration (Strings)."

	| names |
	names := Set new.
	self ___irUnpackLeafNamesInto___: names target: target locals: localSet.
	^ names
%

category: 'Grail-IR Codegen'
method: ForAst
___emitIRTargetBindFrom___: stepNode on: aBuilder
	"Bind the loop target from the drain-guarded step.  A Name: ``target :=
	step''.  A tuple / list: printSmalltalkOn:'s tuple branch --
	  ___itemN___ := step.
	  ___itemN___ := PythonCoroutine @env0:___unpackNormalize___: ___itemN___.
	then one ``name := (src __getitem__: i)'' per leaf, a nested tuple reading
	its own elements off the parenthesised subscript re-evaluated per leaf
	(emitUnpackOn:target:source:depth:)."

	| itemSym itemLeaf |
	(target isKindOf: NameAst) ifTrue: [
		^ aBuilder add: (aBuilder
			assign: (aBuilder leafFor: target id asSymbol) from: stepNode)].
	itemSym := self ___irItemTempSymbol___.
	itemLeaf := (aBuilder leafFor: itemSym) ifNil: [aBuilder tempNamed: itemSym].
	aBuilder add: (aBuilder assign: itemLeaf from: stepNode).
	aBuilder add: (aBuilder assign: itemLeaf from: (aBuilder
		send: #'___unpackNormalize___:' to: (aBuilder globalNamed: #PythonCoroutine)
		with: { aBuilder var: itemLeaf } env: 0)).
	self ___emitIRForUnpack___: target source: [aBuilder var: itemLeaf] on: aBuilder
%

category: 'Grail-IR Codegen'
method: ForAst
___emitIRForUnpack___: aTarget source: aSourceBlock on: aBuilder
	"emitUnpackOn:target:source:depth:'s no-star shapes.  aSourceBlock answers
	a FRESH node for the source expression on each call: IR nodes cannot be
	shared between sends, and the text re-evaluates the subscript per leaf."

	(aTarget isKindOf: NameAst) ifTrue: [
		^ aBuilder add: (aBuilder
			assign: (aBuilder leafFor: aTarget id asSymbol) from: aSourceBlock value)].
	aTarget elts doWithIndex: [:elt :i |
		self ___emitIRForUnpack___: elt
			source: [aBuilder
				send: #'__getitem__:' to: aSourceBlock value
				with: { aBuilder obj: i - 1 }]
			on: aBuilder]
%

category: 'Grail-IR Codegen'
method: ForAst
___irRefusalDetail___: localSet
	self class == ForAst ifFalse: [^ #'ForAst:async'].
	(orelse notNil and: [orelse size > 0]) ifTrue: [^ #'ForAst:else'].
	((target isKindOf: TupleAst) or: [target isKindOf: ListAst]) ifTrue: [^ #'ForAst:tupleTargetShape'].
	(target isKindOf: NameAst) ifFalse: [^ ('ForAst:target-' , target class name asString) asSymbol].
	^ #'ForAst:other'
%
