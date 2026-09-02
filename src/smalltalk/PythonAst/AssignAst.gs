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
	every binary operator this way).  Each leaf name becomes a class attribute
	whose value is a synthetic ``<value>[i]'' subscript.  The RHS
	re-evaluates once per leaf -- acceptable for the factory-call idiom
	(each call returns an equivalent fresh tuple).

	RECURSIVE, because the target may NEST: ``(func, c), = [(1, 2)]'' is a
	one-element tuple whose element is itself a tuple, so a flat
	``every elt is a NameAst'' test rejected the whole statement and the class
	body bound NOTHING -- a later read of ``func'' in the same body was an
	undefined symbol, which is an uncatchable Smalltalk CompileError rather
	than a NameError (test_listcomps test_lambda_in_iter and
	test_nested_listcomp_in_lambda).  A leaf reached through two levels just
	takes two subscripts.  ___unpacksToNamesOnly___: keeps the shapes this
	cannot express -- a star target, an attribute or subscript leaf -- on the
	old path of declaring nothing, rather than binding them wrongly."
	((targets size = 1)
		and: [((targets first isKindOf: TupleAst)
			or: [targets first isKindOf: ListAst])
		and: [self ___unpacksToNamesOnly___: targets first]]) ifTrue: [
		self ___addClassBodyPairsFor___: targets first
			value: value
			path: #()
			into: pairs].
	^ pairs
%

category: 'Grail-other'
method: AssignAst
___unpacksToNamesOnly___: aTarget
	"True when aTarget is a nest of tuples/lists whose every leaf is a plain
	NameAst -- the shape classBodyAttributePairs can express as one subscript
	chain per leaf.

	A STARRED leaf is deliberately excluded: ``head, *tail = xs'' binds tail to
	a SLICE whose length depends on the RHS, which no fixed index can name.  An
	attribute or subscript leaf is excluded because it binds nothing on the
	class -- it mutates an object reached by an expression."

	(aTarget isKindOf: NameAst) ifTrue: [^ true].
	((aTarget isKindOf: TupleAst) or: [aTarget isKindOf: ListAst]) ifTrue: [
		aTarget elts isNil ifTrue: [^ false].
		^ aTarget elts allSatisfy: [:e | self ___unpacksToNamesOnly___: e]].
	^ false
%

category: 'Grail-other'
method: AssignAst
___addClassBodyPairsFor___: aTarget value: valueAst path: aPath into: pairs
	"Add one ``name -> <value>[i][j]...'' pair per leaf name of aTarget, where
	aPath is the chain of zero-based indices reaching aTarget from valueAst.

	Callers must have cleared ___unpacksToNamesOnly___: first, so every leaf
	here is a NameAst."

	(aTarget isKindOf: NameAst) ifTrue: [
		| expr |
		expr := valueAst.
		aPath do: [:i |
			expr := SubscriptAst new
				value: expr;
				slice: (ConstantAst new value: i; kind: nil; yourself);
				ctx: LoadAst basicNew;
				yourself].
		pairs add: aTarget ___mangledId___ asSymbol -> expr.
		^ self].
	((aTarget isKindOf: TupleAst) or: [aTarget isKindOf: ListAst]) ifTrue: [
		aTarget elts doWithIndex: [:e :i |
			self ___addClassBodyPairsFor___: e
				value: valueAst
				path: (aPath copyWith: i - 1)
				into: pairs]].
	^ self
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
	targets contribute each element, at any nesting depth).  Used by
	ClassDefAst's source-order class-body name resolution.

	Private-name mangled, matching classBodyAttributePairs -- and recursive
	for the same reason it is: ``(func, c), = ...'' nests, and stopping at one
	level reported the statement as binding nothing."

	| names add |
	names := OrderedCollection new.
	add := nil.
	add := [:tgt |
		(tgt isKindOf: NameAst)
			ifTrue: [names add: tgt ___mangledId___ asSymbol]
			ifFalse: [
				((tgt isKindOf: TupleAst) or: [tgt isKindOf: ListAst]) ifTrue: [
					tgt elts ifNotNil: [:es | es do: [:e | add value: e]]].
				(tgt isKindOf: StarredAst) ifTrue: [
					tgt value ifNotNil: [:v | add value: v]]]].
	targets do: [:tgt | add value: tgt].
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

category: 'Grail-IR Codegen'
method: AssignAst
___irSingleLocalTarget: localSet
	"The target NameAst if this is a single bare store to a name in localSet
	(a parameter or body-local), else nil.  Tuple/attribute/subscript targets
	and chained assignment fall through to nil (text path)."

	targets size == 1 ifFalse: [^ nil].
	(targets first isKindOf: NameAst) ifFalse: [^ nil].
	((targets first ctx) isKindOf: StoreAst) ifFalse: [^ nil].
	(localSet includes: targets first id asString) ifFalse: [^ nil].
	^ targets first
%

