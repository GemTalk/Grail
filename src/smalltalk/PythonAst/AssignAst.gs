! ------------------- Superclass check
run
StatementAst ifNil: [self error: 'StatementAst is not defined. Check file ordering.'].
%

! ------------------- Class definition for AssignAst
expectvalue /Class
doit
StatementAst subclass: 'AssignAst'
  instVarNames: #( targets value type_comment)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonAst
  options: #()

%

expectvalue /Class
doit
AssignAst comment:
'https://docs.python.org/3/library/ast.html#ast.Assign

An assignment.

targets is a list of nodes (Name, Tuple, List, Attribute, or Subscript).
value is a single node.

Example:
>>> print(ast.dump(ast.parse(''x = y = z = 1''), indent=4))
Module(
    body=[
        Assign(
            targets=[Name(id=''x'', ctx=Store()), Name(id=''y'', ctx=Store()), Name(id=''z'', ctx=Store())],
            value=Constant(value=1))])

Hierarchy:
Object
  AbstractNode(parent)
    AbstractLocationNode(beginLine beginColumn endLine endColumn)
      StatementAst
        AssignAst(targets value type_comment)'
%

expectvalue /Class
doit
AssignAst category: 'Grail-Parser'
%

! ------------------- Remove existing behavior from AssignAst
removeallmethods AssignAst
removeallclassmethods AssignAst

set compile_env: 0

category: 'Grail-Class Body'
method: AssignAst
classBodyAttributePairs
	"``name -> valueAst'' pairs for an assignment written in a CLASS BODY.

	Every target that is a bare NameAst yields a pair; a chained
	``A = B = expr'' yields one pair per target, all pointing at the SAME
	value AST (ClassDefAst emits that value once and aliases the rest).
	Attribute and subscript targets bind nothing on the class, so a
	statement with any such target contributes nothing.

	Sibling-method aliases (``__lt__ = __eq__'') are deliberately NOT
	filtered here: which names are aliases is cross-statement knowledge, so
	ClassDefAst applies that rule to the collected pairs."

	| pairs |
	pairs := OrderedCollection new.
	(targets allSatisfy: [:t | t isKindOf: NameAst]) ifTrue: [
		targets do: [:t | pairs add: t id asSymbol -> value]].
	"Tuple-target class-body assignment: ``__add__, __radd__ =
	_operator_fallbacks(_add, operator.add)'' (vendored fractions.py builds
	every binary operator this way).  Each element becomes a class attribute
	whose value is a synthetic ``<value>[i]'' subscript.  The RHS
	re-evaluates once per element -- acceptable for the factory-call idiom
	(each call returns an equivalent fresh tuple)."
	((targets size = 1)
		and: [(targets first isKindOf: TupleAst)
		and: [targets first elts allSatisfy: [:e | e isKindOf: NameAst]]]) ifTrue: [
		targets first elts doWithIndex: [:e :i |
			pairs add: e id asSymbol -> (SubscriptAst new
					value: value;
					slice: (ConstantAst new
							value: i - 1;
							kind: nil;
							yourself);
					ctx: LoadAst basicNew;
					yourself)]].
	^ pairs
%

