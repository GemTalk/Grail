Class {
	#name : 'ConnectionResetErrorTestCase',
	#superclass : 'PythonTestCase',
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Tests-ConnectionResetError' }
ConnectionResetErrorTestCase >> test_creation [
	"Test creating a ConnectionResetError instance."
	
	| exc |
	exc := ConnectionResetError ___new___:  ConnectionResetError .
	self assert: exc notNil.

]

{ #category : 'Grail-Tests-ConnectionResetError' }
ConnectionResetErrorTestCase >> test_inheritance [
	"Test that ConnectionResetError inherits from ConnectionError."
	
	| exc |
	exc := ConnectionResetError ___new___:  ConnectionResetError .
	self assert: (exc isKindOf: ConnectionError).

]
