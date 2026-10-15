"A group of unrelated exceptions.

Introduced in Python 3.11 to support exception groups.

Instance variables:
  message - description of the exception group
  exceptions - sequence of exceptions in the group

"
Class {
	#name : 'BaseExceptionGroup',
	#superclass : 'BaseException',
	#instVars : [
		'message',
		'exceptions'
	],
	#category : 'Grail-Exceptions'
}

{ #category : 'Grail-Python Attribute Hook' }
BaseExceptionGroup class >> ___pythonValueAttrs___ [
	"``eg.message'' / ``eg.exceptions'' are VALUE attributes in CPython, not
	callables, so a read must invoke the accessor rather than answer a
	BoundMethod wrapping the selector -- ``len(eg.exceptions)'' and
	``eg.message'' are how both the tests and traceback's group rendering
	consume them.  Extends BaseException's set (args, __notes__,
	__traceback__, the chaining trio); see the discussion there."

	^ super ___pythonValueAttrs___
		add: #'message';
		add: #'exceptions';
		yourself

]
