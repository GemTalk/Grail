Class {
	#name : 'ModuleNotFoundErrorTestCase',
	#superclass : 'PythonTestCase',
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Tests-ModuleNotFoundError' }
ModuleNotFoundErrorTestCase >> test_creation [
	"Test creating a ModuleNotFoundError instance."
	
	| exc |
	exc := ModuleNotFoundError ___new___:  ModuleNotFoundError .
	self assert: exc notNil.

]

{ #category : 'Grail-Tests-ModuleNotFoundError' }
ModuleNotFoundErrorTestCase >> test_inheritance [
	"Test that ModuleNotFoundError inherits from ImportError."
	
	| exc |
	exc := ModuleNotFoundError ___new___:  ModuleNotFoundError .
	self assert: (exc isKindOf: ImportError).

]
