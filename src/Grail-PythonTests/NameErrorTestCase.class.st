Class {
	#name : 'NameErrorTestCase',
	#superclass : 'PythonTestCase',
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Tests-NameError' }
NameErrorTestCase >> test_creation [
	"Test creating a NameError instance."
	
	| exc |
	exc := NameError ___new___:  NameError .
	self assert: exc notNil.

]

{ #category : 'Grail-Tests-NameError' }
NameErrorTestCase >> test_inheritance [
	"Test that NameError inherits from Exception."
	
	| exc |
	exc := NameError ___new___:  NameError .
	self assert: (exc isKindOf: Exception).

]
