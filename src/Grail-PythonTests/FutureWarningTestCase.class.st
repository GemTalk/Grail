Class {
	#name : 'FutureWarningTestCase',
	#superclass : 'PythonTestCase',
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Tests-FutureWarning' }
FutureWarningTestCase >> test_creation [
	"Test creating a FutureWarning instance."
	
	| exc |
	exc := FutureWarning ___new___:  FutureWarning .
	self assert: exc notNil.

]

{ #category : 'Grail-Tests-FutureWarning' }
FutureWarningTestCase >> test_inheritance [
	"Test that FutureWarning inherits from Warning."
	
	| exc |
	exc := FutureWarning ___new___:  FutureWarning .
	self assert: (exc isKindOf: Warning).

]
