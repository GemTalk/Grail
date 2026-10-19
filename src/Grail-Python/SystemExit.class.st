"Request to exit from the interpreter.

This exception is raised by the sys.exit() function.  It inherits from
BaseException instead of Exception so that it is not accidentally caught
by code that catches Exception -- which is the whole point of the class:
``except Exception' must not swallow an exit request.

``code' is the exit status, and it is DERIVED from args rather than stored.
CPython's SystemExit.__init__ sets it from the constructor arguments -- none
means None, one means that argument, more than one means the whole tuple -- so
every construction path already carries the answer in args and a single reader
keeps them agreeing.  A declared ``code' instVar did NOT: it was never
assigned by anything, so every path would have had to remember to set it, and
none did.  See ``code' below, and StopIteration >> value, which derives
``value' from args for the same reason.

"
Class {
	#name : 'SystemExit',
	#superclass : 'BaseException',
	#category : 'Grail-Exceptions'
}

{ #category : 'Grail-Python Attribute Hook' }
SystemExit class >> ___pythonValueAttrs___ [
	"``e.code'' is the exit STATUS, not a callable, so ___pyAttrLoad___ must
	perform the accessor rather than wrap it as a BoundMethod -- otherwise
	``e.code'' answers ``<BoundMethod object ...>'', which is truthy, so
	``if e.code:'' takes the failure branch on a successful exit and every
	comparison against a status silently disagrees instead of erroring.

	Extends the inherited set (args / __traceback__ / the chaining trio) rather
	than replacing it; BaseException builds a fresh IdentitySet per call, so
	adding to the answer is safe."

	^ super ___pythonValueAttrs___
		add: #'code';
		yourself

]
