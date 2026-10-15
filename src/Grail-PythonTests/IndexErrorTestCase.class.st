Class {
	#name : 'IndexErrorTestCase',
	#superclass : 'PythonTestCase',
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Tests-IndexError' }
IndexErrorTestCase >> test_creation [
	"Test creating a IndexError instance."
	
	| exc |
	exc := IndexError ___new___:  IndexError .
	self assert: exc notNil.

]

{ #category : 'Grail-Tests-IndexError' }
IndexErrorTestCase >> test_inheritance [
	"Test that IndexError inherits from LookupError."
	
	| exc |
	exc := IndexError ___new___:  IndexError .
	self assert: (exc isKindOf: LookupError).

]
