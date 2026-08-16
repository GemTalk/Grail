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

	"PRIVATE-NAME MANGLING.  ``__x = 1'' in class C declares _C__x, exactly as
	``self.__x'' reads _C__x and ``def __helper'' compiles to _C__helper --
	AttributeAst and FunctionDefAst already mangle, and this binding form was
	the one that did not, so a private class attribute was declared under a
	name nothing could ever read back."

	| pairs |
	pairs := OrderedCollection new.
	(targets allSatisfy: [:t | t isKindOf: NameAst]) ifTrue: [
		targets do: [:t | pairs add: t ___mangledId___ asSymbol -> value]].
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
			pairs add: e ___mangledId___ asSymbol -> (SubscriptAst new
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
		"``global x; x = v'' inside a DOIT (exec/eval).  The read side explains
		why a bare identifier cannot name the doit's scope slot here -- an
		enclosing def's same-named temp captures it lexically -- and a STORE
		has the same problem, with the worse consequence: the assignment
		silently rebinds the enclosing local and the global keeps its old
		value.  Route it through the scope handle, as NameAst's load does.

		The NEAREST enclosing function's declaration is the right test for a
		store (unlike the read's walk): ``x = v'' binds the scope it is
		written in, so only that scope's own declaration can send it
		elsewhere."
		((tgt isKindOf: NameAst)
			and: [ModuleAst compilingDoitScope notNil
			and: [tgt ___nearestEnclosingScopeDeclaresGlobal___: tgt id]])
			ifTrue: [
				aStream
					nextPutAll: '___pyGlobals___ @env0:at: #''';
					nextPutAll: (NameAst doitScopeNameFor: tgt id asSymbol) asString;
					nextPutAll: ''' put: '.
				value printSmalltalkWithParenthesisOn: aStream.
				aStream nextPut: $..
				^ self
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
						and: [CallAst classSlotNames includes: eachTgt ___mangledAttr___ asSymbol])
						ifTrue: [
							aStream
								nextPutAll: '___slot_';
								nextPutAll: eachTgt ___mangledAttr___;
								nextPutAll: '___ := ___chain___. '
						] ifFalse: [
							aStream
								nextPutAll: 'self @env0:dynamicInstVarAt: #''';
								nextPutAll: eachTgt ___mangledAttr___;
								nextPutAll: ''' put: ___chain___. '
						]
				]
				ifFalse: [
					eachTgt value printSmalltalkWithParenthesisOn: aStream.
					aStream nextPutAll: ' @env1:__setattr__: '''; nextPutAll: eachTgt ___mangledAttr___;
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
						aStream nextPutAll: self ___moduleStoreReceiverExpr___; nextPutAll: ' @env0:dynamicInstVarAt: #''';
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
			and: [CallAst classSlotNames includes: tgt ___mangledAttr___ asSymbol]) ifTrue: [
			aStream nextPutAll: '___slot_'.
			aStream nextPutAll: tgt ___mangledAttr___.
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
		aStream nextPutAll: tgt ___mangledAttr___.
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
	aStream nextPutAll: tgt ___mangledAttr___.
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
	order class-body name resolution.

	Private-name mangled, matching classBodyAttributePairs."

	| names |
	names := OrderedCollection new.
	targets do: [:tgt |
		(tgt isKindOf: NameAst) ifTrue: [names add: tgt ___mangledId___ asSymbol].
		((tgt isKindOf: TupleAst) or: [tgt isKindOf: ListAst]) ifTrue: [
			tgt elts do: [:e |
				(e isKindOf: NameAst) ifTrue: [names add: e ___mangledId___ asSymbol]]]].
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
