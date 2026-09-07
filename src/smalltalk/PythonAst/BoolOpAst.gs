! ------------------- Superclass check
run
ExpressionAst ifNil: [self error: 'ExpressionAst is not defined. Check file ordering.'].
%

! ------------------- Class definition for BoolOpAst
expectvalue /Class
doit
ExpressionAst subclass: 'BoolOpAst'
  instVarNames: #( values)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonAst
  options: #()

%

expectvalue /Class
doit
BoolOpAst comment:
'https://docs.python.org/3/library/ast.html#ast.BoolOp

A boolean operation, ''or'' or ''and''.

op is Or or And.
values are the values involved. Consecutive operations with the same
operator, such as a or b or c, are collapsed into one node with several values.

This doesn''t include not, which is a UnaryOp.

Example:
>>> print(ast.dump(ast.parse(''x or y'', mode=''eval''), indent=4))
Expression(
    body=BoolOp(
        op=Or(),
        values=[
            Name(id=''x'', ctx=Load()),
            Name(id=''y'', ctx=Load())]))

Hierarchy:
Object
  AbstractNode(parent)
    AbstractLocationNode(beginLine beginColumn endLine endColumn)
      ExpressionAst
        BoolOpAst(op values)
'
%

expectvalue /Class
doit
BoolOpAst category: 'Grail-Parser'
%

! ------------------- Remove existing behavior from BoolOpAst
removeallmethods BoolOpAst
removeallclassmethods BoolOpAst

set compile_env: 0

category: 'Grail-other'
classmethod: BoolOpAst
isAbstract

	^self == BoolOpAst
%
method: BoolOpAst
values
	^values
%
method: BoolOpAst
values: newValue
	values := newValue
%

category: 'Grail-IR Codegen'
method: BoolOpAst
___irBoolHelperSelector___
	"The value-preserving short-circuit helper (#___pyAnd___: / #___pyOr___:);
	nil on the abstract base."

	^ nil
%

category: 'Grail-traceback'
method: BoolOpAst
___curPosNarrowSpanNode___
	"The FIRST operand -- the only one evaluated before any short-circuit block
	runs, and so the one a statement-level ``___curPos___'' store should name.

	CPython blames whichever operand raised: ``1 / 0 and 2.0'' reports the
	division and ``2.0 and 1 / 0'' reports the division too, at its own columns.
	Naming the whole ``and'' underlines operands that never ran.  Recursive, so
	``(a and b) or c'' reaches ``a''.

	Falls back to self when the first operand has no full span, because a store
	built from a partial one records nothing and displaces the enclosing store
	(___hasFullPositionSpan___)."

	| first |
	values isNil ifTrue: [^ self].
	values isEmpty ifTrue: [^ self].
	first := (values at: 1) ifNil: [nil] ifNotNil: [:v | v ___curPosNarrowSpanNode___].
	first isNil ifTrue: [^ self].
	^ first ___hasFullPositionSpan___ ifTrue: [first] ifFalse: [self]
%

category: 'Grail-traceback'
method: BoolOpAst
___curPosLiteralForOperand___: aNode
	"A position literal naming aNode, for a store at the top of the block that
	guards it -- or nil when such a store would be meaningless or unsafe.

	Emitted only where a store means anything (inside a function or a module
	body, the test ___emitCurPosBefore:on: uses) and only when an enclosing
	store is known, because a block-scoped store has to be textually undone
	afterwards and there would be nothing to put back."

	((CallAst functionBeingCompiled notNil
		or: [CallAst moduleBodyBeingCompiled])
			and: [CallAst curPosLiteralInEffect notNil]) ifFalse: [^ nil].
	aNode ___hasFullPositionSpan___ ifFalse: [^ nil].
	^ [aNode ___pyPositionLiteralArray] on: Error do: [:ex | ex return: nil]
%

