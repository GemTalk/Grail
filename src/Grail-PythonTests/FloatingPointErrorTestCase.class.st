Class {
	#name : 'FloatingPointErrorTestCase',
	#superclass : 'PythonTestCase',
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Tests-FloatingPointError' }
FloatingPointErrorTestCase >> test_creation [
	"Test creating a FloatingPointError instance."
	
	| exc |
	exc := FloatingPointError ___new___:  FloatingPointError .
	self assert: exc notNil.

]

{ #category : 'Grail-Tests-FloatingPointError' }
FloatingPointErrorTestCase >> test_inheritance [
	"Test that FloatingPointError inherits from Exception."
	
	| exc |
	exc := FloatingPointError ___new___:  FloatingPointError .
	self assert: (exc isKindOf: Exception).

]
