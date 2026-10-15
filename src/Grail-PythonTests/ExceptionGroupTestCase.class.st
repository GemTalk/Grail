Class {
	#name : 'ExceptionGroupTestCase',
	#superclass : 'PythonTestCase',
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Tests-ExceptionGroup' }
ExceptionGroupTestCase >> test_creation [
	"Test creating a ExceptionGroup instance."
	
	| exc |
	"A group needs CPython's two arguments -- a message and a non-empty
	sequence of exceptions, here holding a ValueError.  The
	one-argument ``ExceptionGroup ___new___: ExceptionGroup'' this used is the
	TypeError CPython raises (``takes exactly 2 arguments'')."
	exc := ExceptionGroup ___new___: 'eg' _: (Array with: (ValueError ___new___: 'x')).
	self assert: exc notNil.

]

{ #category : 'Grail-Tests-ExceptionGroup' }
ExceptionGroupTestCase >> test_inheritance [
	"Test that ExceptionGroup inherits from BaseExceptionGroup."
	
	| exc |
	"A group needs CPython's two arguments -- a message and a non-empty
	sequence of exceptions, here holding a ValueError.  The
	one-argument ``ExceptionGroup ___new___: ExceptionGroup'' this used is the
	TypeError CPython raises (``takes exactly 2 arguments'')."
	exc := ExceptionGroup ___new___: 'eg' _: (Array with: (ValueError ___new___: 'x')).
	self assert: (exc isKindOf: BaseExceptionGroup).

]

{ #category : 'Grail-Tests' }
ExceptionGroupTestCase >> testGroupMessageAndExceptionsAreValueAttributes [
	"PEP 654: both are VALUE attributes, so a read must answer the value and
	not a BoundMethod wrapping the accessor.  ``exceptions'' is a TUPLE even
	though a group is nearly always built from a list literal, because
	CPython's is and callers index and len() it."

	self assert: (self eval: 'ExceptionGroup("A", [ValueError("B")]).message')
		equals: 'A'.
	self assert: (self eval: 'eg = ExceptionGroup("A", [ValueError("B"), TypeError("C")])
[len(eg.exceptions), type(eg.exceptions).__name__,
 str(eg.exceptions[0]), str(eg.exceptions[1])]') asArray
		equals: #( 2 'tuple' 'B' 'C' )

]

{ #category : 'Grail-Tests' }
ExceptionGroupTestCase >> testGroupStrIsMessagePlusCount [
	"``str(eg)'' is CPython's ``A (2 sub-exceptions)'', NOT the args tuple.
	BaseExceptionGroup had no methods at all -- its declared ``message'' /
	``exceptions'' instVars were never written -- so the inherited
	BaseException>>__str__ saw two args and fell back to args.__repr__,
	rendering ``('A', [ValueError('B')])''.  That string is also what
	traceback.format_exception_only emitted, since it is built on str()."

	self assert: (self eval: 'str(ExceptionGroup("A", [ValueError("B"), TypeError("C")]))')
		equals: 'A (2 sub-exceptions)'.
	"Singular for exactly one, as CPython."
	self assert: (self eval: 'str(ExceptionGroup("A", [ValueError("B")]))')
		equals: 'A (1 sub-exception)'.
	self assert: (self eval: 'str(BaseExceptionGroup("A", [BaseException("B")]))')
		equals: 'A (1 sub-exception)'

]
