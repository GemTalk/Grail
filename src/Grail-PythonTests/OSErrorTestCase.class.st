Class {
	#name : 'OSErrorTestCase',
	#superclass : 'PythonTestCase',
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Tests-OSError' }
OSErrorTestCase >> test_creation [
	"Test creating a OSError instance."
	
	| exc |
	exc := OSError ___new___:  OSError .
	self assert: exc notNil.

]

{ #category : 'Grail-Tests-OSError' }
OSErrorTestCase >> test_inheritance [
	"Test that OSError inherits from Exception."
	
	| exc |
	exc := OSError ___new___:  OSError .
	self assert: (exc isKindOf: Exception).

]
