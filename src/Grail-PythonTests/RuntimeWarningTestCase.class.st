Class {
	#name : 'RuntimeWarningTestCase',
	#superclass : 'PythonTestCase',
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Tests-RuntimeWarning' }
RuntimeWarningTestCase >> test_creation [
	"Test creating a RuntimeWarning instance."
	
	| exc |
	exc := RuntimeWarning ___new___:  RuntimeWarning .
	self assert: exc notNil.

]

{ #category : 'Grail-Tests-RuntimeWarning' }
RuntimeWarningTestCase >> test_inheritance [
	"Test that RuntimeWarning inherits from Warning."
	
	| exc |
	exc := RuntimeWarning ___new___:  RuntimeWarning .
	self assert: (exc isKindOf: Warning).

]
