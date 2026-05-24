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
			((eachTgt value isKindOf: NameAst)
				and: [CallAst isSelfReference: eachTgt value id])
				ifTrue: [
					aStream nextPutAll: eachTgt attr; nextPutAll: ' := ___chain___. '
				]
				ifFalse: [
					eachTgt value printSmalltalkWithParenthesisOn: aStream.
					aStream nextPutAll: ' @env1:'; nextPutAll: eachTgt attr;
						nextPutAll: ': ___chain___. '
				]
		] ifFalse: [
			(eachTgt isKindOf: SubscriptAst) ifTrue: [
				eachTgt value printSmalltalkWithParenthesisOn: aStream.
				aStream nextPutAll: ' __setitem__: '.
				eachTgt slice printSmalltalkWithParenthesisOn: aStream.
				aStream nextPutAll: ' _: ___chain___. '
			] ifFalse: [
				"Plain NameAst (or TupleAst/ListAst — rare chained with tuples)."
				eachTgt printSmalltalkOn: aStream.
				aStream nextPutAll: ' := ___chain___. '
			]
		]
	].
	aStream nextPutAll: '] value.'.
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
					sliceExpr := holder , ' __getslice__: ' , (i - 1) printString , ' _: '
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
		"obj.attr = rhs — use the attribute-store helper."
		((aTarget value isKindOf: NameAst)
			and: [CallAst isSelfReference: aTarget value id]) ifTrue: [
			aStream nextPutAll: aTarget attr; nextPutAll: ' := '; nextPutAll: rhs; nextPutAll: '. '.
			^ self
		].
		aTarget value printSmalltalkWithParenthesisOn: aStream.
		aStream
			nextPutAll: ' @env1:';
			nextPutAll: aTarget attr;
			nextPutAll: ': (';
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
	"Default: NameAst / starred wrapper — bare assignment."
	aTarget printSmalltalkOn: aStream.
	aStream nextPutAll: ' := '; nextPutAll: rhs; nextPutAll: '. '
%

category: 'Grail-other'
method: AssignAst
printSmalltalkAttributeStoreOn: aStream target: tgt
	"Generate attribute store.

	When in class method context and target is self.x,
	emit direct instVar assignment: `x := expr.`
	Otherwise: emit a setter send `obj @env1:attr: expr.` — generated
	classes have explicit setters compiled by compileClassDef.  This
	also works for module instVars (modules also receive setters
	via the per-name accessor generation in loadModuleFromPath)."

	((tgt value isKindOf: NameAst) and: [CallAst isSelfReference: tgt value id]) ifTrue: [
		"Route through the generated setter rather than a bare instVar
		write.  Python parameters can be declared as block temps that
		shadow same-named instVars (see FunctionDefAst
		generateMethodSourceOn:); the setter is a method, so
		dispatch bypasses lexical scope and reaches the slot.  When
		the attr is a class-side declaration (in classAttrNames) we
		need the env-1 attribute path so the metaclass setter fires —
		fall through to the runtime form for that case."
		(CallAst classAttrNames notNil
			and: [CallAst classAttrNames includes: tgt attr asSymbol])
			ifTrue: [
				aStream nextPutAll: 'self @env1:'.
				aStream nextPutAll: tgt attr.
				aStream nextPutAll: ': '.
				value printSmalltalkWithParenthesisOn: aStream.
				aStream nextPut: $..
				^self
			].
		aStream nextPutAll: 'self '.
		aStream nextPutAll: tgt attr.
		aStream nextPutAll: ': '.
		value printSmalltalkWithParenthesisOn: aStream.
		aStream nextPut: $..
		^self
	].
	tgt value printSmalltalkWithParenthesisOn: aStream.
	aStream nextPutAll: ' @env1:'.
	aStream nextPutAll: tgt attr.
	aStream nextPutAll: ': '.
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
