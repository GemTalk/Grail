Class {
	#name : 'ResourceWarningTestCase',
	#superclass : 'PythonTestCase',
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Tests-ResourceWarning' }
ResourceWarningTestCase >> test_creation [
	"Test creating a ResourceWarning instance."
	
	| exc |
	exc := ResourceWarning ___new___:  ResourceWarning .
	self assert: exc notNil.

]

{ #category : 'Grail-Tests-ResourceWarning' }
ResourceWarningTestCase >> test_inheritance [
	"Test that ResourceWarning inherits from Warning."
	
	| exc |
	exc := ResourceWarning ___new___:  ResourceWarning .
	self assert: (exc isKindOf: Warning).

]
