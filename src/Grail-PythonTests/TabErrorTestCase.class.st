Class {
	#name : 'TabErrorTestCase',
	#superclass : 'PythonTestCase',
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Tests-TabError' }
TabErrorTestCase >> test_creation [
	"Test creating a TabError instance."
	
	| exc |
	exc := TabError ___new___:  TabError .
	self assert: exc notNil.

]

{ #category : 'Grail-Tests-TabError' }
TabErrorTestCase >> test_inheritance [
	"Test that TabError inherits from IndentationError."
	
	| exc |
	exc := TabError ___new___:  TabError .
	self assert: (exc isKindOf: IndentationError).

]
