"https://docs.python.org/3/library/ast.html#ast.Assert

An assertion.

test holds the condition, such as a Compare node.
msg holds the failure message (can be None).

Example:
>>> print(ast.dump(ast.parse('assert x, ""error""'), indent=4))
Module(
    body=[
        Assert(
            test=Name(id='x', ctx=Load()),
            msg=Constant(value='error'))])

Hierarchy:
Object
  AbstractNode(parent)
    AbstractLocationNode(beginLine beginColumn endLine endColumn)
      StatementAst
        AssertAst(test msg)

"
Class {
	#name : 'AssertAst',
	#superclass : 'StatementAst',
	#instVars : [
		'test',
		'msg'
	],
	#category : 'Grail-Parser'
}

{ #category : 'Grail-IR Codegen' }
AssertAst >> ___emitIRStatementOn___: aBuilder [
	"printSmalltalkOn:'s shape: the condition through ___isTruthy___ (Python's
	assert tests TRUTHINESS, and an inlined ifFalse: statically needs a Boolean
	receiver), then
	  (test) ___isTruthy___ ifFalse: [AssertionError perform: #'___signalNew___:kw:'
	                                     env: 1 withArguments: { {}. nil }]
	or, with a message,
	  ... ifFalse: [AssertionError perform: #'___signal___:' env: 1
	                  withArguments: {msg}].
	The perform:env: indirections are text-syntax spellings of env-1
	#___signalNew___:kw: and #___signal___: sends; the IR sends them directly."

	| condV |
	condV := aBuilder
		send: #'___isTruthy___' to: (test ___emitIRValueOn___: aBuilder) with: { }.
	"THE TEST, not the statement: CPython's span for a failed assert covers the
	 condition alone -- the ``assert'' keyword and the message are outside it --
	 which is the opposite of a ``raise'', whose span IS the whole statement.
	 tests/python/raise_spans.py asserts both directions.  Set again below,
	 after the message has been emitted."
	aBuilder atNode: test.
	aBuilder unless: condV then: [
		| errCls msgV |
		errCls := aBuilder globalNamed: #AssertionError.
		"The message is evaluated BEFORE the stamp is set, not inline in the
		 send's argument list.  Emitting it inline works, but its own emit
		 stamps the builder, and the signal send then inherits the MESSAGE's
		 position -- so a failed assert underlined ``'must be positive''' where
		 CPython underlines ``x > 0''.  The stamp has to be the last thing
		 before the send it labels."
		msgV := msg ifNotNil: [:m | m ___emitIRValueOn___: aBuilder].
		aBuilder atNode: test.
		"A bare assert raises as ``raise AssertionError()'' does -- see
		 printSmalltalkOn:."
		msgV isNil
			ifTrue: [aBuilder add: (aBuilder
				send: #'___signalNew___:kw:' to: errCls
				with: { aBuilder arrayOf: #(). aBuilder nilLit } env: 1)]
			ifFalse: [aBuilder add: (aBuilder
				send: #'___signal___:' to: errCls with: { msgV } env: 1)]].
	^ self

]

{ #category : 'Grail-IR Codegen' }
AssertAst >> ___irEligibleStatementLocals___: localNames [
	"``assert test'' / ``assert test, msg'' with emittable test (and msg)."

	(test ___irEligibleValueLocals___: localNames) ifFalse: [^ false].
	^ msg isNil or: [msg ___irEligibleValueLocals___: localNames]

]

{ #category : 'Grail-IR Codegen' }
AssertAst >> ___irReadLocalNamesInto___: aSet locals: localSet [
	test ___irReadLocalNamesInto___: aSet locals: localSet.
	msg ifNotNil: [:m | m ___irReadLocalNamesInto___: aSet locals: localSet].
	^ self

]

{ #category : 'Grail-other' }
AssertAst >> msg [
	^msg

]

{ #category : 'Grail-other' }
AssertAst >> msg: newValue [
	msg := newValue

]

{ #category : 'Grail-other' }
AssertAst >> printSmalltalkOn: aStream [
	"``assert x'' / ``assert x, msg''.

	The condition goes through ___isTruthy___, exactly as IfAst does, for
	two reasons.  Python's assert tests TRUTHINESS, not identity with True
	-- ``assert []'' must fail and ``assert [1]'' must pass -- whereas a
	bare ``ifFalse:'' on a non-Boolean was a runtime doesNotUnderstand.

	And ``ifFalse:'' with a literal-block argument is INLINED by the
	GemStone compiler, which then statically requires a Boolean receiver.
	A constant condition is provably not one, so ``assert 0'' /
	``assert 1'' -- CPython's idiom for an unreachable branch, as in
	datetimetester's ``assert 0, 'impossible' '' -- did not merely
	misbehave at runtime: the whole enclosing METHOD failed to compile,
	and every test in it reported ``Grail could not compile this method''
	(test_utc_offset_out_of_bounds)."
	"DROPPED ENTIRELY AT optimize >= 1.  ``python -O'' removes assert
	statements, and compile(..., optimize=1) is the same request made one
	compile at a time -- test_compile runs the same source at -1, 0, 1 and 2
	and distinguishes the levels by whether the assert fired.

	Nothing is emitted, not a guarded no-op: the statement's own expression
	must not be evaluated either, which is the point of removing it."
	self ___grailOptimizeLevel___ >= 1 ifTrue: [^ self].

	"A BARE assert raises the way ``raise AssertionError()'' does, through
	___signalNew___:kw: in env 1.  It used to send the kernel's env-0 class-side
	#signal, which skips Grail's raise path, and the traceback of the exception
	that produced held only the frame that CAUGHT it: ``outer() -> inner():
	assert 0'' reported <module> alone (until some other AssertionError had been
	raised the Python way in the session).  pytest's failure report for a plain
	``assert'' showed none of the test's own frames."
	test printSmalltalkWithParenthesisOn: aStream.
	msg ifNil: [
		aStream nextPutAll: ' ___isTruthy___ ifFalse: [AssertionError perform: #''___signalNew___:kw:'' env: 1 withArguments: { { }. nil }].'.
	] ifNotNil: [
		aStream nextPutAll: ' ___isTruthy___ ifFalse: [AssertionError perform: #''___signal___:'' env: 1 withArguments: {'.
		msg printSmalltalkOn: aStream.
		aStream nextPutAll: '}].'.
	].

]

{ #category : 'Grail-other' }
AssertAst >> test [
	^test

]

{ #category : 'Grail-other' }
AssertAst >> test: newValue [
	test := newValue

]
