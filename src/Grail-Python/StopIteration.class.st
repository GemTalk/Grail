"Python StopIteration exception.

Carries the iterator's return value as the ``value' attribute (PEP 380).
It is DERIVED from args rather than stored: every construction path already
routes through ___args___:, so a single reader keeps ``StopIteration(v).value'
and ``raise StopIteration(v)' agreeing without each path remembering to set a
slot.  An explicit ``e.value = x' store lands in dynamic-instVar storage,
which ___pyAttrLoad___ probes BEFORE methods, so the assignment shadows the
derivation with no setter needed.

"
Class {
	#name : 'StopIteration',
	#superclass : 'Exception',
	#category : 'Grail-Exceptions'
}

{ #category : 'Grail-Python Attribute Hook' }
StopIteration class >> ___pythonValueAttrs___ [
	"``e.value'' is the returned VALUE, not a callable, so ___pyAttrLoad___ must
	perform the accessor instead of wrapping it as a BoundMethod -- without this
	``e.value'' answered ``<BoundMethod object ...>'' and every comparison
	against it silently failed rather than erroring.

	Extends the inherited set (args / __traceback__ / the chaining trio) rather
	than replacing it; BaseException builds a fresh IdentitySet per call, so
	adding to the answer is safe."

	^ super ___pythonValueAttrs___
		add: #'value';
		yourself

]
