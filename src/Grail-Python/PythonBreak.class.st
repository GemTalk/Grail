"Internal signal used to implement Python `break`.

ForAst wraps the loop body in `[...] @env0:on: PythonBreak do: [:ex | nil]`
so signaling PythonBreak exits the innermost loop, mirroring CPython
semantics. WhileAst should use the same convention."
Class {
	#name : 'PythonBreak',
	#superclass : 'Exception',
	#category : 'Exceptions'
}

{ #category : 'Signalling' }
PythonBreak class >> ___signal___ [
	"Opt out of the VM's raise-time stack capture -- see PythonReturn class >>
	___signal___ for why (a loop signals this on every break/continue, and a
	captured stack would be pure cost)."
	| ex |
	ex := self new.
	ex @env0:_gsStack: #().
	^ ex signal

]
