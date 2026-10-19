Class {
	#name : 'WarningTestCase',
	#superclass : 'PythonTestCase',
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Tests-Warning' }
WarningTestCase >> test_creation [
	"Test creating a Warning instance."
	
	| exc |
	exc := Warning ___new___:  Warning .
	self assert: exc notNil.

]

{ #category : 'Grail-Tests-Warning' }
WarningTestCase >> test_inheritance [
	"Test that Warning inherits from Exception."
	
	| exc |
	exc := Warning ___new___:  Warning .
	self assert: (exc isKindOf: Exception).

]
