! ------------------- Superclass check
run
Exception ifNil: [self error: 'Exception is not defined. Check file ordering.'].
%

! ------- PythonBreak - internal signal for Python `break` statement
expectvalue /Class
doit
Exception subclass: 'PythonBreak'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()
%

expectvalue /Class
doit
PythonBreak comment:
'Internal signal used to implement Python `break`.

ForAst wraps the loop body in `[...] @env0:on: PythonBreak do: [:ex | nil]`
so signaling PythonBreak exits the innermost loop, mirroring CPython
semantics. WhileAst should use the same convention.'
%

expectvalue /Class
doit
PythonBreak category: 'Exceptions'
%

! ------------------- Remove existing behavior from PythonBreak
removeallmethods PythonBreak
removeallclassmethods PythonBreak

set compile_env: 0

category: 'Signalling'
classmethod: PythonBreak
___signal___
	^ self new signal
%

set compile_env: 0
