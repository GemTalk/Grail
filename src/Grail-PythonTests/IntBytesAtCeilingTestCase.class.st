"
int.to_bytes and int.from_bytes on integers at GemStone's LargeInteger
ceiling (~130144 bits).  Both built 2**(8 * length) -- one bit past the value
-- to range-check or to apply two's complement, so a value AT the ceiling
died on the kernel's uncatchable NumericError (error 2503).
random.randbytes(16268) is getrandbits(130144).to_bytes(16268, 'little') and
ended the process (test_random).

Driven by tests/python/int_bytes_at_ceiling.py, whose EXPECTED table is
CPython 3.14's output.
"
Class {
	#name : 'IntBytesAtCeilingTestCase',
	#superclass : 'PythonTestCase',
	#instVars : [
		'testModule'
	],
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Private' }
IntBytesAtCeilingTestCase >> ___fixturePath___ [
	^ importlib grailDir , '/tests/python/int_bytes_at_ceiling.py'

]

{ #category : 'Grail-Private' }
IntBytesAtCeilingTestCase >> ___mismatchesIn___: aModule [
	^ (aModule @env1:___pyAttrLoad___: #mismatches)
		@env1:___pyCallValue___: #() kw: nil

]

{ #category : 'Grail-Setup' }
IntBytesAtCeilingTestCase >> setUp [
	(importlib @env1:modules) removeKey: #'int_bytes_at_ceiling' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: self ___fixturePath___
		name: 'int_bytes_at_ceiling'.

]

{ #category : 'Grail-Setup' }
IntBytesAtCeilingTestCase >> tearDown [
	(importlib @env1:modules) removeKey: #'int_bytes_at_ceiling' ifAbsent: [].
	testModule := nil

]

{ #category : 'Grail-Tests' }
IntBytesAtCeilingTestCase >> testEveryRowMatchesCPython [
	| expected bad |
	expected := testModule @env1:___pyAttrLoad___: #EXPECTED.
	self assert: (expected @env1:__len__) >= 24.
	bad := self ___mismatchesIn___: testModule.
	self
		assert: (bad @env1:__len__) = 0
		description: (builtins @env1:instance @env1:repr: bad) asString

]

{ #category : 'Grail-Tests' }
IntBytesAtCeilingTestCase >> testFromBytesPastTheCeilingIsACatchableOverflowError [
	"A deliberate divergence: CPython answers both, Grail cannot hold the
	result.  What is pinned is that Python code can CATCH it -- the kernel's
	NumericError ended the process."

	| answers |
	answers := (testModule @env1:___pyAttrLoad___: #grail_past_ceiling)
		@env1:___pyCallValue___: #() kw: nil.
	self
		assert: (builtins @env1:instance @env1:repr: answers) asString
		equals: '[''result exceeds Grail integer capacity'', ''result exceeds Grail integer capacity'']'

]
