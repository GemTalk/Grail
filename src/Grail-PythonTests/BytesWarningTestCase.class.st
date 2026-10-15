Class {
	#name : 'BytesWarningTestCase',
	#superclass : 'PythonTestCase',
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Tests-BytesWarning' }
BytesWarningTestCase >> test_creation [
	"Test creating a BytesWarning instance."
	
	| exc |
	exc := BytesWarning ___new___:  BytesWarning .
	self assert: exc notNil.

]

{ #category : 'Grail-Tests-BytesWarning' }
BytesWarningTestCase >> test_inheritance [
	"Test that BytesWarning inherits from Warning."
	
	| exc |
	exc := BytesWarning ___new___:  BytesWarning .
	self assert: (exc isKindOf: Warning).

]
