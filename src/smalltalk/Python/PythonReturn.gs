! ------------------- Superclass check
run
Exception ifNil: [self error: 'Exception is not defined. Check file ordering.'].
%

! ------- PythonReturn - internal signal for Python function return
expectvalue /Class
doit
Exception subclass: 'PythonReturn'
  instVarNames: #( returnValue )
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()
%

expectvalue /Class
doit
PythonReturn comment:
'Internal signal used to implement Python return statements.

When a Python function body is compiled as a Smalltalk closure stored in a
SymbolDictionary, the Smalltalk ^ (non-local return) cannot escape to the
correct home context. Instead, ReturnAst generates:
    PythonReturn ___signal___: value
and FunctionDefAst wraps the body in:
    [...] on: PythonReturn do: [:ex | ex returnValue]

Instance variables:
  returnValue - the value being returned
'
%

expectvalue /Class
doit
PythonReturn category: 'Exceptions'
%

! ------------------- Remove existing behavior from PythonReturn
removeallmethods PythonReturn
removeallclassmethods PythonReturn

set compile_env: 0

category: 'Accessing'
method: PythonReturn
returnValue
	^ returnValue
%

category: 'Accessing'
method: PythonReturn
returnValue: aValue
	returnValue := aValue
%

set compile_env: 1

category: 'Accessing'
method: PythonReturn
returnValue
	^ returnValue
%

category: 'Signalling'
classmethod: PythonReturn
___signal___: aValue
	| ex |
	ex := self @env0:new.
	ex @env0:returnValue: aValue.
	ex @env0:signal.
%

set compile_env: 0
