Class {
	#name : 'IsADirectoryErrorTestCase',
	#superclass : 'PythonTestCase',
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Tests-IsADirectoryError' }
IsADirectoryErrorTestCase >> test_creation [
	"Test creating a IsADirectoryError instance."
	
	| exc |
	exc := IsADirectoryError ___new___:  IsADirectoryError .
	self assert: exc notNil.

]

{ #category : 'Grail-Tests-IsADirectoryError' }
IsADirectoryErrorTestCase >> test_inheritance [
	"Test that IsADirectoryError inherits from OSError."
	
	| exc |
	exc := IsADirectoryError ___new___:  IsADirectoryError .
	self assert: (exc isKindOf: OSError).

]
