! ------------------- Superclass check
run
StatementAst ifNil: [self error: 'StatementAst is not defined. Check file ordering.'].
%

! ------------------- Class definition for AssertAst
expectvalue /Class
doit
StatementAst subclass: 'AssertAst'
  instVarNames: #( test msg)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonAst
  options: #()

%

expectvalue /Class
doit
AssertAst comment:
'https://docs.python.org/3/library/ast.html#ast.Assert

An assertion.

test holds the condition, such as a Compare node.
msg holds the failure message (can be None).

Example:
>>> print(ast.dump(ast.parse(''assert x, "error"''), indent=4))
Module(
    body=[
        Assert(
            test=Name(id=''x'', ctx=Load()),
            msg=Constant(value=''error''))])

Hierarchy:
Object
  AbstractNode(parent)
    AbstractLocationNode(beginLine beginColumn endLine endColumn)
      StatementAst
        AssertAst(test msg)
'
%

expectvalue /Class
doit
AssertAst category: 'Grail-Parser'
%

! ------------------- Remove existing behavior from AssertAst
removeallmethods AssertAst
removeallclassmethods AssertAst

set compile_env: 0

category: 'Grail-other'
method: AssertAst
printSmalltalkOn: aStream
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

	test printSmalltalkWithParenthesisOn: aStream.
	msg ifNil: [
		aStream nextPutAll: ' ___isTruthy___ ifFalse: [AssertionError perform: #signal env: 0].'.
	] ifNotNil: [
		aStream nextPutAll: ' ___isTruthy___ ifFalse: [AssertionError perform: #''___signal___:'' env: 1 withArguments: {'.
		msg printSmalltalkOn: aStream.
		aStream nextPutAll: '}].'.
	].
%
method: AssertAst
test
	^test
%
method: AssertAst
test: newValue
	test := newValue
%
method: AssertAst
msg
	^msg
%
method: AssertAst
msg: newValue
	msg := newValue
%

category: 'Grail-IR Codegen'
method: AssertAst
___irEligibleStatementLocals___: localNames
	"``assert test'' / ``assert test, msg'' with emittable test (and msg)."

	(test ___irEligibleValueLocals___: localNames) ifFalse: [^ false].
	^ msg isNil or: [msg ___irEligibleValueLocals___: localNames]
%

category: 'Grail-IR Codegen'
method: AssertAst
___emitIRStatementOn___: aBuilder
	"printSmalltalkOn:'s shape: the condition through ___isTruthy___ (Python's
	assert tests TRUTHINESS, and an inlined ifFalse: statically needs a Boolean
	receiver), then
	  (test) ___isTruthy___ ifFalse: [AssertionError perform: #signal env: 0]
	or, with a message,
	  ... ifFalse: [AssertionError perform: #'___signal___:' env: 1
	                  withArguments: {msg}].
	The perform:env: indirections are text-syntax spellings of an env-0 #signal
	and an env-1 #___signal___: send; the IR sends them directly."

	| condV |
	condV := aBuilder
		send: #'___isTruthy___' to: (test ___emitIRValueOn___: aBuilder) with: { }.
	aBuilder at: self beginPosition.
	aBuilder unless: condV then: [
		| errCls |
		errCls := aBuilder globalNamed: #AssertionError.
		msg isNil
			ifTrue: [aBuilder add: (aBuilder send: #signal to: errCls with: { } env: 0)]
			ifFalse: [aBuilder add: (aBuilder
				send: #'___signal___:' to: errCls
				with: { msg ___emitIRValueOn___: aBuilder } env: 1)]].
	^ self
%

category: 'Grail-IR Codegen'
method: AssertAst
___irReadLocalNamesInto___: aSet locals: localSet
	test ___irReadLocalNamesInto___: aSet locals: localSet.
	msg ifNotNil: [:m | m ___irReadLocalNamesInto___: aSet locals: localSet].
	^ self
%
