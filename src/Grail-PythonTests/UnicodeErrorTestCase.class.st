Class {
	#name : 'UnicodeErrorTestCase',
	#superclass : 'PythonTestCase',
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Tests-UnicodeError' }
UnicodeErrorTestCase >> test_creation [
	"Test creating a UnicodeError instance."
	
	| exc |
	exc := UnicodeError ___new___:  UnicodeError .
	self assert: exc notNil.

]

{ #category : 'Grail-Tests-UnicodeError' }
UnicodeErrorTestCase >> test_inheritance [
	"Test that UnicodeError inherits from ValueError."
	
	| exc |
	exc := UnicodeError ___new___:  UnicodeError .
	self assert: (exc isKindOf: ValueError).

]
