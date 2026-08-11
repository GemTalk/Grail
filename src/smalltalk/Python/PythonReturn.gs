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
PythonReturn category: 'Grail-Exceptions'
%

! ------------------- Remove existing behavior from PythonReturn
removeallmethods PythonReturn
removeallclassmethods PythonReturn

set compile_env: 0

category: 'Grail-Accessing'
method: PythonReturn
returnValue
	^ returnValue
%

category: 'Grail-Accessing'
method: PythonReturn
returnValue: aValue
	returnValue := aValue
%

set compile_env: 1

category: 'Grail-Accessing'
method: PythonReturn
returnValue
	^ returnValue
%

category: 'Grail-Signalling'
classmethod: PythonReturn
___signal___: aValue
	| ex |
	ex := self @env0:new.
	ex @env0:returnValue: aValue.
	"Opt out of the VM's raise-time stack capture.  With
	#GemExceptionSignalCapturesStack on (BaseException class >>
	___ensureStackCapture___, for multi-frame tracebacks), primitive 2022 fills
	_gsStack whenever it is nil on entry -- and an #exception-mode function
	signals PythonReturn on EVERY return, where a stack is never wanted.
	Pre-stamping an empty Array suppresses the capture: measured 350 -> 150 ns
	at stack depth 50, 1150 -> 200 ns at depth 600 (§9.2)."
	ex @env0:_gsStack: #().
	ex @env0:signal.
%

set compile_env: 0
