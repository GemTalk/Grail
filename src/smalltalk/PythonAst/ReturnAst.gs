! ------------------- Superclass check
run
StatementAst ifNil: [self error: 'StatementAst is not defined. Check file ordering.'].
%

! ------------------- Class definition for ReturnAst
expectvalue /Class
doit
StatementAst subclass: 'ReturnAst'
  instVarNames: #( value)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonAst
  options: #()

%

expectvalue /Class
doit
ReturnAst comment:
'https://docs.python.org/3/library/ast.html#ast.Return

A return statement.

value is what is returned (can be None).

Example:
>>> print(ast.dump(ast.parse(''return x''), indent=4))
Module(
    body=[
        Return(value=Name(id=''x'', ctx=Load()))])

Hierarchy:
Object
  AbstractNode(parent)
    AbstractLocationNode(beginLine beginColumn endLine endColumn)
      StatementAst
        ReturnAst(value)
'
%

expectvalue /Class
doit
ReturnAst category: 'Grail-Parser'
%

! ------------------- Remove existing behavior from ReturnAst
removeallmethods ReturnAst
removeallclassmethods ReturnAst

set compile_env: 0

category: 'Grail-other'
method: ReturnAst
printSmalltalkOn: aStream
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
%

category: 'Grail-testing'
method: ReturnAst
isUnconditionalReturn
	^ true
%

category: 'Grail-IR Codegen'
method: ReturnAst
___irEligibleStatementLocals___: localNames
	^ value isNil or: [value ___irEligibleValueLocals___: localNames]
%

category: 'Grail-IR Codegen'
method: ReturnAst
___emitIRStatementOn___: aBuilder
	"Python ``return value'' -> ^ value ; bare ``return'' -> ^ None -- the
	direct-return (#directMethod) shape, since IR needs no return blocking for
	try/finally or with (returnFromHome unwinds through ensure blocks).

	INSIDE A WRAPPED BODY (a generator's / coroutine's ``[:___gen___ | ...]''
	block -- aBuilder genLeaf is set, cut 53) a home return is impossible: the
	method answered the wrapper long before the body runs, on another process.
	So it is the text's #exception mode instead, ``PythonReturn ___signal___:
	value'' (env 1), caught by the wrapper's ``on: PythonReturn do: [:___ex___ |
	___ex___ returnValue]'' and handed to the runtime as the generator's return
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
%
method: ReturnAst
value
	^value
%
method: ReturnAst
value: newValue
	value := newValue
%

category: 'Grail-IR Codegen'
method: ReturnAst
___irReadLocalNamesInto___: aSet locals: localSet
	value ifNotNil: [value ___irReadLocalNamesInto___: aSet locals: localSet].
	^ self
%

category: 'Grail-IR Codegen'
method: ReturnAst
___irFlowBound___: boundIn locals: localSet
	^ self ___irFlowTerminates___: boundIn locals: localSet
%
