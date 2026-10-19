Class {
	#name : 'ArithmeticErrorTestCase',
	#superclass : 'PythonTestCase',
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Tests-ArithmeticError' }
ArithmeticErrorTestCase >> test_creation [
	"Test creating a ArithmeticError instance."
	
	| exc |
	exc := ArithmeticError ___new___: ArithmeticError.
	self assert: exc notNil.

]

{ #category : 'Grail-Tests-ArithmeticError' }
ArithmeticErrorTestCase >> test_inheritance [
	"Test that ArithmeticError inherits from Exception."
	
	| exc |
	exc := ArithmeticError ___new___: ArithmeticError.
	self assert: (exc isKindOf: Exception).

]
