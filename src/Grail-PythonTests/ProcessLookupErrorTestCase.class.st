Class {
	#name : 'ProcessLookupErrorTestCase',
	#superclass : 'PythonTestCase',
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Tests-ProcessLookupError' }
ProcessLookupErrorTestCase >> test_creation [
	"Test creating a ProcessLookupError instance."
	
	| exc |
	exc := ProcessLookupError ___new___:  ProcessLookupError .
	self assert: exc notNil.

]

{ #category : 'Grail-Tests-ProcessLookupError' }
ProcessLookupErrorTestCase >> test_inheritance [
	"Test that ProcessLookupError inherits from OSError."
	
	| exc |
	exc := ProcessLookupError ___new___:  ProcessLookupError .
	self assert: (exc isKindOf: OSError).

]
