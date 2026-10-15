"https://docs.python.org/3/library/ast.html#ast.If

An if statement.

test holds the condition.
body is a list of nodes.
orelse is a list of nodes for the else clause.

Example:
>>> print(ast.dump(ast.parse('if x:\\n    ...\\nelse:\\n    ...'), indent=4))
Module(
    body=[
        If(
            test=Name(id='x', ctx=Load()),
            body=[Expr(value=Constant(value=Ellipsis))],
            orelse=[Expr(value=Constant(value=Ellipsis))])])

Hierarchy:
Object
  AbstractNode(parent)
    AbstractLocationNode(beginLine beginColumn endLine endColumn)
      StatementAst
        IfAst(test body orelse)

"
Class {
	#name : 'IfAst',
	#superclass : 'StatementAst',
	#instVars : [
		'test',
		'body',
		'orelse'
	],
	#category : 'Grail-Parser'
}

{ #category : 'Grail-IR Codegen' }
IfAst >> ___emitIRStatementOn___: aBuilder [
	"(test) ___isTruthy___ ifTrue: [body] ifFalse: [orelse]."

	| condV |
	condV := aBuilder
		send: #'___isTruthy___'
		to: (test ___emitIRValueOn___: aBuilder)
		with: { }.
	aBuilder atNode: self.
	(orelse notNil and: [orelse size > 0])
		ifTrue: [aBuilder
			if: condV
			then: [body ___emitIRStatementsOn___: aBuilder]
			else: [orelse ___emitIRStatementsOn___: aBuilder]]
		ifFalse: [aBuilder
			if: condV
			then: [body ___emitIRStatementsOn___: aBuilder]].
	^ self

]

{ #category : 'Grail-IR Codegen' }
IfAst >> ___irEligibleStatementLocals___: localNames [
	^ (test ___irEligibleValueLocals___: localNames)
		and: [(body ___irEligibleStatementsWithLocals___: localNames)
		and: [self ___irOrelseEligible___: localNames]]

]

{ #category : 'Grail-IR Codegen' }
IfAst >> ___irFlowBound___: boundIn locals: localSet [
	"The test's reads must be bound; each branch walks from boundIn; bound
	afterwards is what BOTH branches bind (an absent else binds nothing).  A
	branch that ends in a terminator answers every local, so ``if c: return
	0'' leaves the other branch's bindings in force."

	| thenOut elseOut entry |
	(self ___irFlowReadsBound___: test in: boundIn locals: localSet)
		ifFalse: [^ nil].
	"A walrus evaluated unconditionally in the test (``if (m := f()):'', cut
	69) is bound on both branches and after the statement."
	entry := boundIn copy.
	(test ___irWalrusTargetNames___: localSet) do: [:n | entry add: n].
	thenOut := body ___irFlowBound___: entry locals: localSet.
	thenOut isNil ifTrue: [^ nil].
	elseOut := (orelse notNil and: [orelse size > 0])
		ifTrue: [orelse ___irFlowBound___: entry locals: localSet]
		ifFalse: [entry].
	elseOut isNil ifTrue: [^ nil].
	^ self ___irFlowMeet___: thenOut with: elseOut

]

{ #category : 'Grail-IR Codegen' }
IfAst >> ___irOrelseEligible___: localNames [
	"The else-branch: absent, or a BlockAst whose statements are all emittable.
	An elif compiles to a nested IfAst inside a BlockAst, so this recurses."

	(orelse isNil or: [orelse size = 0]) ifTrue: [^ true].
	((orelse isKindOf: BlockAst) or: [orelse isKindOf: SuiteAst])
		ifFalse: [^ false].
	^ orelse ___irEligibleStatementsWithLocals___: localNames

]

{ #category : 'Grail-IR Codegen' }
IfAst >> ___irReadLocalNamesInto___: aSet locals: localSet [
	test ___irReadLocalNamesInto___: aSet locals: localSet.
	body ___irReadLocalNamesInto___: aSet locals: localSet.
	(orelse notNil and: [orelse size > 0])
		ifTrue: [orelse ___irReadLocalNamesInto___: aSet locals: localSet].
	^ self

]

{ #category : 'Grail-IR Codegen' }
IfAst >> ___irWriteLocalNamesInto___: aSet locals: localSet [
	body ___irWriteLocalNamesInto___: aSet locals: localSet.
	(orelse notNil and: [orelse size > 0])
		ifTrue: [orelse ___irWriteLocalNamesInto___: aSet locals: localSet].
	^ self

]

{ #category : 'Grail-accessing' }
IfAst >> body [
	^ body

]

{ #category : 'Grail-printing' }
IfAst >> body: newValue [
	body := newValue

]

{ #category : 'Grail-accessing' }
IfAst >> orelse [
	^ orelse

]

{ #category : 'Grail-printing' }
IfAst >> orelse: newValue [
	orelse := newValue

]

{ #category : 'Grail-printing' }
IfAst >> printSmalltalkOn: aStream [

	test printSmalltalkWithParenthesisOn: aStream.
	aStream nextPutAll: ' ___isTruthy___ ifTrue: ['; increaseIndent; lf.
	body printSmalltalkOn: aStream.
	(orelse notNil and: [orelse size > 0]) ifTrue: [
		aStream decreaseIndent; nextPutAll: '] ifFalse: ['; increaseIndent; lf.
		orelse printSmalltalkOn: aStream.
	].
	aStream decreaseIndent; nextPutAll: '].'.

]

{ #category : 'Grail-other' }
IfAst >> test [
	^ test

]

{ #category : 'Grail-printing' }
IfAst >> test: newValue [
	test := newValue

]
