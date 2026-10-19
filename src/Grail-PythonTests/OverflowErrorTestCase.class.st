Class {
	#name : 'OverflowErrorTestCase',
	#superclass : 'PythonTestCase',
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Tests-OverflowError' }
OverflowErrorTestCase >> test_creation [
	"Test creating a OverflowError instance."
	
	| exc |
	exc := OverflowError ___new___:  OverflowError .
	self assert: exc notNil.

]

{ #category : 'Grail-Tests-OverflowError' }
OverflowErrorTestCase >> test_inheritance [
	"Test that OverflowError inherits from ArithmeticError."
	
	| exc |
	exc := OverflowError ___new___:  OverflowError .
	self assert: (exc isKindOf: ArithmeticError).

]