category: 'Grail-other'
method: AssignAst
printSmalltalkOn: aStream
	"Emit a Python assignment.  Python supports chained assignment
	``a = b = c = expr`` where every target receives the same value,
	evaluated once.  Smalltalk's `a := b := expr` IS chained at the
	syntactic level too, but only NameAst targets fit that form —
	AttributeAst/SubscriptAst/TupleAst targets each need their own
	statement.  Handle the chain by binding `value` to a temp once,
	then assigning each target from that temp."

	| tgt |
	targets size = 1 ifTrue: [
		tgt := targets first.
		(tgt isKindOf: AttributeAst) ifTrue: [
			^self printSmalltalkAttributeStoreOn: aStream target: tgt.
		].
		(tgt isKindOf: SubscriptAst) ifTrue: [
			^self printSmalltalkSubscriptStoreOn: aStream target: tgt.
		].
		(tgt isKindOf: TupleAst) ifTrue: [
			^self printSmalltalkTupleStoreOn: aStream target: tgt.
		].
		(tgt isKindOf: ListAst) ifTrue: [
			^self printSmalltalkTupleStoreOn: aStream target: tgt.
		].
		((tgt isKindOf: NameAst) and: [self isModuleScopeStoreTarget: tgt])
			ifTrue: [
				^ self printSmalltalkModuleStoreOn: aStream target: tgt
			].
		"``nonlocal x; x = v'' inside a class METHOD: x is an enclosing-function
		local reached past the class, so the method must write it through its
		setter closure cell (``___cellSetter_x___'', emitted by ClassDefAst) --
		a bare ``x := v'' would bind a fresh undeclared temp.  Mirrors the
		AugAssignAst closure-cell branch."
		((tgt isKindOf: NameAst)
			and: [CallAst classBeingCompiled notNil
			and: [CallAst inClassBodyValueEmit ~~ true
			and: [CallAst inBasesEmit ~~ true
			and: [tgt ___enclosingFunctionLocalBeyondClass___: tgt id]]]]) ifTrue: [
				CallAst addCapturedWriteName: tgt id.
				aStream
					nextPutAll: '(self @env1:___classCellSetter___: #''___cellSetter_';
					nextPutAll: tgt id;
					nextPutAll: '___'') value: '.
				value printSmalltalkWithParenthesisOn: aStream.
				aStream nextPut: $..
				^ self
			].
		"A bare NAME bound by a class-body ``try'' / ``for'' / ``while'' /
		``with'' (emitted verbatim by ClassDefAst).  CPython runs the statement
		at class-definition time, so the binding is a CLASS ATTRIBUTE; a plain
		``x := v'' here would bind an undeclared block temp and vanish with the
		statement.  Route it to the same definitional store a class-body ``if''
		branch uses."
		((tgt isKindOf: NameAst) and: [self isClassBodyRuntimeStoreTarget: tgt])
			ifTrue: [
				^ self printSmalltalkClassBodyRuntimeStoreOn: aStream target: tgt
			].
		tgt printSmalltalkOn: aStream.
		aStream nextPutAll: ' := '.
		value printSmalltalkOn: aStream.
		aStream nextPut: $..
		^self
	].
	"Chained assignment: `a = b = c = value` — bind once, assign to each."
	aStream nextPutAll: '[| ___chain___ | ___chain___ := '.
	value printSmalltalkWithParenthesisOn: aStream.
	aStream nextPutAll: '. '.
	targets do: [:eachTgt |
		(eachTgt isKindOf: AttributeAst) ifTrue: [
			"Chained ``...X = rest = value'' attribute store: write straight
			to dynamicInstVarAt:put: for both self and foreign-receiver
			targets — mirrors single-target's bypass of the ``attr:''
			setter dispatch (see printSmalltalkAttributeStoreOn:)."
			((eachTgt value isKindOf: NameAst)
				and: [(CallAst isSelfReference: eachTgt value id)
					and: [(eachTgt value ___boundInNestedFunction___: eachTgt value id) not]])
				ifTrue: [
					"Slot attribute -> direct named-instVar write; else the
					instances dynamic-instVar storage (as before)."
					((CallAst classSlotNames notNil)
						and: [CallAst classSlotNames includes: eachTgt attr asSymbol])
						ifTrue: [
							aStream
								nextPutAll: '___slot_';
								nextPutAll: eachTgt attr;
								nextPutAll: '___ := ___chain___. '
						] ifFalse: [
							aStream
								nextPutAll: 'self @env0:dynamicInstVarAt: #''';
								nextPutAll: eachTgt attr;
								nextPutAll: ''' put: ___chain___. '
						]
				]
				ifFalse: [
					eachTgt value printSmalltalkWithParenthesisOn: aStream.
					aStream nextPutAll: ' @env1:__setattr__: '''; nextPutAll: eachTgt attr;
						nextPutAll: ''' _: ___chain___. '
				]
		] ifFalse: [
			(eachTgt isKindOf: SubscriptAst) ifTrue: [
				eachTgt value printSmalltalkWithParenthesisOn: aStream.
				aStream nextPutAll: ' __setitem__: '.
				eachTgt slice printSmalltalkWithParenthesisOn: aStream.
				aStream nextPutAll: ' _: ___chain___. '
			] ifFalse: [
				((eachTgt isKindOf: TupleAst) or: [eachTgt isKindOf: ListAst]) ifTrue: [
					"Chained tuple-unpack target (``ka, va = ta = expr'',
					test_dict's test_popitem): unpack from the chain temp via
					the nested-target branch of the shared per-element
					emitter -- which now routes through
					emitUnpackCoercionAndStoresOn:, so a chained target gets
					the same iterable coercion, value-count check and STAR
					support as any other (``a, *b = c = [1, 2, 3]'' used to
					emit a *-unpack TypeError signal into the left-hand
					side)."
					self emitTupleElementStoreOn: aStream target: eachTgt
						holder: '___chain___' indexExpr: nil directRhs: '___chain___'
				] ifFalse: [
				"Plain NameAst."
				((eachTgt isKindOf: NameAst)
					and: [self isModuleScopeStoreTarget: eachTgt])
					ifTrue: [
						aStream nextPutAll: 'self @env0:dynamicInstVarAt: #''';
							nextPutAll: eachTgt id;
							nextPutAll: ''' put: ___chain___. '
					]
					ifFalse: [
						"Chained twin of the single-target class-body runtime
						store (``a = b = expr'' inside a class-body try/for/
						while), from the shared chain temp."
						(self isClassBodyRuntimeStoreTarget: eachTgt)
							ifTrue: [
								aStream nextPutAll: CallAst classBodyRuntimeClass;
									nextPutAll: ' @env1:___classBodyDefinitionalStore___: #''';
									nextPutAll: eachTgt id;
									nextPutAll: ''' put: ___chain___. '
							]
							ifFalse: [
								eachTgt printSmalltalkOn: aStream.
								aStream nextPutAll: ' := ___chain___. '
							]
					]
				]
			]
		]
	].
	aStream nextPutAll: '] value.'.
%

category: 'Grail-other'
method: AssignAst
isModuleScopeStoreTarget: aNameAst
	"Phase A: true if this assignment target is a module-scope name —
	i.e. we're compiling inside a module body or top-level def (not a
	user class method), and the name was declared in the module body's
	scope (parser-recorded into ``CallAst moduleVariableNames''), and
	no enclosing function shadows it as a local."

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

category: 'Grail-Class Body'
method: AssignAst
isClassBodyRuntimeStoreTarget: aNameAst
	"True when this bare-NAME target is bound directly by a class-body
	COMPOUND statement that ClassDefAst is emitting verbatim (``try'' /
	``for'' / ``while'' / ``with'' -- see CallAst >> classBodyRuntimeClass).
	Such a binding is a class attribute, not a block temp."

	(aNameAst isKindOf: NameAst) ifFalse: [^ false].
	^ self ___inClassBodyRuntimeScope___
%

category: 'Grail-Class Body'
method: AssignAst
printSmalltalkClassBodyRuntimeStoreOn: aStream target: tgt
	"Emit ``<Cls> ___classBodyDefinitionalStore___: #name put: value'' for a
	name bound by a class-body try/for/while/with."

	aStream nextPutAll: CallAst classBodyRuntimeClass;
		nextPutAll: ' @env1:___classBodyDefinitionalStore___: #''';
		nextPutAll: tgt id;
		nextPutAll: ''' put: '.
	value printSmalltalkWithParenthesisOn: aStream.
	aStream nextPut: $.
%

category: 'Grail-other'
method: AssignAst
printSmalltalkModuleStoreOn: aStream target: tgt
	"Phase A: emit a module-global write as
	``self dynamicInstVarAt: #name put: value''.  Inside the module
	body's initialize method (and inside a top-level def compiled as
	an env-1 method on the module class), ``self'' IS the module
	instance, so the store lands in the canonical dynamic-instVar
	storage that NameAst loads probe."

	aStream nextPutAll: self ___moduleStoreReceiverExpr___;
		nextPutAll: ' @env0:dynamicInstVarAt: #''';
		nextPutAll: tgt id;
		nextPutAll: ''' put: '.
	value printSmalltalkWithParenthesisOn: aStream.
	aStream nextPut: $..
%

category: 'other'
method: AssignAst
printSmalltalkTupleStoreOn: aStream target: tgt
	"Tuple/list unpacking assignment: `a, b, c = expr`.  Bind `expr`
	to a temp, then unpack into each name via __getitem__.  Also
	handles a single starred target (`a, *b, c = expr`): items before
	the star bind to positive indices counting from 0, the starred
	target binds to a slice covering the middle, and items after the
	star bind to negative indices counting from the end."

	| holder |
	holder := '___unpack___'.
	aStream nextPutAll: '[| '; nextPutAll: holder; nextPutAll: ' | '; nextPutAll: holder; nextPutAll: ' := '.
	value printSmalltalkWithParenthesisOn: aStream.
	self emitUnpackCoercionAndStoresOn: aStream elts: tgt elts holder: holder.
	aStream nextPutAll: '] value.'
%

category: 'other'
method: AssignAst
emitUnpackCoercionAndStoresOn: aStream elts: elts holder: holder
	"Shared tail of EVERY tuple/list unpack -- the top-level target and each
	nested one.  The caller has just written ``holder := <rhs>'' and left the
	statement open; append the iterable coercion + value-count check that
	closes it, then one store per target element.

	Factored out because the nested path used to do neither: it bound the
	inner holder straight to ``outer __getitem__: i'' and indexed that, so
	``(a, b), (c,) = IteratingSequenceClass(2), {42: 24}'' (test_iter
	test_unpack_iter) raised ``not subscriptable'' on an iterable that has
	__iter__ but no __getitem__, a nested target could not raise ValueError
	for the wrong number of values, and a nested STAR target did not compile
	at all -- StarredAst fell through to the plain-expression printer, which
	emits a ``*-unpack in call sites is not yet supported'' TypeError signal
	into the left-hand side of an assignment, a CompileError that took the
	whole enclosing module down with it.  A nested target is entitled to
	exactly the semantics of an outer one, so it now runs the same code."

	| starIdx nBefore hasStar nAfter |
	starIdx := elts findFirst: [:e | e isKindOf: StarredAst].
	hasStar := starIdx ~= 0.
	nBefore := hasStar ifTrue: [starIdx - 1] ifFalse: [elts size].
	nAfter := hasStar ifTrue: [elts size - starIdx] ifFalse: [0].
	"___unpackSequence___: sequences answer themselves (Object default);
	iterables WITHOUT positional __getitem__ (enum classes: `R, W, X =
	Perm`) materialize their iteration order as an indexable list --
	CPython unpacks via __iter__, this codegen indexes.  ___unpackCheck___
	then enforces CPython's value count (ValueError on too few / too many)."
	aStream nextPutAll: ' ___unpackSequence___ ___unpackCheck___: ';
		nextPutAll: nBefore printString;
		nextPutAll: ' star: '; nextPutAll: (hasStar ifTrue: ['true'] ifFalse: ['false']);
		nextPutAll: ' after: '; nextPutAll: nAfter printString; nextPutAll: '. '.
	starIdx = 0 ifTrue: [
		elts doWithIndex: [:elt :i |
			self
				emitTupleElementStoreOn: aStream
				target: elt
				holder: holder
				indexExpr: (i - 1) printString
		].
	] ifFalse: [
		elts doWithIndex: [:elt :i |
			i < starIdx ifTrue: [
				"Before the star — positive index from start."
				self
					emitTupleElementStoreOn: aStream
					target: elt
					holder: holder
					indexExpr: (i - 1) printString
			] ifFalse: [(i = starIdx)
				ifTrue: [
					"Star itself: slice from current index to (size-after-star) before end."
					| afterCount sliceExpr |
					afterCount := elts size - i.
					sliceExpr := holder , ' ___getslice___: ' , (i - 1) printString , ' _: '
						, (afterCount = 0 ifTrue: ['nil'] ifFalse: ['-' , afterCount printString])
						, ' _: nil'.
					self
						emitTupleElementStoreOn: aStream
						target: elt value
						holder: holder
						indexExpr: nil
						directRhs: sliceExpr
				] ifFalse: [
					"After the star — negative index from end."
					| offsetFromEnd |
					offsetFromEnd := elts size - i + 1.
					self
						emitTupleElementStoreOn: aStream
						target: elt
						holder: holder
						indexExpr: '-' , offsetFromEnd printString
				]
			].
		].
	]
%

category: 'other'
method: AssignAst
emitTupleElementStoreOn: aStream target: aTarget holder: holder indexExpr: indexExpr
	"Convenience entry for the regular (non-star) per-element store
	— builds the holder __getitem__: <index> RHS."

	^ self
		emitTupleElementStoreOn: aStream
		target: aTarget
		holder: holder
		indexExpr: indexExpr
		directRhs: nil
%

category: 'other'
method: AssignAst
emitTupleElementStoreOn: aStream target: aTarget holder: holder indexExpr: indexExpr directRhs: directRhs
	"Emit a single target's store inside a tuple-unpack.  Handles
	NameAst (plain assignment), AttributeAst (env-1 setter or
	classmethod self-ref instVar write), SubscriptAst
	(``obj[i] = ...``), and nested Tuple/List targets (recurse).

	``directRhs`` is a pre-built Smalltalk source expression used
	for the star-slice path; when nil, the RHS is
	``holder __getitem__: indexExpr``."

	| rhs |
	rhs := directRhs ifNil: [holder , ' __getitem__: ' , indexExpr].
	(aTarget isKindOf: AttributeAst) ifTrue: [
		"obj.attr = rhs (per-element store inside a tuple unpack) —
		route through ``__setattr__:_:'' (both self and foreign receivers)
		so @property setters fire.  Object>>__setattr__:_: detects the
		paired getter+setter at runtime and dispatches to the setter;
		otherwise falls through to dynamic-instVar storage."
		((aTarget value isKindOf: NameAst)
			and: [(CallAst isSelfReference: aTarget value id)
				and: [(aTarget value ___boundInNestedFunction___: aTarget value id) not]]) ifTrue: [
			"Slot attribute → assign the mangled instVar directly by bare name."
			((CallAst classSlotNames notNil)
				and: [CallAst classSlotNames includes: aTarget attr asSymbol]) ifTrue: [
				aStream
					nextPutAll: '___slot_';
					nextPutAll: aTarget attr;
					nextPutAll: '___ := (';
					nextPutAll: rhs;
					nextPutAll: '). '.
				^ self
			].
			aStream
				nextPutAll: 'self @env1:__setattr__: ''';
				nextPutAll: aTarget attr;
				nextPutAll: ''' _: (';
				nextPutAll: rhs;
				nextPutAll: '). '.
			^ self
		].
		aTarget value printSmalltalkWithParenthesisOn: aStream.
		aStream
			nextPutAll: ' @env1:__setattr__: ''';
			nextPutAll: aTarget attr;
			nextPutAll: ''' _: (';
			nextPutAll: rhs;
			nextPutAll: '). '.
		^ self
	].
	(aTarget isKindOf: SubscriptAst) ifTrue: [
		"obj[idx] = rhs — __setitem__:_: dispatch."
		aTarget value printSmalltalkWithParenthesisOn: aStream.
		aStream nextPutAll: ' __setitem__: '.
		aTarget slice printSmalltalkWithParenthesisOn: aStream.
		aStream nextPutAll: ' _: ('; nextPutAll: rhs; nextPutAll: '). '.
		^ self
	].
	((aTarget isKindOf: TupleAst) or: [aTarget isKindOf: ListAst]) ifTrue: [
		"Nested unpacking: recurse using a fresh holder, through the SAME
		coercion + value-count + star emitter the top-level target uses.
		The RHS is parenthesized because it is a keyword message
		(``holder __getitem__: 0''), and ___unpackSequence___ is unary."
		| nestedHolder |
		nestedHolder := holder , '_n'.
		aStream nextPutAll: '[| '; nextPutAll: nestedHolder; nextPutAll: ' | ';
			nextPutAll: nestedHolder; nextPutAll: ' := ('; nextPutAll: rhs; nextPutAll: ')'.
		self emitUnpackCoercionAndStoresOn: aStream elts: aTarget elts holder: nestedHolder.
		aStream nextPutAll: '] value. '.
		^ self
	].
	"Default: NameAst / starred wrapper — bare assignment OR Phase A
	module-scope dynamicInstVarAt:put: when the target is a module
	global."
	((aTarget isKindOf: NameAst) and: [self isModuleScopeStoreTarget: aTarget])
		ifTrue: [
			aStream
				nextPutAll: 'self @env0:dynamicInstVarAt: #''';
				nextPutAll: aTarget id;
				nextPutAll: ''' put: (';
				nextPutAll: rhs;
				nextPutAll: '). '.
			^ self
		].
	aTarget printSmalltalkOn: aStream.
	aStream nextPutAll: ' := '; nextPutAll: rhs; nextPutAll: '. '
%

category: 'Grail-other'
method: AssignAst
printSmalltalkAttributeStoreOn: aStream target: tgt
	"Generate attribute store.

	Python's data model: ``obj.attr = value'' writes via
	``type(obj).__setattr__(obj, 'attr', value)'', which by default
	stores into the instance dict.  A regular class method named
	``attr'' is NOT a data descriptor — the store does NOT dispatch
	to it; subsequent reads see the instance attribute shadowing the
	method.

	So: BOTH the ``self.attr = ...'' and the foreign-receiver
	``obj.attr = ...'' cases write straight to dynamicInstVarAt:put:.
	The presence of an ``attr:'' selector on the class is irrelevant
	to the store path (it remains relevant to call sites that send
	``obj attr: x'' directly via Smalltalk-style keyword)."

	"``obj.__class__ = NewClass'' reassigns the object's Python type.  Route
	through ``object ___pyChangeClassOf: <target> to: <value>'' -- which holds
	the target only as an ARGUMENT -- instead of ``<target> __setattr__:''; the
	latter would pin the target on the stack as ``self'', and GemStone's
	changeClassTo: refuses an object that is self on the stack
	(rtErrCantBecomeSelfOnStack; test_sort test_unsafe_object_compare's mid-sort
	``elem.__class__ = ...'').  A self-reference target (``self.__class__ = ...'')
	keeps the default path -- it is self on the stack no matter how it is
	spelled, so the rename cannot help it."
	(tgt attr asString = '__class__'
		and: [((tgt value isKindOf: NameAst)
			and: [CallAst isSelfReference: tgt value id]) not]) ifTrue: [
		aStream nextPutAll: 'object @env1:___pyChangeClassOf: ('.
		tgt value printSmalltalkWithParenthesisOn: aStream.
		aStream nextPutAll: ') to: ('.
		value printSmalltalkWithParenthesisOn: aStream.
		aStream nextPutAll: '). '.
		^ self
	].
	((tgt value isKindOf: NameAst)
		and: [(CallAst isSelfReference: tgt value id)
		and: [(tgt value ___boundInNestedFunction___: tgt value id) not]]) ifTrue: [
		"Slot attribute (Python __slots__ → GemStone named instVar): assign
		the mangled instVar directly by bare name (this method compiles on
		the slotted class), bypassing the generic store path."
		((CallAst classSlotNames notNil)
			and: [CallAst classSlotNames includes: tgt attr asSymbol]) ifTrue: [
			aStream nextPutAll: '___slot_'.
			aStream nextPutAll: tgt attr.
			aStream nextPutAll: '___ := '.
			value printSmalltalkWithParenthesisOn: aStream.
			aStream nextPut: $..
			^self
		].
		"Route through ``__setattr__:_:`` so @property setters fire when
		the class has a paired getter+setter (data-descriptor) for this
		attribute name.  Object>>__setattr__:_: detects the pair at
		runtime via ``whichClassIncludesSelector:'' and dispatches to the
		setter; otherwise falls through to the polymorphic
		``___pyAttrStore___:put:'' helper that writes to dynamic-instVar
		storage.  Foreign-receiver stores already use this entry point
		(see printSmalltalkAttributeStoreOn: foreign branch + the
		tuple-unpack path); aligning the self branch removes the
		asymmetric ``self.attr = x'' bypass.  Pre-fix, werkzeug.test
		EnvironBuilder's ``self.base_url = base_url'' silently skipped
		the @base_url.setter, leaving script_root / host / url_scheme
		unset."
		aStream nextPutAll: 'self @env1:__setattr__: '''.
		aStream nextPutAll: tgt attr.
		aStream nextPutAll: ''' _: '.
		value printSmalltalkWithParenthesisOn: aStream.
		aStream nextPut: $..
		^self
	].
	"Foreign receiver: route through Python's ``__setattr__'' protocol
	so user overrides intercept the store (validation, conversion,
	audit, etc. — see AttributeProtocolTestCase).  Default
	``object>>__setattr__:_:'' falls through to the polymorphic
	``___pyAttrStore___:put:'' helper (instance → dynamicInstVarAt:put:;
	class → env-1 class-side setter).

	The attribute name is passed as a Smalltalk String (Python ``str''),
	NOT a Symbol — user overrides typically compare with
	``name == 'fahrenheit''' which is str-vs-str in Python, and a
	Symbol receiver would fail that ``__eq__'' check."
	tgt value printSmalltalkWithParenthesisOn: aStream.
	aStream nextPutAll: ' @env1:__setattr__: '''.
	aStream nextPutAll: tgt attr.
	aStream nextPutAll: ''' _: '.
	value printSmalltalkWithParenthesisOn: aStream.
	aStream nextPut: $..
%

category: 'Grail-other'
method: AssignAst
printSmalltalkSubscriptStoreOn: aStream target: tgt
	"Generate: obj __setitem__: slice _: value."

	tgt value printSmalltalkWithParenthesisOn: aStream.
	aStream nextPutAll: ' __setitem__: '.
	tgt slice printSmalltalkWithParenthesisOn: aStream.
	aStream nextPutAll: ' _: '.
	value printSmalltalkWithParenthesisOn: aStream.
	aStream nextPut: $..
%

category: 'Grail-other'
method: AssignAst
target

	^targets at: 1
%

category: 'Grail-accessing'
method: AssignAst
targets

	^targets
%

category: 'Grail-accessing'
method: AssignAst
value

	^value
%

category: 'Grail-Class Body'
method: AssignAst
___boundTargetNames___
	"Symbols bound by this assignment's simple Name targets (tuple
	targets contribute each element).  Used by ClassDefAst's source-
	order class-body name resolution."

	| names |
	names := OrderedCollection new.
	targets do: [:tgt |
		(tgt isKindOf: NameAst) ifTrue: [names add: tgt id asSymbol].
		((tgt isKindOf: TupleAst) or: [tgt isKindOf: ListAst]) ifTrue: [
			tgt elts do: [:e |
				(e isKindOf: NameAst) ifTrue: [names add: e id asSymbol]]]].
	^ names
%
method: AssignAst
targets: newValue
	targets := newValue
%
method: AssignAst
value: newValue
	value := newValue
%
method: AssignAst
type_comment
	^type_comment
%
method: AssignAst
type_comment: newValue
	type_comment := newValue
%
