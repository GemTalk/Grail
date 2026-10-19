Class {
	#name : 'FileNotFoundErrorTestCase',
	#superclass : 'PythonTestCase',
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Tests-FileNotFoundError' }
FileNotFoundErrorTestCase >> test_creation [
	"Test creating a FileNotFoundError instance."
	
	| exc |
	exc := FileNotFoundError ___new___:  FileNotFoundError .
	self assert: exc notNil.

]

{ #category : 'Grail-Tests-FileNotFoundError' }
FileNotFoundErrorTestCase >> test_inheritance [
	"Test that FileNotFoundError inherits from OSError."
	
	| exc |
	exc := FileNotFoundError ___new___:  FileNotFoundError .
	self assert: (exc isKindOf: OSError).

]
