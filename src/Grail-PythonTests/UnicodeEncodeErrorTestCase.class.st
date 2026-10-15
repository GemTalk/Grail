Class {
	#name : 'UnicodeEncodeErrorTestCase',
	#superclass : 'PythonTestCase',
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Tests-UnicodeEncodeError' }
UnicodeEncodeErrorTestCase >> test_creation [
	"Test creating a UnicodeEncodeError instance."
	
	| exc |
	exc := UnicodeEncodeError ___new___:  UnicodeEncodeError .
	self assert: exc notNil.

]

{ #category : 'Grail-Tests-UnicodeEncodeError' }
UnicodeEncodeErrorTestCase >> test_inheritance [
	"Test that UnicodeEncodeError inherits from UnicodeError."
	
	| exc |
	exc := UnicodeEncodeError ___new___:  UnicodeEncodeError .
	self assert: (exc isKindOf: UnicodeError).

]
