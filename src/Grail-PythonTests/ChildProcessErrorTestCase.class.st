Class {
	#name : 'ChildProcessErrorTestCase',
	#superclass : 'PythonTestCase',
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Tests-ChildProcessError' }
ChildProcessErrorTestCase >> test_creation [
	"Test creating a ChildProcessError instance."
	
	| exc |
	exc := ChildProcessError ___new___:  ChildProcessError .
	self assert: exc notNil.

]

{ #category : 'Grail-Tests-ChildProcessError' }
ChildProcessErrorTestCase >> test_inheritance [
	"Test that ChildProcessError inherits from OSError."
	
	| exc |
	exc := ChildProcessError ___new___:  ChildProcessError .
	self assert: (exc isKindOf: OSError).

]
