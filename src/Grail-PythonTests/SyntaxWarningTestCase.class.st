Class {
	#name : 'SyntaxWarningTestCase',
	#superclass : 'PythonTestCase',
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Tests-SyntaxWarning' }
SyntaxWarningTestCase >> test_creation [
	"Test creating a SyntaxWarning instance."
	
	| exc |
	exc := SyntaxWarning ___new___:  SyntaxWarning .
	self assert: exc notNil.

]

{ #category : 'Grail-Tests-SyntaxWarning' }
SyntaxWarningTestCase >> test_inheritance [
	"Test that SyntaxWarning inherits from Warning."
	
	| exc |
	exc := SyntaxWarning ___new___:  SyntaxWarning .
	self assert: (exc isKindOf: Warning).

]
