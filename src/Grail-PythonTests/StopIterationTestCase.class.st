Class {
	#name : 'StopIterationTestCase',
	#superclass : 'PythonTestCase',
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Tests-StopIteration' }
StopIterationTestCase >> test_creation [
	"Test creating a StopIteration instance."
	
	| exc |
	exc := StopIteration ___new___:  StopIteration .
	self assert: exc notNil.

]

{ #category : 'Grail-Tests-StopIteration' }
StopIterationTestCase >> test_inheritance [
	"Test that StopIteration inherits from Exception."
	
	| exc |
	exc := StopIteration ___new___:  StopIteration .
	self assert: (exc isKindOf: Exception).

]
