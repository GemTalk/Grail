Class {
	#name : 'ImportErrorTestCase',
	#superclass : 'PythonTestCase',
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Tests-ImportError' }
ImportErrorTestCase >> test_creation [
	"Test creating a ImportError instance."
	
	| exc |
	exc := ImportError ___new___:  ImportError .
	self assert: exc notNil.

]

{ #category : 'Grail-Tests-ImportError' }
ImportErrorTestCase >> test_inheritance [
	"Test that ImportError inherits from Exception."
	
	| exc |
	exc := ImportError ___new___:  ImportError .
	self assert: (exc isKindOf: Exception).

]
