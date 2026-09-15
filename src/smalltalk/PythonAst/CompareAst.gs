! ------------------- Superclass check
run
ExpressionAst ifNil: [self error: 'ExpressionAst is not defined. Check file ordering.'].
%

! ------------------- Class definition for CompareAst
expectvalue /Class
doit
ExpressionAst subclass: 'CompareAst'
  instVarNames: #( left cmpopList comparatorList rhsTemp opTemps)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonAst
  options: #()

%

expectvalue /Class
doit
CompareAst comment:
'https://docs.python.org/3/library/ast.html#ast.Compare

A comparison of two or more values.

left is the first value in the comparison.
ops is the list of operators.
comparators is the list of values after the first element in the comparison.

Example:
>>> print(ast.dump(ast.parse(''1 <= a < 10'', mode=''eval''), indent=4))
Expression(
    body=Compare(
        left=Constant(value=1),
        ops=[LtE(), Lt()],
        comparators=[Name(id=''a'', ctx=Load()), Constant(value=10)]))

Hierarchy:
Object
  AbstractNode(parent)
    AbstractLocationNode(beginLine beginColumn endLine endColumn)
      ExpressionAst
        CompareAst(left ops comparators)
'
%

expectvalue /Class
doit
CompareAst category: 'Grail-Parser'
%

! ------------------- Remove existing behavior from CompareAst
removeallmethods CompareAst
removeallclassmethods CompareAst

set compile_env: 0

category: 'Grail-traceback'
method: CompareAst
printSmalltalkOn: aStream
	"Recorded, then emitted -- see AbstractNode >> ___recordingPrintSmalltalkOn___:."

	^ self ___recordingPrintSmalltalkOn___: aStream
%

category: 'Grail-other'
method: CompareAst
___emitSmalltalkOn___: aStream

	"Chained: a < b < c → (((a) __lt__: (___1 := b)) and: [(___1) __lt__: (c)])"
	1 to: cmpopList size do: [:i |
		| thisLeft subRight |
		thisLeft := i == 1 ifTrue: [left] ifFalse: [nil].
		subRight := comparatorList copyFrom: i to: comparatorList size.
		(cmpopList at: i) printSmalltalkOn: aStream left: thisLeft rightList: subRight rhsTemp: rhsTemp lhsTemp: (opTemps ifNotNil: [opTemps at: i]).
		i < cmpopList size ifTrue: [aStream nextPutAll: ' and: ['].
	].
	cmpopList size - 1 timesRepeat: [aStream nextPutAll: ']'].
%

category: 'Grail-initialization'
method: CompareAst
setParent: aNode

	super setParent: aNode.
	(rhsTemp isNil and: [cmpopList size > 1]) ifTrue: [
		rhsTemp := self allocateTemp.
		opTemps := Array new: cmpopList size.
		1 to: cmpopList size - 1 do: [:i |
			| op |
			op := cmpopList at: i.
			((op isKindOf: InAst) or: [op isKindOf: NotInAst]) ifTrue: [
				opTemps at: i put: self allocateTemp.
			].
		].
	].
%
method: CompareAst
left
	^left
%
method: CompareAst
left: newValue
	left := newValue
%
method: CompareAst
cmpopList
	^cmpopList
%
method: CompareAst
cmpopList: newValue
	cmpopList := newValue
%
method: CompareAst
comparatorList
	^comparatorList
%
method: CompareAst
comparatorList: newValue
	comparatorList := newValue
%
method: CompareAst
rhsTemp
	^rhsTemp
%
method: CompareAst
rhsTemp: newValue
	rhsTemp := newValue
%
method: CompareAst
opTemps
	^opTemps
%
method: CompareAst
opTemps: newValue
	opTemps := newValue
%

category: 'Grail-IR Codegen'
method: CompareAst
___irCmpHelperSelector___
	"For an UNCHAINED rich comparison (==, !=, <, <=, >, >=), the ___cmpXx___:
	helper selector object>>printSmalltalkOn: routes through; nil for a chained
	comparison (needs temps + and:-blocks) or is/is-not/in/not-in (bare send)."

	| opStream sel helper |
	cmpopList size == 1 ifFalse: [^ nil].
	"``is''/``in'' and friends override only printSmalltalkOn:left:rightList: and
	RAISE from the bare printSmalltalkOn: -- so guard it and treat any such op as
	ineligible (nil) rather than letting the probe raise."
	sel := [opStream := AppendStream on: Unicode7 new.
		(cmpopList at: 1) printSmalltalkOn: opStream.
		opStream _contents trimSeparators] on: Error do: [:ex | ^ nil].
	helper := (cmpopList at: 1) ___cmpHelperFor___: sel.
	^ helper ifNotNil: [:h | h asSymbol]
%

