Class {
	#name : 'ConnectionErrorTestCase',
	#superclass : 'PythonTestCase',
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Tests-ConnectionError' }
ConnectionErrorTestCase >> test_creation [
	"Test creating a ConnectionError instance."
	
	| exc |
	exc := ConnectionError ___new___:  ConnectionError .
	self assert: exc notNil.

]

{ #category : 'Grail-Tests-ConnectionError' }
ConnectionErrorTestCase >> test_inheritance [
	"Test that ConnectionError inherits from OSError."
	
	| exc |
	exc := ConnectionError ___new___:  ConnectionError .
	self assert: (exc isKindOf: OSError).

]
