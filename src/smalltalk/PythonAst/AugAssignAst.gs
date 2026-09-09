! ------------------- Superclass check
run
StatementAst ifNil: [self error: 'StatementAst is not defined. Check file ordering.'].
%

! ------------------- Class definition for AugAssignAst
expectvalue /Class
doit
StatementAst subclass: 'AugAssignAst'
  instVarNames: #( target op value)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonAst
  options: #()

%

expectvalue /Class
doit
AugAssignAst comment:
'https://docs.python.org/3/library/ast.html#ast.AugAssign

Augmented assignment, such as a += 1.

target is a single node (Name, Attribute, or Subscript).
op is the operator (Add, Sub, Mult, MatMult, Div, Mod, Pow, LShift, RShift, BitOr, BitXor, BitAnd, FloorDiv).
value is a single node.

Example:
>>> print(ast.dump(ast.parse(''x += 2''), indent=4))
Module(
    body=[
        AugAssign(
            target=Name(id=''x'', ctx=Store()),
            op=Add(),
            value=Constant(value=2))])

Hierarchy:
Object
  AbstractNode(parent)
    AbstractLocationNode(beginLine beginColumn endLine endColumn)
      StatementAst
        AugAssignAst(target op value)
'
%

expectvalue /Class
doit
AugAssignAst category: 'Grail-Parser'
%

! ------------------- Remove existing behavior from AugAssignAst
removeallmethods AugAssignAst
removeallclassmethods AugAssignAst

set compile_env: 0

category: 'Grail-accessing'
method: AugAssignAst
target
	^ target
%

category: 'Grail-accessing'
method: AugAssignAst
value
	^ value
%

category: 'Grail-accessing'
method: AugAssignAst
op
	^ op
%

