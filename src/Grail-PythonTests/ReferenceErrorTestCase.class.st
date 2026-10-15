Class {
	#name : 'ReferenceErrorTestCase',
	#superclass : 'PythonTestCase',
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Tests-ReferenceError' }
ReferenceErrorTestCase >> test_creation [
	"Test creating a ReferenceError instance."
	
	| exc |
	exc := ReferenceError ___new___:  ReferenceError .
	self assert: exc notNil.

]

{ #category : 'Grail-Tests-ReferenceError' }
ReferenceErrorTestCase >> test_inheritance [
	"Test that ReferenceError inherits from Exception."
	
	| exc |
	exc := ReferenceError ___new___:  ReferenceError .
	self assert: (exc isKindOf: Exception).

]
