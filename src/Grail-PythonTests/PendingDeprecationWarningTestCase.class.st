Class {
	#name : 'PendingDeprecationWarningTestCase',
	#superclass : 'PythonTestCase',
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Tests-PendingDeprecationWarning' }
PendingDeprecationWarningTestCase >> test_creation [
	"Test creating a PendingDeprecationWarning instance."
	
	| exc |
	exc := PendingDeprecationWarning ___new___:  PendingDeprecationWarning .
	self assert: exc notNil.

]

{ #category : 'Grail-Tests-PendingDeprecationWarning' }
PendingDeprecationWarningTestCase >> test_inheritance [
	"Test that PendingDeprecationWarning inherits from Warning."
	
	| exc |
	exc := PendingDeprecationWarning ___new___:  PendingDeprecationWarning .
	self assert: (exc isKindOf: Warning).

]
