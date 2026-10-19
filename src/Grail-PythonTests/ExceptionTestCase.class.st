Class {
	#name : 'ExceptionTestCase',
	#superclass : 'PythonTestCase',
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Tests-Exception' }
ExceptionTestCase >> test_creation [
	"Test creating a Exception instance."
	
	| exc |
	exc := Exception ___new___:  Exception .
	self assert: exc notNil.

]

{ #category : 'Grail-Tests-Exception' }
ExceptionTestCase >> test_inheritance [
	"Test that Exception inherits from BaseException."
	
	| exc |
	exc := Exception ___new___:  Exception .
	self assert: (exc isKindOf: BaseException).

]
