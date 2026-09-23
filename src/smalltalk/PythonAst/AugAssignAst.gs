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
	"Derive the in-place / binary dunder selectors.  Derived HERE, ahead of
	every remaining branch, because the module-scope one below needs them too
	-- it used to sit above this and emit the bare binary operator for want of
	them."
	opStream := AppendStream on: Unicode7 new.
	op printSmalltalkOn: opStream.
	binSel := opStream _contents trimSeparators.
	iSel := '__i' , (binSel copyFrom: 3 to: binSel size).
	"Phase A: when the target is a module-scope name, emit
	``self @env0:dynamicInstVarAt: #'x' put: ((self @env0:dynamicInstVarAt: #'x'
	ifAbsent: [NameError]) ___augmentedOp___: value inplace: ... binary: ...).''
	so the read AND the store both reach the module instance's dynamic-instVar
	storage.  We emit the load form explicitly because the target's ctx is
	Store — calling printSmalltalkOn: on it would yield a bare identifier (the
	wrong form for a read).

	THROUGH ___augmentedOp___ LIKE EVERY OTHER TARGET KIND.  This branch
	emitted the bare BINARY operator -- ``(read) __or__: value'' -- so at
	module scope, and only there, an augmented assignment was not an augmented
	assignment at all.  Two things follow from that, and both are silent:

	  * the IN-PLACE dunder never ran.  ``d |= other'' at module scope built a
	    NEW dict and rebound the name, where CPython mutates in place -- so any
	    other name bound to the same object kept the old contents.  Same for
	    ``l += [x]'' on a list, which is the common spelling.

	  * the REFLECTED dunder never ran.  A forward dunder that DECLINES
	    (answers NotImplemented) had nothing after it, so NotImplemented was
	    stored as the result:

	        d = {0: 'a'}
	        d |= types.MappingProxyType({1: 'c'})   # d is NotImplemented

	    while ``d | proxy'' on the line above answers a dict.  The failure then
	    surfaces wherever d is next used, not here.

	The same statement inside a FUNCTION was always correct, which is what kept
	this hidden: the local-name path at the bottom of this method has used
	___augmentedOp___ since it was written."
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
				nextPutAll: ' is not defined'']) @env1:___augmentedOp___: '.
			value printSmalltalkWithParenthesisOn: aStream.
			aStream nextPutAll: ' inplace: #'''; nextPutAll: iSel;
				nextPutAll: ''' binary: #'''; nextPutAll: binSel; nextPutAll: ''').'.
			^ self
		].

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

	EVERY BRANCH GOES THROUGH ___augmentedOp___, which is what makes
	``obj.x op= v'' an AUGMENTED assignment rather than a read, a binary
	operation and a store.  They used to emit the bare binary operator, so for
	an attribute target -- and for a subscript, and, until this change, for a
	module-scope name -- two things never happened:

	  * the IN-PLACE dunder.  ``self.data |= other'' built a new object and
	    stored it, where CPython mutates the existing one, so any other name
	    bound to it kept the old contents.
	  * the REFLECTED dunder.  A forward dunder that DECLINES had nothing
	    after it, and its NotImplemented was STORED -- a value, not an error,
	    surfacing wherever the attribute was next read.

	Only the plain-local-name branch in printSmalltalkOn: was ever correct,
	which is why ``d |= proxy'' inside a function worked and the same line at
	module scope, or as ``self.d |= proxy'', did not.

	The branches, unchanged in how they READ and STORE: a declared/inferred
	slot goes through its accessor pair, ``self.x'' through the instance's
	dynamic-instVar storage, and any other receiver through the polymorphic
	___pyAttrLoad___ / ___pyAttrStore___ protocol -- ``at:put:'' would hit
	Behavior>>at:put: when the receiver is a CLASS."

	| pair opStream binSel |
	"Derived the same way printSmalltalkOn: derives it for a local name, so the
	two branches cannot drift: the op printer answers the binary dunder
	(``__or__:''), and the in-place one is that with an `i' after the
	underscores."
	opStream := AppendStream on: Unicode7 new.
	op printSmalltalkOn: opStream.
	binSel := opStream _contents trimSeparators.
	pair := { '__i' , (binSel copyFrom: 3 to: binSel size). binSel }.
	((target value isKindOf: NameAst) and: [CallAst isSelfReference: target value id]) ifTrue: [
		"A slot (declared __slots__, or inferred under GRAIL_INFERRED_SLOTS):
		load and store through the accessor sends --
		``self ___pyattr_x___: ((self ___pyattr_x___) op (v)).''  Without this
		branch the store below would write the dynamic-instVar dict for a slot
		name, diverging from the slot the read returns (and bypassing strict
		enforcement)."
		(CallAst ___inferredSlotAccessorFor___: target value attr: target ___mangledAttr___) ifNotNil: [:acc |
			aStream
				nextPutAll: 'self '; nextPutAll: acc; nextPutAll: ': ((self ';
				nextPutAll: acc; nextPut: $).
	aStream nextPutAll: ' @env1:___augmentedOp___: '.
	value printSmalltalkWithParenthesisOn: aStream.
	aStream nextPutAll: ' inplace: #'''; nextPutAll: (pair at: 1);
		nextPutAll: ''' binary: #'''; nextPutAll: (pair at: 2);
		nextPutAll: ''').'.
			^self
		].
		"Phase B: ``self.attr op= value'' probes the instance's dynamic-instVar
		storage to LOAD, and stores through ``__setattr__:_:''.  Emit shape:
		  self @env1:__setattr__: 'attr' _: ((load) op (value))
		where ``(load)'' is the dynamicInstVarAt:ifAbsent: probe + class
		fallback.

		THE STORE GOES THROUGH __setattr__ BECAUSE THE SELF REFERENCE IS NOT
		ALWAYS AN INSTANCE.  A dynamic-instVar store is an ImproperOperation
		when the receiver is a CLASS -- ``dynamic instVars not supported in a
		Class'' -- and an uncatchable env-0 one, so it takes down the whole
		module run rather than raising anything Python can see.  Two everyday
		shapes put a class there: ``@classmethod def bump(cls): cls.count +=
		1'', and PEP 487's ``def __init_subclass__(cls, ...)'', which Grail
		compiles instance-side and runs with the new class as the receiver.
		Both are ordinary Python and both died here.

		It is also what the PLAIN assignment emitter has always done for this
		same target shape (AbstractNode >> the __setattr__:_: branch): one rule
		with two implementations, and this was the stale copy -- ``cls.x = v''
		worked in a classmethod while ``cls.x += v'' one line below did not.
		Routing both the same way also means a @property setter fires for an
		augmented assignment, which it previously wrote straight past."
		aStream
			nextPutAll: 'self @env1:__setattr__: ''';
			nextPutAll: target ___mangledAttr___;
			nextPutAll: ''' _: ((self @env0:dynamicInstVarAt: #''';
			nextPutAll: target ___mangledAttr___;
			nextPutAll: ''' ifAbsent: [self @env1:___pyAttrLoad___: #''';
			nextPutAll: target ___mangledAttr___;
			nextPutAll: '''])'.
	aStream nextPutAll: ' @env1:___augmentedOp___: '.
	value printSmalltalkWithParenthesisOn: aStream.
	aStream nextPutAll: ' inplace: #'''; nextPutAll: (pair at: 1);
		nextPutAll: ''' binary: #'''; nextPutAll: (pair at: 2);
		nextPutAll: ''').'.
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
	aStream nextPutAll: ' @env1:___augmentedOp___: '.
	value printSmalltalkWithParenthesisOn: aStream.
	aStream nextPutAll: ' inplace: #'''; nextPutAll: (pair at: 1);
		nextPutAll: ''' binary: #'''; nextPutAll: (pair at: 2);
		nextPutAll: ''').'.
%

category: 'Grail-other'
method: AugAssignAst
printSmalltalkSubscriptAugAssignOn: aStream
	"Generate: obj __setitem__: slice _: ((obj __getitem__: slice)
	___augmentedOp___: value inplace: ... binary: ...).

	Through ___augmentedOp___ for the same reason the attribute emitter above
	is -- ``d[k] += [x]'' must extend the list already at d[k] rather than
	build a new one and store it over the top, and a forward dunder that
	DECLINES must reach the reflected one instead of storing NotImplemented
	under the key.  The read and the store are unchanged."

	| opStream binSel |
	opStream := AppendStream on: Unicode7 new.
	op printSmalltalkOn: opStream.
	binSel := opStream _contents trimSeparators.
	target value printSmalltalkWithParenthesisOn: aStream.
	aStream nextPutAll: ' __setitem__: '.
	target slice printSmalltalkWithParenthesisOn: aStream.
	aStream nextPutAll: ' _: (('.
	target value printSmalltalkWithParenthesisOn: aStream.
	aStream nextPutAll: ' __getitem__: '.
	target slice printSmalltalkWithParenthesisOn: aStream.
	aStream nextPut: $).
	aStream nextPutAll: ' @env1:___augmentedOp___: '.
	value printSmalltalkWithParenthesisOn: aStream.
	aStream nextPutAll: ' inplace: #''';
		nextPutAll: '__i' , (binSel copyFrom: 3 to: binSel size);
		nextPutAll: ''' binary: #'''; nextPutAll: binSel; nextPutAll: ''').'.
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
	dynamic-instVar-first load and store, or the accessor pair for one of the
	class's slots -- decided at emit by ___irSelfInferredSlotAccessor___),
	#attrForeign for any other receiver (``___pyAttrStore___:put:'' around
	``___pyAttrLoad___:''), #subscript for ``obj[i] op= v'', a plain index or a
	SLICE (``__setitem__:_:'' around ``__getitem__:''; a slice index emits
	SliceAst's own slice object, which is what the text prints here -- see
	___irComplexTargetShape___)."

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
		"A SLICE index needs nothing of its own.  The stand-down here read
		``the text's SliceAst spelling is SubscriptAst's own'', which is true
		of a subscript LOAD -- xs[i:j] compiles to the env-0 fast path
		``slice @env0:___newStart:stop:step:'' with nil for an omitted bound
		-- but not of this statement.  printSmalltalkSubscriptAugAssignOn:
		never prints the TARGET (its ctx is Store); it prints ``target
		slice'' directly, which is SliceAst's OWN ``slice @env1:__new__: lo
		_: hi _: st'' with None.  That is exactly what ___emitIRValueOn___:
		answers for a SliceAst, on both halves, so the #subscript arm
		mirrors the text for a slice without a line of its own."
		^ #subscript].
	^ nil
%

category: 'Grail-IR Codegen'
method: AugAssignAst
___irEligibleStatementLocals___: localNames
	"A class-cell write needs no local: the name is the ENCLOSING function's,
	reached through the two cells, and the value is judged below as usual."
	self ___irClassCellTargetName___ ifNotNil: [
		^ value ___irEligibleValueLocals___: localNames].
	^ ((self ___irLocalNameTarget___: localNames) notNil
			or: [self ___irModuleScopeNameTarget___ notNil
			or: [(self ___irComplexTargetKind___: localNames) notNil]])
		and: [self ___irSelectorPair___ notNil
		and: [value ___irEligibleValueLocals___: localNames]]
%

category: 'Grail-IR Codegen'
method: AugAssignAst
___irClassCellTargetName___
	"The target's name when this aug-assign writes an enclosing function's
	local from inside a method-local class's method, else nil -- exactly
	printSmalltalkOn:'s guard for its class-cell branch."

	^ ((target isKindOf: NameAst)
		and: [CallAst classBeingCompiled notNil
		and: [CallAst inClassBodyValueEmit ~~ true
		and: [CallAst inBasesEmit ~~ true
		and: [target ___enclosingFunctionLocalBeyondClass___: target id]]]])
			ifTrue: [target id]
			ifFalse: [nil]
%

category: 'Grail-IR Codegen'
method: AugAssignAst
___emitIRClassCellAugOn___: aBuilder name: nm
	"(self ___classCellSetter___: #'___cellSetter_x___') value:
	    ((self ___classCell___: #'___cell_x___')
	        ___augmentedOp___: (v) inplace: #'__ixxx__:' binary: #'__xxx__:')

	The ``value:'' is env 0: the setter is a Smalltalk one-argument block the
	enclosing frame handed to the class, and an env-1 value: cannot exist on
	ExecBlock."

	| pair v cell setter |
	CallAst addCapturedClassName: nm.
	CallAst addCapturedWriteName: nm.
	pair := self ___irSelectorPair___.
	v := value ___emitIRValueOn___: aBuilder.
	aBuilder atNode: self.
	cell := aBuilder
		send: #'___classCell___:' to: aBuilder selfNode
		with: { aBuilder obj: ('___cell_' , nm asString , '___') asSymbol } env: 1.
	setter := aBuilder
		send: #'___classCellSetter___:' to: aBuilder selfNode
		with: { aBuilder obj: ('___cellSetter_' , nm asString , '___') asSymbol } env: 1.
	aBuilder add: (aBuilder
		send: #value: to: setter
		with: { aBuilder
			send: #'___augmentedOp___:inplace:binary:' to: cell
			with: { v. aBuilder obj: (pair at: 1). aBuilder obj: (pair at: 2) } env: 1 }
		env: 0).
	^ self
%

category: 'Grail-IR Codegen'
method: AugAssignAst
___emitIRComplexTargetOn___: aBuilder kind: aKind
	"printSmalltalkAttributeAugAssignOn: / printSmalltalkSubscriptAugAssignOn:
	(cut 62).  Every shape routes the loaded current value through
	``___augmentedOp___:inplace:binary:'' -- the SAME runtime helper the
	simple-local branch uses -- and stores what it answers:
	  self @env0:dynamicInstVarAt: #x put: ((self @env0:dynamicInstVarAt: #x
	      ifAbsent: [self @env1:___pyAttrLoad___: #x])
	          @env1:___augmentedOp___: (v) inplace: #'__ixxx__:' binary: #'__xxx__:')
	  self ___pyattr_x___: ((self ___pyattr_x___)
	          @env1:___augmentedOp___: (v) inplace: #'__ixxx__:' binary: #'__xxx__:')
	  (obj) @env1:___pyAttrStore___: #x put: (((obj) @env1:___pyAttrLoad___: #x)
	          @env1:___augmentedOp___: (v) inplace: #'__ixxx__:' binary: #'__xxx__:')
	  (obj) __setitem__: (i) _: (((obj) __getitem__: (i))
	          @env1:___augmentedOp___: (v) inplace: #'__ixxx__:' binary: #'__xxx__:')
	The receiver (and index) expressions are emitted TWICE for the foreign and
	subscript shapes, as the text prints them twice.

	IT USED TO APPLY THE BARE BINARY SEND, and this docstring used to say the
	text did too.  That was true when cut 62 was written and stopped being true
	when the text emitters were corrected; the IR path kept the old shape, so
	two things silently did not happen for an attribute or subscript target:

	  * the IN-PLACE dunder.  ``self.lst += [2]'' built a new list and stored
	    it where CPython extends the existing one, so any other name bound to
	    it kept the old contents;
	  * the REFLECTED dunder.  A forward dunder that DECLINES had nothing after
	    it and its NotImplemented was STORED -- a value, not an error,
	    surfacing wherever the attribute was next read.

	The text path is the oracle, so the fix is to send what it sends rather
	than to reason afresh about which dunder is right here."

	| pair attr v load augOf |
	pair := self ___irSelectorPair___.
	"One place builds the helper send, so the four shapes cannot drift in which
	dunders they offer -- which is how they drifted from the text to begin with."
	augOf := [:aLoad :aValue |
		aBuilder send: #'___augmentedOp___:inplace:binary:' to: aLoad
			with: { aValue. aBuilder obj: (pair at: 1). aBuilder obj: (pair at: 2) }
			env: 1].
	aKind == #attrSelf ifTrue: [
		attr := target ___mangledAttr___ asSymbol.
		"A slot (declared __slots__, or inferred under GRAIL_INFERRED_SLOTS):
		both halves are accessor sends, ``self ___pyattr_x___: ((self
		___pyattr_x___) @env1:___augmentedOp___: (v) inplace: ... binary: ...)''."
		(target ___irSelfInferredSlotAccessor___) ifNotNil: [:acc |
			load := aBuilder send: acc to: aBuilder selfNode with: #() env: 1.
			v := value ___emitIRValueOn___: aBuilder.
			aBuilder atNode: self.
			aBuilder add: (aBuilder
				send: (acc , ':') asSymbol to: aBuilder selfNode
				with: { augOf value: load value: v } env: 1).
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
			with: { aBuilder obj: attr. augOf value: load value: v }
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
			with: { aBuilder obj: attr. augOf value: load value: v }
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
			with: { idx1. augOf value: load value: v }
			env: 1).
		^ self].
	^ Error signal: 'IR codegen: unhandled augmented target kind ' , aKind printString
%

category: 'Grail-IR Codegen'
method: AugAssignAst
___irModuleScopeNameTarget___
	"The target NameAst when ``x op= v'' stores to the MODULE instance -- a
	``global x'' declaration, or an unshadowed module variable -- else nil.

	``global c; c += 1'' has no local to augment: the parser strips a declared
	global from the scope's variables, so ___irLocalNameTarget___: answers nil
	(its own ``localSet includes:'' test fails, and isModuleScopeAugTarget:
	refuses it besides) and ___irComplexTargetKind___: only knows attribute and
	subscript targets.  The statement fell through both and refused.

	Decided by ___nameStoreRoutesToModule___:, the SAME four-way rule the plain
	assignment's store uses (AbstractNode).  Reading it here rather than
	re-deriving ``is this a global'' is the point: an aug-assign that routed its
	store differently from the plain assign beside it would put the read and the
	write in different places, which is exactly the shape the nested-def global
	cut had to fix."

	| tgt |
	(target isKindOf: NameAst) ifFalse: [^ nil].
	((target ctx) isKindOf: StoreAst) ifFalse: [^ nil].
	tgt := target.
	^ (self ___nameStoreRoutesToModule___: tgt id asSymbol)
		ifTrue: [tgt] ifFalse: [nil]
%

category: 'Grail-IR Codegen'
method: AugAssignAst
___emitIRModuleScopeAugOn___: aBuilder
	"printSmalltalkOn:'s module-scope branch, send for send:

	    <mod> dynamicInstVarAt: #'c' put: (
	        (<mod> dynamicInstVarAt: #'c'
	            ifAbsent: [NameError ___signal___: 'name ''c'' is not defined'])
	        ___augmentedOp___: (v) inplace: #'__iadd__:' binary: #'__add__:').

	THE READ IS GUARDED AND THE WRITE IS NOT, which is the asymmetry that makes
	an unbound global raise NameError rather than answering nil -- CPython's
	answer, and the one shape of this statement that is an error rather than a
	value.  The receiver is ___emitIRModuleReceiverOn___: (cut: delete-global)
	because a top-level def's ``self'' IS the module while a class method's is
	not, and spelling it twice is how the two would drift."

	| pair nameSym recv readSend augSend |
	pair := self ___irSelectorPair___.
	nameSym := target id asSymbol.
	recv := self ___emitIRModuleReceiverOn___: aBuilder.
	aBuilder atNode: self.
	readSend := aBuilder
		send: #'dynamicInstVarAt:ifAbsent:'
		to: recv
		with: { aBuilder obj: nameSym.
			aBuilder inBlockDo: [
				aBuilder add: (aBuilder
					send: #'___signal___:'
					to: (aBuilder globalNamed: #NameError)
					with: { aBuilder obj: 'name ''' , nameSym asString , ''' is not defined' })] }
		env: 0.
	augSend := aBuilder
		send: #'___augmentedOp___:inplace:binary:'
		to: readSend
		with: { value ___emitIRValueOn___: aBuilder.
			aBuilder obj: (pair at: 1). aBuilder obj: (pair at: 2) }.
	aBuilder atNode: self.
	aBuilder add: (aBuilder
		send: #'dynamicInstVarAt:put:'
		to: (self ___emitIRModuleReceiverOn___: aBuilder)
		with: { aBuilder obj: nameSym. augSend }
		env: 0).
	^ self
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
	"``nonlocal x; x op= v'' inside a method of a METHOD-LOCAL class: x is an
	enclosing-function local reached PAST the class, so this method has no
	lexical link to the outer temp and both halves go through the closure cells
	ClassDefAst emits at definition time -- the read cell ``___cell_x___'' and
	the setter cell ``___cellSetter_x___''.  printSmalltalkOn:'s own branch,
	send for send; addCapturedClassName:/addCapturedWriteName: are the
	compile-time bookkeeping that makes ClassDefAst carry those two cells."
	(self ___irClassCellTargetName___) ifNotNil: [:nm |
		^ self ___emitIRClassCellAugOn___: aBuilder name: nm].
	(target isKindOf: NameAst) ifFalse: [
		"Not the simple-local branch: an attribute or subscript target (cut
		62), dispatched on structure alone -- eligibility already judged its
		pieces, and the builder holds every leaf they read."
		^ self ___emitIRComplexTargetOn___: aBuilder kind: self ___irComplexTargetShape___].
	"A MODULE-scope name (``global c; c += 1''): no local to augment, so the
	read and the write both go to the module instance.  Tested after the
	structural branch above and before the local one below, because the target
	is a NameAst either way and only the SCOPE tells them apart."
	self ___irModuleScopeNameTarget___ ifNotNil: [
		^ self ___emitIRModuleScopeAugOn___: aBuilder].
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