category: 'Grail-other'
method: BoolOpAst
printSmalltalkOn: aStream
	"``a and b'' / ``a or b'' -- Python answers the OPERAND, not a Boolean, so
	both emit through the value-preserving helper (``___pyAnd___:'' /
	``___pyOr___:'') with every operand after the first inside a block:

	    ((v1) ___pyAnd___: [((v2) ___pyAnd___: [v3])])

	EACH BLOCK CARRIES ITS OPERAND'S POSITION.  CPython blames whichever operand
	raised, so ``2.0 and 1 / 0'' underlines the division at columns 17..22 --
	while a single statement-level store can only name one span, and named the
	whole expression.  The first operand needs no store here: it runs before any
	block, and ___curPosSpanNodeFor___: already narrows the statement's own
	store onto it.

	THREE THINGS THE STORE NEEDS, none of them guessable; see
	[[curpos-store-in-a-block-needs-a-restore]].  A block TEMP, so the run-time
	value the enclosing frame reads is untouched and this stays purely textual.
	A LINE BREAK before the closing bracket, because the scan works at line
	granularity and a restore sharing a line with the operand is found by the
	operand's own ip.  And a textual RESTORE after the bracket, since the scan
	knows nothing about block nesting and would otherwise hand the enclosing
	frame this operand's span."

	| sel n saved lit outer |
	sel := self ___irBoolHelperSelector___.
	sel isNil ifTrue: [^ self error: 'BoolOpAst is abstract'].
	n := values size.
	saved := Array new: (n - 1 max: 0).
	1 to: n - 1 do: [:i |
		aStream nextPutAll: '(('.
		(values at: i) printSmalltalkOn: aStream.
		aStream nextPutAll: ') '; nextPutAll: sel asString; nextPutAll: ' ['.
		outer := CallAst curPosLiteralInEffect.
		lit := self ___curPosLiteralForOperand___: (values at: i + 1).
		lit isNil
			ifTrue: [saved at: i put: nil]
			ifFalse: [
				saved at: i put: outer.
				"A LINE BREAK BEFORE THE STORE as well as after it.  The opening
				``['' sits at the end of the line that also holds the operand
				BEFORE it, and the scan takes the last store on the ip's line --
				so a store left on that line is what ``1 / 0 and 2.0'' finds when
				the DIVISION raises, and the caret lands on ``2.0''.  Measured
				exactly that way: 19..22 where CPython says 9..14."
				aStream lf; nextPutAll: '| ___curPos___ | ___curPos___ := ';
					nextPutAll: lit; nextPutAll: '.'; lf.
				CallAst curPosLiteralInEffect: lit]].
	(values at: n) printSmalltalkOn: aStream.
	n - 1 to: 1 by: -1 do: [:i |
		(saved at: i) isNil ifFalse: [aStream lf].
		aStream nextPut: $].
		(saved at: i) isNil ifFalse: [
			self ___emitCurPosRestoreCommentFor___: (saved at: i) on: aStream.
			CallAst curPosLiteralInEffect: (saved at: i)].
		aStream nextPut: $)]
%

category: 'Grail-IR Codegen'
method: BoolOpAst
___irEligibleValueLocals___: localNames
	^ (self ___irBoolHelperSelector___ notNil)
		and: [values allSatisfy: [:v | v ___irEligibleValueLocals___: localNames]]
%

category: 'Grail-IR Codegen'
method: BoolOpAst
___irEmitBool___: i helper: helper on: aBuilder
	"Right-fold: ((v1) helper: [(v2) helper: [ ... vn ]]).  Each tail operand is
	wrapped in a block so the helper evaluates it lazily (short-circuit)."

	| leftV blk |
	i = values size ifTrue: [^ (values at: i) ___emitIRValueOn___: aBuilder].
	leftV := (values at: i) ___emitIRValueOn___: aBuilder.
	blk := aBuilder inBlockDo: [
		aBuilder add: (self ___irEmitBool___: i + 1 helper: helper on: aBuilder)].
	aBuilder at: self beginPosition.
	^ aBuilder send: helper to: leftV with: { blk } env: 1
%

category: 'Grail-IR Codegen'
method: BoolOpAst
___emitIRValueOn___: aBuilder
	^ self ___irEmitBool___: 1 helper: self ___irBoolHelperSelector___ on: aBuilder
%

category: 'Grail-IR Codegen'
method: BoolOpAst
___irReadLocalNamesInto___: aSet locals: localSet
	values do: [:v | v ___irReadLocalNamesInto___: aSet locals: localSet].
	^ self
%
