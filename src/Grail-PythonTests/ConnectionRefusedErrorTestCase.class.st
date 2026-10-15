Class {
	#name : 'ConnectionRefusedErrorTestCase',
	#superclass : 'PythonTestCase',
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Tests-ConnectionRefusedError' }
ConnectionRefusedErrorTestCase >> test_creation [
	"Test creating a ConnectionRefusedError instance."
	
	| exc |
	exc := ConnectionRefusedError ___new___:  ConnectionRefusedError .
	self assert: exc notNil.

]

{ #category : 'Grail-Tests-ConnectionRefusedError' }
ConnectionRefusedErrorTestCase >> test_inheritance [
	"Test that ConnectionRefusedError inherits from ConnectionError."
	
	| exc |
	exc := ConnectionRefusedError ___new___:  ConnectionRefusedError .
	self assert: (exc isKindOf: ConnectionError).

]
