Class {
	#name : 'ImportWarningTestCase',
	#superclass : 'PythonTestCase',
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Tests-ImportWarning' }
ImportWarningTestCase >> test_creation [
	"Test creating a ImportWarning instance."
	
	| exc |
	exc := ImportWarning ___new___:  ImportWarning .
	self assert: exc notNil.

]

{ #category : 'Grail-Tests-ImportWarning' }
ImportWarningTestCase >> test_inheritance [
	"Test that ImportWarning inherits from Warning."
	
	| exc |
	exc := ImportWarning ___new___:  ImportWarning .
	self assert: (exc isKindOf: Warning).

]
