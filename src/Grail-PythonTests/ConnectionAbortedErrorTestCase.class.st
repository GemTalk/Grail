Class {
	#name : 'ConnectionAbortedErrorTestCase',
	#superclass : 'PythonTestCase',
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Tests-ConnectionAbortedError' }
ConnectionAbortedErrorTestCase >> test_creation [
	"Test creating a ConnectionAbortedError instance."
	
	| exc |
	exc := ConnectionAbortedError ___new___:  ConnectionAbortedError .
	self assert: exc notNil.

]

{ #category : 'Grail-Tests-ConnectionAbortedError' }
ConnectionAbortedErrorTestCase >> test_inheritance [
	"Test that ConnectionAbortedError inherits from ConnectionError."
	
	| exc |
	exc := ConnectionAbortedError ___new___:  ConnectionAbortedError .
	self assert: (exc isKindOf: ConnectionError).

]
