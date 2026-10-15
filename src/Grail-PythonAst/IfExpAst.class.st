"https://docs.python.org/3/library/ast.html#ast.IfExp

An expression such as a if b else c.

test is the condition.
body is the value if the condition is true.
orelse is the value if the condition is false.

Example:
>>> print(ast.dump(ast.parse('a if b else c', mode='eval'), indent=4))
Expression(
    body=IfExp(
        test=Name(id='b', ctx=Load()),
        body=Name(id='a', ctx=Load()),
        orelse=Name(id='c', ctx=Load())))

Hierarchy:
Object
  AbstractNode(parent)
    AbstractLocationNode(beginLine beginColumn endLine endColumn)
      ExpressionAst
        IfExpAst(test body orelse)

"
Class {
	#name : 'IfExpAst',
	#superclass : 'ExpressionAst',
	#instVars : [
		'test',
		'body',
		'orelse'
	],
	#category : 'Grail-Parser'
}

{ #category : 'Grail-IR Codegen' }
IfExpAst >> ___emitIRValueOn___: aBuilder [
	"``body if test else orelse'' -> ``((test) ___isTruthy___ ifTrue: [body]
	ifFalse: [orelse])'' -- printSmalltalkOn:'s shape, as an inlined VALUE."

	| condV |
	condV := aBuilder
		send: #'___isTruthy___'
		to: (test ___emitIRValueOn___: aBuilder)
		with: { }.
	aBuilder atNode: self.
	^ aBuilder
		ifValue: condV
		then: [aBuilder add: (body ___emitIRValueOn___: aBuilder)]
		else: [aBuilder add: (orelse ___emitIRValueOn___: aBuilder)]

]

{ #category : 'Grail-other' }
IfExpAst >> ___emitSmalltalkOn___: aStream [
	"Conditional expression ``body if test else orelse''.  The ``test''
	is evaluated for Python truthiness — None / 0 / empty containers /
	empty strings are falsy, everything else is truthy unless a user
	class overrides via __bool__ / __len__.  Smalltalk's
	``ifTrue:ifFalse:'' demands a Boolean, so route ``test'' through
	the universal ``___isTruthy___'' helper (defined on Object) before
	the conditional.  Mirrors what IfAst / WhileAst already emit; see
	TernaryTruthinessTestCase."

	aStream nextPutAll: '(('.
	test printSmalltalkWithParenthesisOn: aStream.
	aStream nextPutAll: ') ___isTruthy___ ifTrue: ['.
	body printSmalltalkOn: aStream.
	aStream nextPutAll: '] ifFalse: ['.
	orelse printSmalltalkOn: aStream.
	aStream nextPutAll: '])'.

]

{ #category : 'Grail-IR Codegen' }
IfExpAst >> ___irEligibleValueLocals___: localNames [
	^ (test ___irEligibleValueLocals___: localNames)
		and: [(body ___irEligibleValueLocals___: localNames)
		and: [orelse ___irEligibleValueLocals___: localNames]]

]

{ #category : 'Grail-IR Codegen' }
IfExpAst >> ___irReadLocalNamesInto___: aSet locals: localSet [
	test ___irReadLocalNamesInto___: aSet locals: localSet.
	body ___irReadLocalNamesInto___: aSet locals: localSet.
	orelse ___irReadLocalNamesInto___: aSet locals: localSet.
	^ self

]

{ #category : 'Grail-other' }
IfExpAst >> body [
	^body

]

{ #category : 'Grail-other' }
IfExpAst >> body: newValue [
	body := newValue

]

{ #category : 'Grail-other' }
IfExpAst >> orelse [
	^orelse

]

{ #category : 'Grail-other' }
IfExpAst >> orelse: newValue [
	orelse := newValue

]

{ #category : 'Grail-traceback' }
IfExpAst >> printSmalltalkOn: aStream [
	"Recorded, then emitted -- see AbstractNode >> ___recordingPrintSmalltalkOn___:."

	^ self ___recordingPrintSmalltalkOn___: aStream

]

{ #category : 'Grail-other' }
IfExpAst >> test [
	^test

]

{ #category : 'Grail-other' }
IfExpAst >> test: newValue [
	test := newValue

]
