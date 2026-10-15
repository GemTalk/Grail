Class {
	#name : 'MemoryErrorTestCase',
	#superclass : 'PythonTestCase',
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Tests-MemoryError' }
MemoryErrorTestCase >> test_creation [
	"Test creating a MemoryError instance."
	
	| exc |
	exc := MemoryError ___new___:  MemoryError .
	self assert: exc notNil.

]

{ #category : 'Grail-Tests-MemoryError' }
MemoryErrorTestCase >> test_inheritance [
	"Test that MemoryError inherits from Exception."
	
	| exc |
	exc := MemoryError ___new___:  MemoryError .
	self assert: (exc isKindOf: Exception).

]
