Class {
	#name : 'SystemErrorTestCase',
	#superclass : 'PythonTestCase',
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Tests-SystemError' }
SystemErrorTestCase >> test_creation [
	"Test creating a SystemError instance."
	
	| exc |
	exc := SystemError ___new___:  SystemError .
	self assert: exc notNil.

]

{ #category : 'Grail-Tests-SystemError' }
SystemErrorTestCase >> test_inheritance [
	"Test that SystemError inherits from Exception."
	
	| exc |
	exc := SystemError ___new___:  SystemError .
	self assert: (exc isKindOf: Exception).

]
