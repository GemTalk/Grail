Class {
	#name : 'DeprecationWarningTestCase',
	#superclass : 'PythonTestCase',
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Tests-DeprecationWarning' }
DeprecationWarningTestCase >> test_creation [
	"Test creating a DeprecationWarning instance."
	
	| exc |
	exc := DeprecationWarning ___new___:  DeprecationWarning .
	self assert: exc notNil.

]

{ #category : 'Grail-Tests-DeprecationWarning' }
DeprecationWarningTestCase >> test_inheritance [
	"Test that DeprecationWarning inherits from Warning."
	
	| exc |
	exc := DeprecationWarning ___new___:  DeprecationWarning .
	self assert: (exc isKindOf: Warning).

]
