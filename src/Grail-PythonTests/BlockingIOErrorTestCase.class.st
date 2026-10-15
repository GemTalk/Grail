Class {
	#name : 'BlockingIOErrorTestCase',
	#superclass : 'PythonTestCase',
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Tests-BlockingIOError' }
BlockingIOErrorTestCase >> test_creation [
	"Test creating a BlockingIOError instance."
	
	| exc |
	exc := BlockingIOError ___new___:  BlockingIOError .
	self assert: exc notNil.

]

{ #category : 'Grail-Tests-BlockingIOError' }
BlockingIOErrorTestCase >> test_inheritance [
	"Test that BlockingIOError inherits from OSError."
	
	| exc |
	exc := BlockingIOError ___new___:  BlockingIOError .
	self assert: (exc isKindOf: OSError).

]
