Class {
	#name : 'StopAsyncIterationTestCase',
	#superclass : 'PythonTestCase',
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Tests-StopAsyncIteration' }
StopAsyncIterationTestCase >> test_creation [
	"Test creating a StopAsyncIteration instance."
	
	| exc |
	exc := StopAsyncIteration ___new___:  StopAsyncIteration .
	self assert: exc notNil.

]

{ #category : 'Grail-Tests-StopAsyncIteration' }
StopAsyncIterationTestCase >> test_inheritance [
	"Test that StopAsyncIteration inherits from Exception."
	
	| exc |
	exc := StopAsyncIteration ___new___:  StopAsyncIteration .
	self assert: (exc isKindOf: Exception).

]