category: 'Grail-IR Codegen'
method: CompareAst
___irOpHelperAt___: i
	"The ___cmpXx___: helper selector for the i-th op of this comparison, or nil
	for is/is-not/in/not-in (whose bare printSmalltalkOn: raises -- guarded, as
	eligibility must never raise)."

	| opStream sel helper |
	sel := [opStream := AppendStream on: Unicode7 new.
		(cmpopList at: i) printSmalltalkOn: opStream.
		opStream _contents trimSeparators] on: Error do: [:ex | ^ nil].
	helper := (cmpopList at: i) ___cmpHelperFor___: sel.
	^ helper ifNotNil: [:h | h asSymbol]
%

category: 'Grail-IR Codegen'
method: CompareAst
___irEligibleValueLocals___: localNames
	"Unchained: one rich-comparison helper send, or one of the four
	non-rich ops.  Chained (a < b < c): every op must be one the chain folder
	can spell, and the parse must have allocated the shared rhsTemp.

	``is'' and ``in'' USED TO REFUSE A CHAIN outright -- they are not rich
	comparisons, so ___irOpHelperAt___: answers nil for them, and the folder had
	only the helper-send shape.  The unchained arm has always emitted all four;
	what the chain adds is the SECOND temp a non-final ``in'' needs, and setParent:
	already allocates it (opTemps).  So the refusal was the folder's, not the
	shape's: ``type(n) is int is type(d)'' (fractions.Fraction.__new__) and
	``request[0] == request[-1] in (<two quote literals>)'' (pydoc.Helper.interact)
	are the two stdlib spellings it was keeping out."

	cmpopList size == 1 ifTrue: [
		^ (self ___irChainOpSpellableAt___: 1)
			and: [(left ___irEligibleValueLocals___: localNames)
			and: [(comparatorList at: 1) ___irEligibleValueLocals___: localNames]]].
	rhsTemp isNil ifTrue: [^ false].
	(1 to: cmpopList size) do: [:i |
		(self ___irChainOpSpellableAt___: i) ifFalse: [^ false].
		"A NON-FINAL membership test stages its container in a temp of its own,
		which setParent: allocates only for InAst / NotInAst.  A tree whose
		opTemps the parse never filled cannot be folded, so refuse rather than
		invent a name the text does not use."
		(i < cmpopList size and: [self ___irOpIsMembershipAt___: i])
			ifTrue: [(opTemps notNil and: [(opTemps at: i) notNil]) ifFalse: [^ false]]].
	(left ___irEligibleValueLocals___: localNames) ifFalse: [^ false].
	^ comparatorList allSatisfy: [:c | c ___irEligibleValueLocals___: localNames]
%

category: 'Grail-IR Codegen'
method: CompareAst
___irOpIsMembershipAt___: i
	"Is the i-th op ``in'' or ``not in'' -- the two that reverse their operands,
	so the CONTAINER is the Smalltalk receiver?"

	| op |
	op := cmpopList at: i.
	^ (op isMemberOf: InAst) or: [op isMemberOf: NotInAst]
%

category: 'Grail-IR Codegen'
method: CompareAst
___irChainOpSpellableAt___: i
	"Can the i-th op be emitted at all -- a rich comparison through its
	___cmpXx___: helper, or one of is / is not / in / not in?"

	| op |
	(self ___irOpHelperAt___: i) notNil ifTrue: [^ true].
	op := cmpopList at: i.
	^ (op isMemberOf: IsAst)
		or: [(op isMemberOf: IsNotAst)
		or: [self ___irOpIsMembershipAt___: i]]
%

category: 'Grail-IR Codegen'
method: CompareAst
___emitIRValueOn___: aBuilder
	"``a <op> b'' (unchained) -> ``a ___cmpXx___: b'' (one keyword send).
	Chained -> printSmalltalkOn:'s temp + and:-block shape, e.g. a < b < c:

	  (((a) ___cmpLt___: (___1 := b)) and: [((___1) ___cmpLt___: (c))])

	Each middle comparator is captured into the parse-allocated rhsTemp as an
	assignment EXPRESSION and re-read as the next op's left operand, so every
	operand is evaluated at most once and only as far as the chain gets --
	Python's chain semantics.  The and: is a real env-0 send to the Boolean
	(kernel Boolean>>and:), semantically identical to text's inlined and:."

	cmpopList size == 1 ifTrue: [
		^ self ___emitIROpAt___: 1
			left: (left ___emitIRValueOn___: aBuilder)
			right: ((comparatorList at: 1) ___emitIRValueOn___: aBuilder)
			carry: nil
			on: aBuilder].
	(aBuilder leafFor: rhsTemp asSymbol)
		ifNil: [aBuilder tempNamed: rhsTemp asSymbol].
	"...and the per-op container temps the parse allocated for a non-final
	membership test.  Declared here, with the shared temp, rather than where
	they are first used: a method temp belongs to the frame, and the chain may
	be emitted from inside a block."
	opTemps ifNotNil: [
		opTemps do: [:t |
			t ifNotNil: [
				(aBuilder leafFor: t asSymbol) ifNil: [aBuilder tempNamed: t asSymbol]]]].
	^ self ___emitIRChainFrom___: 1 on: aBuilder
