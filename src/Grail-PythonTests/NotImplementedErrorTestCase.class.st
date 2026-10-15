Class {
	#name : 'NotImplementedErrorTestCase',
	#superclass : 'PythonTestCase',
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Tests-NotImplementedError' }
NotImplementedErrorTestCase >> test_creation [
	"Test creating a NotImplementedError instance."
	
	| exc |
	exc := NotImplementedError ___new___:  NotImplementedError .
	self assert: exc notNil.

]

{ #category : 'Grail-Tests-NotImplementedError' }
NotImplementedErrorTestCase >> test_inheritance [
	"Test that NotImplementedError inherits from RuntimeError."

	| exc |
	exc := NotImplementedError ___new___:  NotImplementedError .
	self assert: (exc isKindOf: RuntimeError).

]
