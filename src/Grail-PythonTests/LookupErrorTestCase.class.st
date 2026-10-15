Class {
	#name : 'LookupErrorTestCase',
	#superclass : 'PythonTestCase',
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Tests-LookupError' }
LookupErrorTestCase >> test_creation [
	"Test creating a LookupError instance."
	
	| exc |
	exc := LookupError ___new___:  LookupError .
	self assert: exc notNil.

]

{ #category : 'Grail-Tests-LookupError' }
LookupErrorTestCase >> test_inheritance [
	"Test that LookupError inherits from Exception."
	
	| exc |
	exc := LookupError ___new___:  LookupError .
	self assert: (exc isKindOf: Exception).

]
