Class {
	#name : 'BrokenPipeErrorTestCase',
	#superclass : 'PythonTestCase',
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Tests-BrokenPipeError' }
BrokenPipeErrorTestCase >> test_creation [
	"Test creating a BrokenPipeError instance."
	
	| exc |
	exc := BrokenPipeError ___new___:  BrokenPipeError .
	self assert: exc notNil.

]

{ #category : 'Grail-Tests-BrokenPipeError' }
BrokenPipeErrorTestCase >> test_inheritance [
	"Test that BrokenPipeError inherits from ConnectionError."
	
	| exc |
	exc := BrokenPipeError ___new___:  BrokenPipeError .
	self assert: (exc isKindOf: ConnectionError).

]