%

category: 'Grail-IR Codegen'
method: CompareAst
___emitIROpAt___: i left: leftV right: rightV carry: carryOrNil on: aBuilder
	"ONE comparison of this node -- the whole node when unchained, one link
	when chained -- with leftV and rightV already emitted.

	carryOrNil is the assignment that threads a non-final MEMBERSHIP test's
	container into the shared chain temp: ``in'' reverses its operands, so the
	container is the receiver and cannot be captured by the caller's ordinary
	``rhs := <comparator>'' the way a rich comparison's right operand is.  The
	text answers that with ___ignore:, which evaluates the copy and still yields
	the membership result, and so does this."

	| op helper |
	op := cmpopList at: i.
	helper := self ___irOpHelperAt___: i.
	aBuilder atNode: self.
	helper notNil ifTrue: [
		^ aBuilder send: helper to: leftV with: { rightV }].
	"``a is b'' -> ((a) == (b)); ``a is not b'' -> ((a) ~~ (b)) -- real
	env-0 sends to the kernel identity tests (see cut 15 on why not the
	special opcodes)."
	(op isMemberOf: IsAst) ifTrue: [
		^ aBuilder send: #== to: leftV with: { rightV } env: 0].
	(op isMemberOf: IsNotAst) ifTrue: [
		^ aBuilder send: #~~ to: leftV with: { rightV } env: 0].
	"``a in b'' -> ((b) ___pyContains___: (a)) -- the CONTAINER receives.
	``a not in b'' adds ___isTruthy___ then env-0 not, as NotInAst's
	printer does (___pyContains___: may answer a non-Boolean)."
	(self ___irOpIsMembershipAt___: i) ifTrue: [
		| contains truthy |
		contains := aBuilder send: #'___pyContains___:' to: rightV with: { leftV }.
		carryOrNil ifNotNil: [:carry |
			contains := aBuilder send: #'___ignore:' to: contains with: { carry }].
		(op isMemberOf: InAst) ifTrue: [^ contains].
		truthy := aBuilder send: #'___isTruthy___' to: contains with: { }.
		^ aBuilder send: #not to: truthy with: { } env: 0].
	^ Error signal: 'IR codegen: unhandled comparison op ' , op class name asString
%

category: 'Grail-IR Codegen'
method: CompareAst
___emitIRChainFrom___: i on: aBuilder
	"The i-th comparison of the chain, and:-folded with the rest."

	| leaf leftV rightV carry isLast cmp blk |
	leaf := aBuilder leafFor: rhsTemp asSymbol.
	leftV := i = 1
		ifTrue: [left ___emitIRValueOn___: aBuilder]
		ifFalse: [aBuilder var: leaf].
	isLast := i = cmpopList size.
	carry := nil.
	(isLast not and: [self ___irOpIsMembershipAt___: i])
		ifTrue: [
			"The container is the receiver, so it is staged in its OWN temp and
			copied into the shared one afterwards -- see ___emitIROpAt___:'s
			carry argument."
			| own |
			own := aBuilder leafFor: (opTemps at: i) asSymbol.
			rightV := aBuilder assign: own
				from: ((comparatorList at: i) ___emitIRValueOn___: aBuilder).
			carry := aBuilder assign: leaf from: (aBuilder var: own)]
		ifFalse: [
			rightV := isLast
				ifTrue: [(comparatorList at: i) ___emitIRValueOn___: aBuilder]
				ifFalse: [aBuilder
					assign: leaf
					from: ((comparatorList at: i) ___emitIRValueOn___: aBuilder)]].
	cmp := self ___emitIROpAt___: i left: leftV right: rightV carry: carry on: aBuilder.
	isLast ifTrue: [^ cmp].
	blk := aBuilder inBlockDo: [
		aBuilder add: (self ___emitIRChainFrom___: i + 1 on: aBuilder)].
	aBuilder atNode: self.
	^ aBuilder send: #and: to: cmp with: { blk } env: 0
%

category: 'Grail-IR Codegen'
method: CompareAst
___irReadLocalNamesInto___: aSet locals: localSet
	left ___irReadLocalNamesInto___: aSet locals: localSet.
	comparatorList do: [:c | c ___irReadLocalNamesInto___: aSet locals: localSet].
	^ self
%

category: 'Grail-IR Codegen'
method: CompareAst
___irWalrusTargetNames___: localSet
	| names |
	names := left ___irWalrusTargetNames___: localSet.
	comparatorList do: [:c | names := names , (c ___irWalrusTargetNames___: localSet)].
	^ names
%

category: 'Grail-IR Codegen'
method: CompareAst
___irStampChild___
	^ left
%
