Class {
	#name : 'NotADirectoryErrorTestCase',
	#superclass : 'PythonTestCase',
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Tests-NotADirectoryError' }
NotADirectoryErrorTestCase >> test_creation [
	"Test creating a NotADirectoryError instance."
	
	| exc |
	exc := NotADirectoryError ___new___:  NotADirectoryError .
	self assert: exc notNil.

]

{ #category : 'Grail-Tests-NotADirectoryError' }
NotADirectoryErrorTestCase >> test_inheritance [
	"Test that NotADirectoryError inherits from OSError."
	
	| exc |
	exc := NotADirectoryError ___new___:  NotADirectoryError .
	self assert: (exc isKindOf: OSError).

]
