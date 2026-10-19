Class {
	#name : 'SyntaxErrorTestCase',
	#superclass : 'PythonTestCase',
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Tests-SyntaxError' }
SyntaxErrorTestCase >> test_creation [
	"Test creating a SyntaxError instance."
	
	| exc |
	exc := SyntaxError ___new___:  SyntaxError .
	self assert: exc notNil.

]

{ #category : 'Grail-Tests-SyntaxError' }
SyntaxErrorTestCase >> test_inheritance [
	"Test that SyntaxError inherits from Exception."
	
	| exc |
	exc := SyntaxError ___new___:  SyntaxError .
	self assert: (exc isKindOf: Exception).

]
