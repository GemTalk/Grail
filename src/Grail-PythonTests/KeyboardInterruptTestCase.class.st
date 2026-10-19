Class {
	#name : 'KeyboardInterruptTestCase',
	#superclass : 'PythonTestCase',
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Tests-KeyboardInterrupt' }
KeyboardInterruptTestCase >> test_creation [
	"Test creating a KeyboardInterrupt instance."
	
	| exc |
	exc := KeyboardInterrupt ___new___:  KeyboardInterrupt .
	self assert: exc notNil.

]

{ #category : 'Grail-Tests-KeyboardInterrupt' }
KeyboardInterruptTestCase >> test_inheritance [
	"Test that KeyboardInterrupt inherits from BaseException."
	
	| exc |
	exc := KeyboardInterrupt ___new___:  KeyboardInterrupt .
	self assert: (exc isKindOf: BaseException).

]
