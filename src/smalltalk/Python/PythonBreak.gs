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
	"Opt out of the VM's raise-time stack capture -- see PythonReturn class >>
	___signal___ for why (a loop signals this on every break/continue, and a
	captured stack would be pure cost)."
	| ex |
	ex := self new.
	ex @env0:_gsStack: #().
	^ ex signal
%

set compile_env: 0
