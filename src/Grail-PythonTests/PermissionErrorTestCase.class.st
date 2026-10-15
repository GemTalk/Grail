Class {
	#name : 'PermissionErrorTestCase',
	#superclass : 'PythonTestCase',
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Tests-PermissionError' }
PermissionErrorTestCase >> test_creation [
	"Test creating a PermissionError instance."
	
	| exc |
	exc := PermissionError ___new___:  PermissionError .
	self assert: exc notNil.

]

{ #category : 'Grail-Tests-PermissionError' }
PermissionErrorTestCase >> test_inheritance [
	"Test that PermissionError inherits from OSError."
	
	| exc |
	exc := PermissionError ___new___:  PermissionError .
	self assert: (exc isKindOf: OSError).

]
