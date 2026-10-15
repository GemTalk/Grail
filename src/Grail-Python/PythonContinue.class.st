"Internal signal used to implement Python `continue`.

ForAst wraps the per-iteration body in
`[...] @env0:on: PythonContinue do: [:ex | nil]`
so signaling PythonContinue jumps to the next iteration, mirroring
CPython semantics.  WhileAst should use the same convention."
Class {
	#name : 'PythonContinue',
	#superclass : 'Exception',
	#category : 'Exceptions'
}

{ #category : 'Signalling' }
PythonContinue class >> ___signal___ [
	"Opt out of the VM's raise-time stack capture -- see PythonReturn class >>
	___signal___ for why (a loop signals this on every break/continue, and a
	captured stack would be pure cost)."
	| ex |
	ex := self new.
	ex @env0:_gsStack: #().
	^ ex signal

]
