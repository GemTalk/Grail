Class {
	#name : 'TimeoutErrorTestCase',
	#superclass : 'PythonTestCase',
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Tests-TimeoutError' }
TimeoutErrorTestCase >> test_creation [
	"Test creating a TimeoutError instance."
	
	| exc |
	exc := TimeoutError ___new___:  TimeoutError .
	self assert: exc notNil.

]

{ #category : 'Grail-Tests-TimeoutError' }
TimeoutErrorTestCase >> test_inheritance [
	"Test that TimeoutError inherits from OSError."
	
	| exc |
	exc := TimeoutError ___new___:  TimeoutError .
	self assert: (exc isKindOf: OSError).

]
