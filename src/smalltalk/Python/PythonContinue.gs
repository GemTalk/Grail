! ------------------- Superclass check
run
Exception ifNil: [self error: 'Exception is not defined. Check file ordering.'].
%

! ------- PythonContinue - internal signal for Python `continue` statement
expectvalue /Class
doit
Exception subclass: 'PythonContinue'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()
%

expectvalue /Class
doit
PythonContinue comment:
'Internal signal used to implement Python `continue`.

ForAst wraps the per-iteration body in
`[...] @env0:on: PythonContinue do: [:ex | nil]`
so signaling PythonContinue jumps to the next iteration, mirroring
CPython semantics.  WhileAst should use the same convention.'
%

expectvalue /Class
doit
PythonContinue category: 'Exceptions'
%

removeallmethods PythonContinue
removeallclassmethods PythonContinue

set compile_env: 0

category: 'Signalling'
classmethod: PythonContinue
___signal___
	^ self new signal
%

set compile_env: 0
