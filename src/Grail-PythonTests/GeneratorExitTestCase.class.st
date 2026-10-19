Class {
	#name : 'GeneratorExitTestCase',
	#superclass : 'PythonTestCase',
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Tests-GeneratorExit' }
GeneratorExitTestCase >> test_creation [
	"Test creating a GeneratorExit instance."
	
	| exc |
	exc := GeneratorExit ___new___:  GeneratorExit .
	self assert: exc notNil.

]

{ #category : 'Grail-Tests-GeneratorExit' }
GeneratorExitTestCase >> test_inheritance [
	"Test that GeneratorExit inherits from BaseException."
	
	| exc |
	exc := GeneratorExit ___new___:  GeneratorExit .
	self assert: (exc isKindOf: BaseException).

]
