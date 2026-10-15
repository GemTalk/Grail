Class {
	#name : 'EncodingWarningTestCase',
	#superclass : 'PythonTestCase',
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Tests-EncodingWarning' }
EncodingWarningTestCase >> test_creation [
	"Test creating a EncodingWarning instance."
	
	| exc |
	exc := EncodingWarning ___new___:  EncodingWarning .
	self assert: exc notNil.

]

{ #category : 'Grail-Tests-EncodingWarning' }
EncodingWarningTestCase >> test_inheritance [
	"Test that EncodingWarning inherits from Warning."
	
	| exc |
	exc := EncodingWarning ___new___:  EncodingWarning .
	self assert: (exc isKindOf: Warning).

]
