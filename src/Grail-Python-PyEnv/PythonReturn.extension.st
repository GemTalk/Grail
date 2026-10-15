Extension { #name : 'PythonReturn' }

{ #category : 'Grail-Signalling' }
PythonReturn class >> ___signal___: aValue [
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

]

{ #category : 'Grail-Accessing' }
PythonReturn >> returnValue [
	^ returnValue

]
