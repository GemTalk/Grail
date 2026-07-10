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

	((CallAst returnEmitMode @env0:== #direct)
		or: [CallAst returnEmitMode @env0:== #directMethod])
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
