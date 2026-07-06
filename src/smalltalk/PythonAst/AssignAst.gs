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

category: 'Grail-other'
method: AssignAst
addVariableNamesTo: aStream

	targets do: [:each | 
		each addVariableNamesTo: aStream.
	].
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
				and: [CallAst isSelfReference: eachTgt value id])
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
				"Plain NameAst (or TupleAst/ListAst — rare chained with tuples)."
				((eachTgt isKindOf: NameAst)
					and: [self isModuleScopeStoreTarget: eachTgt])
					ifTrue: [
						aStream nextPutAll: 'self @env0:dynamicInstVarAt: #''';
							nextPutAll: eachTgt id;
							nextPutAll: ''' put: ___chain___. '
					]
					ifFalse: [
						eachTgt printSmalltalkOn: aStream.
						aStream nextPutAll: ' := ___chain___. '
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
	CallAst classBeingCompiled ifNotNil: [^ false].
	(aNameAst isModuleVariableName: aNameAst id) ifFalse: [^ false].
	(aNameAst ___declaredInEnclosingFunction___: aNameAst id) ifTrue: [^ false].
	^ true
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

	aStream nextPutAll: 'self @env0:dynamicInstVarAt: #''';
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

	| holder elts starIdx |
	holder := '___unpack___'.
	elts := tgt elts.
	starIdx := elts findFirst: [:e | e isKindOf: StarredAst].
	aStream nextPutAll: '[| '; nextPutAll: holder; nextPutAll: ' | '; nextPutAll: holder; nextPutAll: ' := '.
	value printSmalltalkWithParenthesisOn: aStream.
	aStream nextPutAll: '. '.
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
	].
	aStream nextPutAll: '] value.'
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
			and: [CallAst isSelfReference: aTarget value id]) ifTrue: [
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
		"Nested unpacking: recurse using a fresh holder."
		| nestedHolder |
		nestedHolder := holder , '_n'.
		aStream nextPutAll: '[| '; nextPutAll: nestedHolder; nextPutAll: ' | '; nextPutAll: nestedHolder; nextPutAll: ' := '; nextPutAll: rhs; nextPutAll: '. '.
		aTarget elts doWithIndex: [:innerElt :j |
			self
				emitTupleElementStoreOn: aStream
				target: innerElt
				holder: nestedHolder
				indexExpr: (j - 1) printString
		].
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

	((tgt value isKindOf: NameAst) and: [CallAst isSelfReference: tgt value id]) ifTrue: [
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
