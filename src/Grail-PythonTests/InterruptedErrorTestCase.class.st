Class {
	#name : 'InterruptedErrorTestCase',
	#superclass : 'PythonTestCase',
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Tests-InterruptedError' }
InterruptedErrorTestCase >> test_creation [
	"Test creating a InterruptedError instance."
	
	| exc |
	exc := InterruptedError ___new___:  InterruptedError .
	self assert: exc notNil.

]

{ #category : 'Grail-Tests-InterruptedError' }
InterruptedErrorTestCase >> test_inheritance [
	"Test that InterruptedError inherits from OSError."
	
	| exc |
	exc := InterruptedError ___new___:  InterruptedError .
	self assert: (exc isKindOf: OSError).

]
