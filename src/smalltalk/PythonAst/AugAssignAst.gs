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
	"Simple (local Name) target.  CPython augmented assignment tries the
	in-place dunder (``a.__iadd__(b)'') first and only falls back to the
	binary dunder (``a.__add__(b)'') when the type has no in-place form.
	Derive the in-place selector from the operator's binary selector
	(``__add__:'' -> ``__iadd__:'') and route both through the runtime
	helper ``object>>___augmentedOp___:inplace:binary:''.  (Attribute /
	subscript / module-scope targets keep the plain binary form above.)"
	opStream := WriteStream on: String new.
	op printSmalltalkOn: opStream.
	binSel := opStream contents trimSeparators.
	iSel := '__i' , (binSel copyFrom: 3 to: binSel size).
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
			and: [CallAst classSlotNames includes: target attr asSymbol]) ifTrue: [
			"``<slot> := (<slot> ifNil: [...]) op value'' — bare mangled
			instVar (this method compiles on the slotted class); the single
			wrapping paren makes ``ifNil:'' bind before the ``op'' send."
			aStream
				nextPutAll: '___slot_';
				nextPutAll: target attr;
				nextPutAll: '___ := (___slot_';
				nextPutAll: target attr;
				nextPutAll: '___ ifNil: [self @env1:___pyAttrLoad___: #''';
				nextPutAll: target attr;
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
			nextPutAll: target attr;
			nextPutAll: ''' put: ((self @env0:dynamicInstVarAt: #''';
			nextPutAll: target attr;
			nextPutAll: ''' ifAbsent: [self @env1:___pyAttrLoad___: #''';
			nextPutAll: target attr;
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
	aStream nextPutAll: target attr.
	aStream nextPutAll: ''' put: (('.
	target value printSmalltalkWithParenthesisOn: aStream.
	aStream nextPutAll: ' @env1:___pyAttrLoad___: #''';
		nextPutAll: target attr;
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
