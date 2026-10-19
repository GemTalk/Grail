Class {
	#name : 'BufferErrorTestCase',
	#superclass : 'PythonTestCase',
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Tests-BufferError' }
BufferErrorTestCase >> test_creation [
	"Test creating a BufferError instance."
	
	| exc |
	exc := BufferError ___new___:  BufferError .
	self assert: exc notNil.

]

{ #category : 'Grail-Tests-BufferError' }
BufferErrorTestCase >> test_inheritance [
	"Test that BufferError inherits from Exception."
	
	| exc |
	exc := BufferError ___new___:  BufferError .
	self assert: (exc isKindOf: Exception).

]
