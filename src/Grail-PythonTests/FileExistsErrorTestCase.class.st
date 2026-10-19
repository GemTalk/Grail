Class {
	#name : 'FileExistsErrorTestCase',
	#superclass : 'PythonTestCase',
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Tests-FileExistsError' }
FileExistsErrorTestCase >> test_creation [
	"Test creating a FileExistsError instance."
	
	| exc |
	exc := FileExistsError ___new___:  FileExistsError .
	self assert: exc notNil.

]

{ #category : 'Grail-Tests-FileExistsError' }
FileExistsErrorTestCase >> test_inheritance [
	"Test that FileExistsError inherits from OSError."
	
	| exc |
	exc := FileExistsError ___new___:  FileExistsError .
	self assert: (exc isKindOf: OSError).

]
