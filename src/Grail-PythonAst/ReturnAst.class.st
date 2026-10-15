"https://docs.python.org/3/library/ast.html#ast.Return

A return statement.

value is what is returned (can be None).

Example:
>>> print(ast.dump(ast.parse('return x'), indent=4))
Module(
    body=[
        Return(value=Name(id='x', ctx=Load()))])

Hierarchy:
Object
  AbstractNode(parent)
    AbstractLocationNode(beginLine beginColumn endLine endColumn)
      StatementAst
        ReturnAst(value)

"
Class {
	#name : 'ReturnAst',
	#superclass : 'StatementAst',
	#instVars : [
		'value'
	],
	#category : 'Grail-Parser'
}

{ #category : 'Grail-IR Codegen' }
ReturnAst >> ___emitIRStatementOn___: aBuilder [
	"Python ``return value'' -> ^ value ; bare ``return'' -> ^ None -- the
	direct-return (#directMethod) shape, since IR needs no return blocking for
	try/finally or with (returnFromHome unwinds through ensure blocks).

	INSIDE A WRAPPED BODY (a generator's / coroutine's ``[:___gen___ | ...]''
	block -- aBuilder genLeaf is set, cut 53) a home return is impossible: the
	method answered the wrapper long before the body runs, on another process.
	So it is the text's #exception mode instead, ``PythonReturn ___signal___:
	value'' (env 1), caught by the wrapper's ``on: PythonReturn do: [:___ex___ |
	___ex___ @env0:returnValue]'' and handed to the runtime as the generator's return
	value (StopIteration.value / the coroutine's result).  INSIDE A NESTED
	DEF'S closure block (aBuilder inNestedFunction, cut 64) the same: the block
	IS the Python function, so a home return would leave the enclosing method;
	the closure's own ``on: PythonReturn do:'' catches the signal."

	| v |
	v := value isNil
		ifTrue: [nil]
		ifFalse: [value ___emitIRValueOn___: aBuilder].
	aBuilder atNode: self.
	(aBuilder genLeaf notNil or: [aBuilder inNestedFunction]) ifTrue: [
		aBuilder add: (aBuilder
			send: #'___signal___:'
			to: (aBuilder globalNamed: #PythonReturn)
			with: { v ifNil: [aBuilder globalNamed: #None] }
			env: 1).
		^ self].
	v isNil
		ifTrue: [aBuilder add: aBuilder returnNone]
		ifFalse: [aBuilder add: (aBuilder return: v)].
	^ self

]

{ #category : 'Grail-IR Codegen' }
ReturnAst >> ___irEligibleStatementLocals___: localNames [
	^ value isNil or: [value ___irEligibleValueLocals___: localNames]

]

{ #category : 'Grail-IR Codegen' }
ReturnAst >> ___irFlowBound___: boundIn locals: localSet [
	^ self ___irFlowTerminates___: boundIn locals: localSet

]

{ #category : 'Grail-IR Codegen' }
ReturnAst >> ___irReadLocalNamesInto___: aSet locals: localSet [
	value ifNotNil: [value ___irReadLocalNamesInto___: aSet locals: localSet].
	^ self

]

{ #category : 'Grail-testing' }
ReturnAst >> isUnconditionalReturn [
	^ true

]

{ #category : 'Grail-other' }
ReturnAst >> printSmalltalkOn: aStream [
	"Emit Python ``return value''.  Two shapes depending on
	``CallAst returnEmitMode'':

	  #direct        — ``^ value.''.  Body is inside an outer
	                   ``^ [ ... ] value'' block; the ``^'' inside
	                   does a non-local return out of the enclosing
	                   real method (which IS the Python function).

	  #directMethod  — ``^ value.''.  Body sits directly at method
	                   scope (no outer block — used when no temps
	                   collide with instVars).  Same return target.

	  default        — ``PythonReturn ___signal___: value.''.  An
	                   outer on:PythonReturn-do: handler catches
	                   it; used for block-form bodies (nested def
	                   closures, generator coroutines) where the
	                   Smalltalk method on the stack is NOT the
	                   Python function the user wants to return
	                   from."

	((CallAst returnEmitMode == #direct)
		or: [CallAst returnEmitMode == #directMethod])
		ifTrue: [aStream nextPutAll: '^ ']
		ifFalse: [aStream nextPutAll: 'PythonReturn ___signal___: '].
	value ifNil: [
		aStream nextPutAll: 'None'.
	] ifNotNil: [
		value printSmalltalkWithParenthesisOn: aStream.
	].
	aStream nextPut: $.

]

{ #category : 'Grail-IR Codegen' }
ReturnAst >> value [
	^value

]

{ #category : 'Grail-IR Codegen' }
ReturnAst >> value: newValue [
	value := newValue

]