category: 'Grail-other'
method: AugAssignAst
printSmalltalkOn: aStream

	| binSel iSel opStream |
	(target isKindOf: AttributeAst) ifTrue: [
		^self printSmalltalkAttributeAugAssignOn: aStream.
	].
	(target isKindOf: SubscriptAst) ifTrue: [
		^self printSmalltalkSubscriptAugAssignOn: aStream.
	].
	"Phase A: when the target is a module-scope name, emit
	``self @env0:dynamicInstVarAt: #'x' put: ((self @env0:dynamicInstVarAt: #'x' ifAbsent: [NameError]) op value).''
	so the read AND the store both reach the module instance's
	dynamic-instVar storage.  We emit the load form explicitly because
	the target's ctx is Store — calling printSmalltalkOn: on it would
	yield a bare identifier (the wrong form for a read)."
	((target isKindOf: NameAst) and: [self isModuleScopeAugTarget: target])
		ifTrue: [
			aStream
				nextPutAll: self ___moduleStoreReceiverExpr___;
				nextPutAll: ' @env0:dynamicInstVarAt: #''';
				nextPutAll: target id;
				nextPutAll: ''' put: (('; nextPutAll: self ___moduleStoreReceiverExpr___;
				nextPutAll: ' @env0:dynamicInstVarAt: #''';
				nextPutAll: target id;
				nextPutAll: ''' ifAbsent: [NameError ___signal___: ''name ';
				nextPut: $';
				nextPut: $';
				nextPutAll: target id;
				nextPut: $';
				nextPut: $';
				nextPutAll: ' is not defined''])'.
			op printSmalltalkOn: aStream.
			value printSmalltalkWithParenthesisOn: aStream.
			aStream nextPutAll: ').'.
			^ self
		].
	"Derive the in-place / binary dunder selectors (shared by the
	closure-cell and simple-local paths below)."
	opStream := AppendStream on: Unicode7 new.
	op printSmalltalkOn: opStream.
	binSel := opStream _contents trimSeparators.
	iSel := '__i' , (binSel copyFrom: 3 to: binSel size).

	"CLASS-BODY LEVEL ``x += 1''.  A class body executes sequentially and an
	augmented assignment there rebinds the class attribute, so both the read
	and the store belong to the class -- ``class C: x = 1; x += 1'' leaves
	C.x == 2 in CPython.  Grail emitted NOTHING for this statement: an
	AugAssignAst carries no classBodyAttributePairs, so the structural
	class-body compile had nothing to emit and the whole statement was
	silently dropped, leaving C.x == 1.

	The store goes through ___classBodyDefinitionalStore___:put:, the same
	route AssignAst's runtime-scope branch uses -- which is what picks between
	the accessor pair and the ___dynInstVars___ holder, and what the class-body
	NAMESPACE (PEP 3115 __prepare__) observes, so an augmented assignment is
	recorded there like any other binding rather than bypassing it.

	The READ is emitted as an explicit ___pyAttrLoad___ on the class: the
	target's ctx is Store, so printSmalltalkOn: would give a bare identifier,
	which is not a readable name here."
	((target isKindOf: NameAst)
		and: [self ___inClassBodyRuntimeScope___]) ifTrue: [
			aStream
				nextPutAll: CallAst classBodyRuntimeClass;
				nextPutAll: ' @env1:___classBodyDefinitionalStore___: #''';
				nextPutAll: target id;
				nextPutAll: ''' put: ((';
				nextPutAll: CallAst classBodyRuntimeClass;
				nextPutAll: ' @env1:___pyAttrLoad___: #''';
				nextPutAll: target id;
				nextPutAll: ''') @env1:___augmentedOp___: '.
			value printSmalltalkWithParenthesisOn: aStream.
			aStream nextPutAll: ' inplace: #'''; nextPutAll: iSel;
				nextPutAll: ''' binary: #'''; nextPutAll: binSel; nextPutAll: ''').'.
			^ self
		].
	"``nonlocal x; x op= v'' inside a class METHOD: x is an enclosing-function
	local reached past the class, so the method has no lexical link to the
	outer temp -- read AND write must go through closure cells (the read cell
	``___cell_x___'' and the setter cell ``___cellSetter_x___'', both emitted
	by ClassDefAst at definition time).  The target NameAst carries a Store
	ctx here, so its printSmalltalkOn: would emit a bare identifier for both
	the store and the (parenthesised) load; emit the cell forms explicitly.
	test_dict test_str_nonstr's Key3.__eq__ does exactly ``eq_count += 1''."
	((target isKindOf: NameAst)
		and: [CallAst classBeingCompiled notNil
		and: [CallAst inClassBodyValueEmit ~~ true
		and: [CallAst inBasesEmit ~~ true
		and: [target ___enclosingFunctionLocalBeyondClass___: target id]]]]) ifTrue: [
			CallAst addCapturedClassName: target id.
			CallAst addCapturedWriteName: target id.
			aStream
				nextPutAll: '(self @env1:___classCellSetter___: #''___cellSetter_';
				nextPutAll: target id;
				nextPutAll: '___'') value: ((self @env1:___classCell___: #''___cell_';
				nextPutAll: target id;
				nextPutAll: '___'') @env1:___augmentedOp___: '.
			value printSmalltalkWithParenthesisOn: aStream.
			aStream nextPutAll: ' inplace: #'''; nextPutAll: iSel;
				nextPutAll: ''' binary: #'''; nextPutAll: binSel; nextPutAll: ''').'.
			^ self
		].
	"Simple (local Name) target.  CPython augmented assignment tries the
	in-place dunder (``a.__iadd__(b)'') first and only falls back to the
	binary dunder (``a.__add__(b)'') when the type has no in-place form.
	Route both through the runtime helper
	``object>>___augmentedOp___:inplace:binary:''.  (Attribute / subscript /
	module-scope / closure-cell targets are handled above.)"
	target printSmalltalkOn: aStream.
	aStream nextPutAll: ' := '.
	target printSmalltalkWithParenthesisOn: aStream.
	aStream nextPutAll: ' @env1:___augmentedOp___: '.
	value printSmalltalkWithParenthesisOn: aStream.
	aStream nextPutAll: ' inplace: #'''; nextPutAll: iSel;
		nextPutAll: ''' binary: #'''; nextPutAll: binSel; nextPutAll: ''''.
	aStream nextPut: $..
%

category: 'Grail-other'
method: AugAssignAst
isModuleScopeAugTarget: aNameAst
	"Phase A: true if this aug-assign target is a module-scope name —
	same discriminator as AssignAst's isModuleScopeStoreTarget:."

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

category: 'Grail-other'
method: AugAssignAst
printSmalltalkAttributeAugAssignOn: aStream
	"Generate augmented attribute assignment.

	When in class method context and target is self.x,
	emit `x := x op expr.`
	Otherwise: `obj @env0:at: #'attr' put: (obj attr op value).`"

	((target value isKindOf: NameAst) and: [CallAst isSelfReference: target value id]) ifTrue: [
		"Slot attribute (Python __slots__ → GemStone named instVar):
		load+store the named instVar directly.  Without this branch the
		store below would write the dynamic-instVar dict for a slot name,
		diverging from the named-instVar the slot read returns (and
		bypassing strict enforcement)."
		((CallAst classSlotNames notNil)
			and: [CallAst classSlotNames includes: target ___mangledAttr___ asSymbol]) ifTrue: [
			"``<slot> := (<slot> ifNil: [...]) op value'' — bare mangled
			instVar (this method compiles on the slotted class); the single
			wrapping paren makes ``ifNil:'' bind before the ``op'' send."
			aStream
				nextPutAll: '___slot_';
				nextPutAll: target ___mangledAttr___;
				nextPutAll: '___ := (___slot_';
				nextPutAll: target ___mangledAttr___;
				nextPutAll: '___ ifNil: [self @env1:___pyAttrLoad___: #''';
				nextPutAll: target ___mangledAttr___;
				nextPutAll: '''])'.
			op printSmalltalkOn: aStream.
			value printSmalltalkWithParenthesisOn: aStream.
			aStream nextPutAll: '.'.
			^self
		].
		"Phase B: ``self.attr op= value'' loads and stores through the
		instance's dynamic-instVar storage.  Emit shape:
		  self @env0:dynamicInstVarAt: #'attr'
		    put: ((load) op (value))
		where ``(load)'' is the dynamicInstVarAt:ifAbsent: probe + class
		fallback."
		aStream
			nextPutAll: 'self @env0:dynamicInstVarAt: #''';
			nextPutAll: target ___mangledAttr___;
			nextPutAll: ''' put: ((self @env0:dynamicInstVarAt: #''';
			nextPutAll: target ___mangledAttr___;
			nextPutAll: ''' ifAbsent: [self @env1:___pyAttrLoad___: #''';
			nextPutAll: target ___mangledAttr___;
			nextPutAll: '''])'.
		op printSmalltalkOn: aStream.
		value printSmalltalkWithParenthesisOn: aStream.
		aStream nextPutAll: ').'.
		^self
	].
	"General receiver: route through the polymorphic attribute
	protocol.  ``at: #attr put:'' would hit Behavior>>at:put: (indexed
	subscript) when the receiver is a CLASS — ``Field.creation_counter
	+= 1'' in django's Field.__init__ crashed exactly there."
	target value printSmalltalkWithParenthesisOn: aStream.
	aStream nextPutAll: ' @env1:___pyAttrStore___: #'''.
	aStream nextPutAll: target ___mangledAttr___.
	aStream nextPutAll: ''' put: (('.
	target value printSmalltalkWithParenthesisOn: aStream.
	aStream nextPutAll: ' @env1:___pyAttrLoad___: #''';
		nextPutAll: target ___mangledAttr___;
		nextPutAll: ''')'.
	op printSmalltalkOn: aStream.
	value printSmalltalkWithParenthesisOn: aStream.
	aStream nextPutAll: ').'.
%

category: 'Grail-other'
method: AugAssignAst
printSmalltalkSubscriptAugAssignOn: aStream
	"Generate: obj __setitem__: slice _: (obj __getitem__: slice op value)."

	target value printSmalltalkWithParenthesisOn: aStream.
	aStream nextPutAll: ' __setitem__: '.
	target slice printSmalltalkWithParenthesisOn: aStream.
	aStream nextPutAll: ' _: (('.
	target value printSmalltalkWithParenthesisOn: aStream.
	aStream nextPutAll: ' __getitem__: '.
	target slice printSmalltalkWithParenthesisOn: aStream.
	aStream nextPut: $).
	op printSmalltalkOn: aStream.
	value printSmalltalkWithParenthesisOn: aStream.
	aStream nextPutAll: ').'.
%
category: 'Grail-IR Codegen'
method: AugAssignAst
___irLocalNameTarget___: localSet
	"The target NameAst when this statement is the SIMPLE-LOCAL branch of
	printSmalltalkOn: -- a bare store to a registered local/parameter name with
	the ___augmentedOp___ send -- else nil, keeping every other branch
	(attribute / subscript / module-scope / class-body / closure-cell targets)
	on the text path.  A PARAMETER target is fine since cut 29: a reassigned
	param lives in a writable temp fed from a transport argument, and its leaf
	is what the builder answers for the name."

	(target isKindOf: NameAst) ifFalse: [^ nil].
	((target ctx) isKindOf: StoreAst) ifFalse: [^ nil].
	(localSet includes: target id asString) ifFalse: [^ nil].
	(self isModuleScopeAugTarget: target) ifTrue: [^ nil].
	"In a class METHOD the text has exactly one more Name-target branch: a
	``nonlocal x'' of an enclosing function reached PAST the class, which goes
	through the closure cells.  Refuse that; every other method-mode local is
	the same simple-local send (cut 53 found Walker.pairs / Walker.take on
	text for ``i += 1'' under a blanket method-mode refusal)."
	(CallAst classBeingCompiled notNil
		and: [target ___enclosingFunctionLocalBeyondClass___: target id]) ifTrue: [^ nil].
	^ target
%

category: 'Grail-IR Codegen'
method: AugAssignAst
___irSelectorPair___
	"{inplaceSel. binarySel} as Symbols (e.g. #'__iadd__:' #'__add__:'), derived
	exactly as printSmalltalkOn:'s simple-local branch derives them from the op
	printer.  nil when derivation fails for any reason -- guarded, because an
	eligibility probe must never raise (see ir-eligibility-must-not-raise)."

	| opStream binSel |
	^ [opStream := AppendStream on: Unicode7 new.
		op printSmalltalkOn: opStream.
		binSel := opStream _contents trimSeparators.
		binSel size < 3
			ifTrue: [nil]
			ifFalse: [
				{ ('__i' , (binSel copyFrom: 3 to: binSel size)) asSymbol.
				  binSel asSymbol }]]
			on: Error do: [:e | nil]
%

category: 'Grail-IR Codegen'
method: AugAssignAst
___irComplexTargetKind___: localNames
	"The attribute / subscript target branches of printSmalltalkOn: (cut 62),
	as a Symbol, or nil: #attrSelf for ``self.x op= v'' inside a method (the
	dynamic-instVar-first load and store, or the named instVar for one of the
	class's own __slots__ -- decided at emit by ___irSelfSlotName___),
	#attrForeign for any other receiver (``___pyAttrStore___:put:'' around
	``___pyAttrLoad___:''), #subscript for ``obj[i] op= v'' with a plain index
	(``__setitem__:_:'' around ``__getitem__:''; a slice index stays on text,
	the text's SliceAst spelling is SubscriptAst's own)."

	| shape |
	shape := self ___irComplexTargetShape___.
	shape isNil ifTrue: [^ nil].
	shape == #attrSelf ifTrue: [^ shape].
	shape == #attrForeign ifTrue: [
		^ (target value ___irEligibleValueLocals___: localNames) ifTrue: [shape] ifFalse: [nil]].
	^ ((target value ___irEligibleValueLocals___: localNames)
		and: [target slice ___irEligibleValueLocals___: localNames])
			ifTrue: [shape] ifFalse: [nil]
%

category: 'Grail-IR Codegen'
method: AugAssignAst
___irComplexTargetShape___
	"The structural half of ___irComplexTargetKind___: -- which text branch
	the target takes, before asking whether its pieces are emittable.  Also
	the emit-time dispatcher, which has no locals set to hand."

	(target isKindOf: AttributeAst) ifTrue: [
		((target ctx) isKindOf: StoreAst) ifFalse: [^ nil].
		((target value isKindOf: NameAst) and: [target value ___irIsSelfReceiver___])
			ifTrue: [^ #attrSelf].
		^ #attrForeign].
	(target isKindOf: SubscriptAst) ifTrue: [
		((target ctx) isKindOf: StoreAst) ifFalse: [^ nil].
		(target slice isKindOf: SliceAst) ifTrue: [^ nil].
		^ #subscript].
	^ nil
%

category: 'Grail-IR Codegen'
method: AugAssignAst
___irEligibleStatementLocals___: localNames
	^ ((self ___irLocalNameTarget___: localNames) notNil
			or: [(self ___irComplexTargetKind___: localNames) notNil])
		and: [self ___irSelectorPair___ notNil
		and: [value ___irEligibleValueLocals___: localNames]]
%

category: 'Grail-IR Codegen'
method: AugAssignAst
___emitIRComplexTargetOn___: aBuilder kind: aKind
	"printSmalltalkAttributeAugAssignOn: / printSmalltalkSubscriptAugAssignOn:
	(cut 62).  The text applies the BINARY operator send (``__add__:'', not the
	in-place probe of the simple-local branch) to the loaded current value and
	stores the result:
	  self @env0:dynamicInstVarAt: #x put: ((self @env0:dynamicInstVarAt: #x
	      ifAbsent: [self @env1:___pyAttrLoad___: #x]) __add__: (v))
	  ___slot_x___ := (___slot_x___ ifNil: [self @env1:___pyAttrLoad___: #x]) __add__: (v)
	  (obj) @env1:___pyAttrStore___: #x put: (((obj) @env1:___pyAttrLoad___: #x) __add__: (v))
	  (obj) __setitem__: (i) _: (((obj) __getitem__: (i)) __add__: (v))
	The receiver (and index) expressions are emitted TWICE for the foreign and
	subscript shapes, as the text prints them twice."

	| binSel attr v load |
	binSel := self ___irSelectorPair___ at: 2.
	aKind == #attrSelf ifTrue: [
		attr := target ___mangledAttr___ asSymbol.
		(target ___irSelfSlotName___) ifNotNil: [:slot |
			load := aBuilder
				ifNilValue: (aBuilder var: (aBuilder instVarNamed: slot))
				then: [aBuilder add: (aBuilder
					send: #'___pyAttrLoad___:' to: aBuilder selfNode with: { aBuilder obj: attr } env: 1)].
			v := value ___emitIRValueOn___: aBuilder.
			aBuilder atNode: self.
			aBuilder add: (aBuilder assign: (aBuilder instVarNamed: slot)
				from: (aBuilder send: binSel to: load with: { v } env: 1)).
			^ self].
		load := aBuilder
			send: #dynamicInstVarAt:ifAbsent:
			to: aBuilder selfNode
			with: { aBuilder obj: attr.
				aBuilder inBlockDo: [aBuilder add: (aBuilder
					send: #'___pyAttrLoad___:' to: aBuilder selfNode with: { aBuilder obj: attr } env: 1)] }
			env: 0.
		v := value ___emitIRValueOn___: aBuilder.
		aBuilder atNode: self.
		aBuilder add: (aBuilder
			send: #dynamicInstVarAt:put: to: aBuilder selfNode
			with: { aBuilder obj: attr. aBuilder send: binSel to: load with: { v } env: 1 }
			env: 0).
		^ self].
	aKind == #attrForeign ifTrue: [
		| recv1 recv2 |
		attr := target ___mangledAttr___ asSymbol.
		recv1 := target value ___emitIRValueOn___: aBuilder.
		recv2 := target value ___emitIRValueOn___: aBuilder.
		load := aBuilder send: #'___pyAttrLoad___:' to: recv2 with: { aBuilder obj: attr } env: 1.
		v := value ___emitIRValueOn___: aBuilder.
		aBuilder atNode: self.
		aBuilder add: (aBuilder
			send: #'___pyAttrStore___:put:' to: recv1
			with: { aBuilder obj: attr. aBuilder send: binSel to: load with: { v } env: 1 }
			env: 1).
		^ self].
	aKind == #subscript ifTrue: [
		| obj1 obj2 idx1 idx2 |
		obj1 := target value ___emitIRValueOn___: aBuilder.
		idx1 := target slice ___emitIRValueOn___: aBuilder.
		obj2 := target value ___emitIRValueOn___: aBuilder.
		idx2 := target slice ___emitIRValueOn___: aBuilder.
		load := aBuilder send: #'__getitem__:' to: obj2 with: { idx2 } env: 1.
		v := value ___emitIRValueOn___: aBuilder.
		aBuilder atNode: self.
		aBuilder add: (aBuilder
			send: #'__setitem__:_:' to: obj1
			with: { idx1. aBuilder send: binSel to: load with: { v } env: 1 }
			env: 1).
		^ self].
	^ Error signal: 'IR codegen: unhandled augmented target kind ' , aKind printString
%

category: 'Grail-IR Codegen'
method: AugAssignAst
___emitIRStatementOn___: aBuilder
	"``x := (x) ___augmentedOp___: (value) inplace: #'__ixxx__:' binary:
	#'__xxx__:'.''  The same single send the text path's simple-local branch
	emits: the runtime helper tries the in-place dunder and falls back to the
	binary one, exactly as CPython does.  The target's bound-before-read safety
	is guaranteed by ___irAssignFlowSafe___: (an aug-assign READS its target),
	so the bare local read needs no guard."

	| pair rcvr v leaf augSend |
	(target isKindOf: NameAst) ifFalse: [
		"Not the simple-local branch: an attribute or subscript target (cut
		62), dispatched on structure alone -- eligibility already judged its
		pieces, and the builder holds every leaf they read."
		^ self ___emitIRComplexTargetOn___: aBuilder kind: self ___irComplexTargetShape___].
	pair := self ___irSelectorPair___.
	rcvr := aBuilder localVar: target id asSymbol.
	v := value ___emitIRValueOn___: aBuilder.
	leaf := aBuilder leafFor: target id asSymbol.
	aBuilder atNode: self.
	augSend := aBuilder
		send: #'___augmentedOp___:inplace:binary:'
		to: rcvr
		with: { v. aBuilder obj: (pair at: 1). aBuilder obj: (pair at: 2) }.
	aBuilder add: (aBuilder assign: leaf from: augSend).
	^ self
%

category: 'Grail-IR Codegen'
method: AugAssignAst
___irReadLocalNamesInto___: aSet locals: localSet
	"An augmented assignment READS its target before writing it -- ``x += v''
	is ``x = x.__iadd__(v)'' -- so the target counts as a read for the
	bound-before-read analysis, unlike a plain assignment's target."

	((target isKindOf: NameAst) and: [localSet includes: target id asString])
		ifTrue: [aSet add: target id asString].
	"An attribute target reads its receiver, a subscript target its receiver
	and index (cut 62)."
	(target isKindOf: AttributeAst) ifTrue: [
		target value ___irReadLocalNamesInto___: aSet locals: localSet].
	(target isKindOf: SubscriptAst) ifTrue: [
		target value ___irReadLocalNamesInto___: aSet locals: localSet.
		target slice ___irReadLocalNamesInto___: aSet locals: localSet].
	value ___irReadLocalNamesInto___: aSet locals: localSet.
	^ self
%

category: 'Grail-IR Codegen'
method: AugAssignAst
___irLocalWriteTarget___: localSet
	^ self ___irLocalNameTarget___: localSet
%

category: 'Grail-IR Codegen'
method: AugAssignAst
___irWriteLocalNamesInto___: aSet locals: localSet
	(self ___irLocalNameTarget___: localSet)
		ifNotNil: [:tgt | aSet add: tgt id asString].
	^ self
%

method: AugAssignAst
target: newValue
	target := newValue
%
method: AugAssignAst
op: newValue
	op := newValue
%
method: AugAssignAst
value: newValue
	value := newValue
%

category: 'Grail-IR Codegen'
method: AugAssignAst
___irRefusalDetail___: localSet
	self ___irSelectorPair___ isNil ifTrue: [^ #'AugAssignAst:operator'].
	((target isKindOf: SubscriptAst) and: [target slice isKindOf: SliceAst])
		ifTrue: [^ #'AugAssignAst:target-SubscriptAst-slice'].
	((target isKindOf: AttributeAst) or: [target isKindOf: SubscriptAst])
		ifTrue: [^ ('AugAssignAst:target-' , target class name asString , '-receiver') asSymbol].
	^ ('AugAssignAst:target-' , target class name asString) asSymbol
%
