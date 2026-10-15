Class {
	#name : 'UnicodeTranslateErrorTestCase',
	#superclass : 'PythonTestCase',
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Tests-UnicodeTranslateError' }
UnicodeTranslateErrorTestCase >> test_creation [
	"Test creating a UnicodeTranslateError instance."
	
	| exc |
	exc := UnicodeTranslateError ___new___:  UnicodeTranslateError .
	self assert: exc notNil.

]

{ #category : 'Grail-Tests-UnicodeTranslateError' }
UnicodeTranslateErrorTestCase >> test_inheritance [
	"Test that UnicodeTranslateError inherits from UnicodeError."
	
	| exc |
	exc := UnicodeTranslateError ___new___:  UnicodeTranslateError .
	self assert: (exc isKindOf: UnicodeError).

]
