"What calling an ``async def`` containing ``yield`` answers -- Python's async
generator.

IS a PythonGenerator: ""do not run the body at the call, run it when driven"" is
the contract the generator machinery already implements.  What this adds is the
async protocol (__aiter__ / __anext__ / asend / athrow / aclose) and the
disambiguation between a ``yield`` (which ends the current __anext__) and an
``await`` (which suspends past it, out to the event loop).  See PyAsyncYield and
PyAsyncGenASend.

"
Class {
	#name : 'PythonAsyncGenerator',
	#superclass : 'PythonGenerator',
	#instVars : [
		'asendOwner'
	],
	#category : 'Grail-Modules'
}

{ #category : 'Grail-Python Attribute Hook' }
PythonAsyncGenerator class >> ___pythonValueAttrs___ [
	"The async-generator spellings, on top of the inherited generator ones --
	same reasoning as the coroutine override: each of these is a VALUE, and an
	unlisted accessor reaches Python as an always-truthy BoundMethod."

	^ super ___pythonValueAttrs___
		add: #'ag_running';
		add: #'ag_suspended';
		add: #'ag_await';
		add: #'ag_code';
		add: #'ag_frame';
		yourself

]
