Class {
	#name : 'RuntimeErrorTestCase',
	#superclass : 'PythonTestCase',
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Tests-RuntimeError' }
RuntimeErrorTestCase >> test_creation [
	"Test creating a RuntimeError instance."
	
	| exc |
	exc := RuntimeError ___new___:  RuntimeError .
	self assert: exc notNil.

]

{ #category : 'Grail-Tests-RuntimeError' }
RuntimeErrorTestCase >> test_inheritance [
	"Test that RuntimeError inherits from Exception."
	
	| exc |
	exc := RuntimeError ___new___:  RuntimeError .
	self assert: (exc isKindOf: Exception).

]
