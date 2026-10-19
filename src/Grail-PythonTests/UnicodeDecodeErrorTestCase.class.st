Class {
	#name : 'UnicodeDecodeErrorTestCase',
	#superclass : 'PythonTestCase',
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Tests-UnicodeDecodeError' }
UnicodeDecodeErrorTestCase >> test_creation [
	"Test creating a UnicodeDecodeError instance."
	
	| exc |
	exc := UnicodeDecodeError ___new___:  UnicodeDecodeError .
	self assert: exc notNil.

]

{ #category : 'Grail-Tests-UnicodeDecodeError' }
UnicodeDecodeErrorTestCase >> test_inheritance [
	"Test that UnicodeDecodeError inherits from UnicodeError."
	
	| exc |
	exc := UnicodeDecodeError ___new___:  UnicodeDecodeError .
	self assert: (exc isKindOf: UnicodeError).

]
