Class {
	#name : 'ValueErrorTestCase',
	#superclass : 'PythonTestCase',
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Tests-ValueError' }
ValueErrorTestCase >> test_creation [
	"Test creating a ValueError instance."
	
	| exc |
	exc := ValueError ___new___:  ValueError .
	self assert: exc notNil.

]

{ #category : 'Grail-Tests-ValueError' }
ValueErrorTestCase >> test_inheritance [
	"Test that ValueError inherits from Exception."
	
	| exc |
	exc := ValueError ___new___:  ValueError .
	self assert: (exc isKindOf: Exception).

]