category: 'Grail-IR Codegen'
method: AssignAst
___irSubscriptStoreTarget___: localNames
	"The target SubscriptAst when this is a single ``obj[idx] = value'' store
	with an emittable receiver and index, else nil.  A slice index (a SliceAst)
	is not an emittable value, so slice stores fall out naturally."

	| tgt |
	targets size == 1 ifFalse: [^ nil].
	tgt := targets first.
	(tgt isKindOf: SubscriptAst) ifFalse: [^ nil].
	(tgt value ___irEligibleValueLocals___: localNames) ifFalse: [^ nil].
	(tgt slice ___irEligibleValueLocals___: localNames) ifFalse: [^ nil].
	^ tgt
%

category: 'Grail-IR Codegen'
method: AssignAst
___irAttributeStoreTarget___: localNames
	"The target AttributeAst when this is a single ``obj.attr = value'' store
	the text path would emit in its FOREIGN-receiver __setattr__ form, else
	nil.  In a module def CallAst>>isSelfReference: is always false
	(classBeingCompiled is nil), so the only text branch to exclude is the
	``__class__'' type-change special case."

	| tgt |
	targets size == 1 ifFalse: [^ nil].
	tgt := targets first.
	(tgt isKindOf: AttributeAst) ifFalse: [^ nil].
	tgt attr asString = '__class__' ifTrue: [^ nil].
	(tgt value ___irEligibleValueLocals___: localNames) ifFalse: [^ nil].
	^ tgt
%

category: 'Grail-IR Codegen'
method: AssignAst
___irEligibleStatementLocals___: localNames
	((self ___irSingleLocalTarget: localNames) notNil
		or: [(self ___irSubscriptStoreTarget___: localNames) notNil
		or: [(self ___irAttributeStoreTarget___: localNames) notNil]])
			ifFalse: [^ false].
	^ value ___irEligibleValueLocals___: localNames
%

category: 'Grail-IR Codegen'
method: AssignAst
___emitIRStatementOn___: aBuilder
	"Three store shapes, matching printSmalltalkOn:'s target dispatch:
	* ``name := value.'' -- a body-local temp registered on the builder
	  (leafFor:); its unbound-before-read safety is guaranteed by
	  FunctionDefAst>>___irAssignFlowSafe___:, so no nil-guard is emitted.
	* ``(obj) __setitem__: (idx) _: (value).''
	* ``(obj) @env1:__setattr__: 'attr' _: (value).'' -- the attribute name is
	  a Smalltalk STRING, not a Symbol: user __setattr__ overrides compare
	  ``name == 'x''' str-vs-str, and a Symbol would fail that __eq__."

	| tgt v leaf objV idxV |
	tgt := targets first.
	(tgt isKindOf: SubscriptAst) ifTrue: [
		objV := tgt value ___emitIRValueOn___: aBuilder.
		idxV := tgt slice ___emitIRValueOn___: aBuilder.
		v := value ___emitIRValueOn___: aBuilder.
		aBuilder at: self beginPosition.
		aBuilder add: (aBuilder send: #'__setitem__:_:' to: objV with: { idxV. v }).
		^ self].
	(tgt isKindOf: AttributeAst) ifTrue: [
		objV := tgt value ___emitIRValueOn___: aBuilder.
		v := value ___emitIRValueOn___: aBuilder.
		aBuilder at: self beginPosition.
		aBuilder add: (aBuilder
			send: #'__setattr__:_:'
			to: objV
			with: { aBuilder obj: tgt ___mangledAttr___ asString. v }).
		^ self].
	v := value ___emitIRValueOn___: aBuilder.
	leaf := aBuilder leafFor: tgt id asSymbol.
	aBuilder at: self beginPosition.
	aBuilder add: (aBuilder assign: leaf from: v).
	^ self
%

category: 'Grail-IR Codegen'
method: AssignAst
___irLocalWriteTarget___: localSet
	^ self ___irSingleLocalTarget: localSet
%

category: 'Grail-IR Codegen'
method: AssignAst
___irWriteLocalNamesInto___: aSet locals: localSet
	(self ___irSingleLocalTarget: localSet)
		ifNotNil: [:tgt | aSet add: tgt id asString].
	^ self
%

category: 'Grail-IR Codegen'
method: AssignAst
___irReadLocalNamesInto___: aSet locals: localSet
	"The RHS is read; so are a subscript target's receiver and index, and an
	attribute target's receiver.  A bare-name target is a write only."

	| tgt |
	value ___irReadLocalNamesInto___: aSet locals: localSet.
	targets size == 1 ifTrue: [
		tgt := targets first.
		(tgt isKindOf: SubscriptAst) ifTrue: [
			tgt value ___irReadLocalNamesInto___: aSet locals: localSet.
			tgt slice ___irReadLocalNamesInto___: aSet locals: localSet].
		(tgt isKindOf: AttributeAst) ifTrue: [
			tgt value ___irReadLocalNamesInto___: aSet locals: localSet]].
	^ self
%
