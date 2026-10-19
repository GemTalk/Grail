Class {
	#name : 'UnicodeWarningTestCase',
	#superclass : 'PythonTestCase',
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Tests-UnicodeWarning' }
UnicodeWarningTestCase >> test_creation [
	"Test creating a UnicodeWarning instance."
	
	| exc |
	exc := UnicodeWarning ___new___:  UnicodeWarning .
	self assert: exc notNil.

]

{ #category : 'Grail-Tests-UnicodeWarning' }
UnicodeWarningTestCase >> test_inheritance [
	"Test that UnicodeWarning inherits from Warning."
	
	| exc |
	exc := UnicodeWarning ___new___:  UnicodeWarning .
	self assert: (exc isKindOf: Warning).

]
