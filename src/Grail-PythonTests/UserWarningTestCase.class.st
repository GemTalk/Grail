Class {
	#name : 'UserWarningTestCase',
	#superclass : 'PythonTestCase',
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Tests-UserWarning' }
UserWarningTestCase >> test_creation [
	"Test creating a UserWarning instance."
	
	| exc |
	exc := UserWarning ___new___:  UserWarning .
	self assert: exc notNil.

]

{ #category : 'Grail-Tests-UserWarning' }
UserWarningTestCase >> test_inheritance [
	"Test that UserWarning inherits from Warning."
	
	| exc |
	exc := UserWarning ___new___:  UserWarning .
	self assert: (exc isKindOf: Warning).

]
