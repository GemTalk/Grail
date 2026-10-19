Class {
	#name : 'KeyErrorTestCase',
	#superclass : 'PythonTestCase',
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Tests-KeyError' }
KeyErrorTestCase >> test_creation [
	"Test creating a KeyError instance."
	
	| exc |
	exc := KeyError ___new___:  KeyError .
	self assert: exc notNil.

]

{ #category : 'Grail-Tests-KeyError' }
KeyErrorTestCase >> test_inheritance [
	"Test that KeyError inherits from LookupError."
	
	| exc |
	exc := KeyError ___new___:  KeyError .
	self assert: (exc isKindOf: LookupError).

]
