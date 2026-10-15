Class {
	#name : 'IndentationErrorTestCase',
	#superclass : 'PythonTestCase',
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Tests-IndentationError' }
IndentationErrorTestCase >> test_creation [
	"Test creating a IndentationError instance."
	
	| exc |
	exc := IndentationError ___new___:  IndentationError .
	self assert: exc notNil.

]

{ #category : 'Grail-Tests-IndentationError' }
IndentationErrorTestCase >> test_inheritance [
	"Test that IndentationError inherits from SyntaxError."
	
	| exc |
	exc := IndentationError ___new___:  IndentationError .
	self assert: (exc isKindOf: SyntaxError).

]
