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
	"Opt out of the VM's raise-time stack capture -- see PythonReturn class >>
	___signal___ for why (a loop signals this on every break/continue, and a
	captured stack would be pure cost)."
	| ex |
	ex := self new.
	ex @env0:_gsStack: #().
	^ ex signal
%

set compile_env: 0
